// MARK: - Силовой индекс и перцентиль (DOTS) — порт StrengthIndexEngine.swift
import type { Sex, WorkoutSession } from '../types'
import { exerciseById } from './catalog'

export interface LiftScore {
  id: string
  title: string
  weight: number
  dots: number
}

export interface StrengthResult {
  index: number // 0–100
  percentile: number // 0–100
  lifts: LiftScore[]
  usedBaseLifts: boolean
}

const BASE_LIFTS: { id: string; title: string }[] = [
  { id: 'bench-press', title: 'Жим лёжа' },
  { id: 'back-squat', title: 'Приседания' },
  { id: 'deadlift', title: 'Становая тяга' },
]

export const ELITE_DOTS = 450

/// DOTS: сила, взвешенная на массу тела. Официальные коэффициенты для мужчин и женщин.
export function dots(total: number, bodyWeight: number, sex: Sex): number {
  const w = bodyWeight
  let a: number, b: number, c: number, d: number, e: number
  if (sex === 'male') {
    ;[a, b, c, d, e] = [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
  } else {
    ;[a, b, c, d, e] = [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706]
  }
  const denominator = a + b * w + c * w ** 2 + d * w ** 3 + e * w ** 4
  if (denominator <= 0) return 0
  return (total * 500) / denominator
}

/// Перцентиль из DOTS: логистическое распределение, медиана 250.
export function percentileFromDots(d: number): number {
  const median = 250
  const slope = 72
  const p = 1 / (1 + Math.exp(-(d - median) / slope))
  return Math.min(100, Math.max(0, p * 100))
}

export function evaluateStrength(sessions: WorkoutSession[], sex: Sex, bodyWeightKg: number): StrengthResult | null {
  const logs = sessions.filter((s) => s.isCompleted).flatMap((s) => s.setLogs).filter((l) => l.isCompleted)
  if (logs.length === 0 || bodyWeightKg <= 0) return null

  // Лучший вес по каждому базовому движению
  let scores: LiftScore[] = []
  for (const lift of BASE_LIFTS) {
    const best = logs.filter((l) => l.exerciseID === lift.id).reduce((m, l) => Math.max(m, l.actualWeightKg), 0)
    if (best > 0) {
      scores.push({ id: lift.id, title: lift.title, weight: best, dots: dots(best, bodyWeightKg, sex) })
    }
  }
  const usedBase = scores.length > 0

  // Фолбэк: нет базовых — три самых тяжёлых движения из логов
  if (scores.length === 0) {
    const bestByExercise = new Map<string, number>()
    for (const log of logs) {
      bestByExercise.set(log.exerciseID, Math.max(bestByExercise.get(log.exerciseID) ?? 0, log.actualWeightKg))
    }
    const top = [...bestByExercise.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    scores = top.map(([id, weight]) => ({
      id,
      title: exerciseById(id)?.name ?? id,
      weight,
      dots: dots(weight, bodyWeightKg, sex),
    }))
  }

  if (scores.length === 0) return null
  const averageDots = scores.reduce((sum, s) => sum + s.dots, 0) / scores.length
  const index = Math.min(100, (averageDots / ELITE_DOTS) * 100)
  return { index, percentile: percentileFromDots(averageDots), lifts: scores, usedBaseLifts: usedBase }
}
