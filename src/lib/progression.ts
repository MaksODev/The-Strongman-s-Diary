// MARK: - Движок прогрессии весов (порт ProgressionEngine.swift)
import type { DayExercise, SetLog, WorkoutPlan } from '../types'
import { cycle } from './periodization'

export const PROGRESSION_INCREMENT_KG = 2.5

/// Id упражнений дня, готовых к прогрессии: все подходы выполнены
/// и во всех — повторения верхней границы диапазона.
export function progressableExerciseIDs(logs: SetLog[], items: DayExercise[]): Set<string> {
  const result = new Set<string>()
  for (const item of items) {
    const itemLogs = logs.filter((l) => l.exerciseID === item.exerciseID && l.isCompleted)
    if (item.sets <= 0 || itemLogs.length !== item.sets) continue
    if (itemLogs.every((l) => l.actualReps >= item.repsMax)) {
      result.add(item.exerciseID)
    }
  }
  return result
}

/// Прибавка с учётом целевого веса: равномерный шаг к цели за оставшиеся
/// недели цикла (минимум 2,5 кг, без перелёта через цель). Без цели — +2,5 кг.
export function incrementKg(item: DayExercise, weeksRemaining: number): number {
  const standard = PROGRESSION_INCREMENT_KG
  if (item.targetWeightKg <= 0 || item.targetWeightKg <= item.baseWeightKg) return standard
  const needed = item.targetWeightKg - item.baseWeightKg
  const weekly = needed / Math.max(weeksRemaining, 1)
  const rounded = Math.round(weekly / standard) * standard
  return Math.max(standard, Math.min(rounded, needed))
}

/// Сколько недель цикла осталось до конца.
export function weeksRemainingIn(plan: WorkoutPlan): number {
  const weeks = cycle(plan.scheme, plan.customWeekTypes, plan.customWeekPercents).length
  if (weeks <= 0) return 1
  const current = plan.currentWeekIndex % weeks
  return Math.max(1, weeks - current)
}
