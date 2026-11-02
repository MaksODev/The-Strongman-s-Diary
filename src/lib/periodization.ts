// MARK: - Движок периодизации (порт PeriodizationEngine.swift)
import type { PeriodizationScheme, WeekLoadType, WorkoutPlan } from '../types'

export interface WeekInfo {
  index: number
  type: WeekLoadType
  percent: number // 0.85 = 85% от рабочего веса
}

export function cycle(scheme: PeriodizationScheme, customTypes: WeekLoadType[] = [], customPercents: number[] = []): WeekInfo[] {
  let pairs: [WeekLoadType, number][]
  switch (scheme) {
    case 'heavyLight':
      pairs = [['heavy', 0.9], ['light', 0.65]]
      break
    case 'twoHeavyOneLight':
      pairs = [['heavy', 0.85], ['heavy', 0.925], ['light', 0.65]]
      break
    case 'threeUpDeload':
      pairs = [['rampUp', 0.7], ['rampUp', 0.8], ['heavy', 0.9], ['deload', 0.5]]
      break
    case 'linear':
      pairs = [['rampUp', 0.7], ['rampUp', 0.8], ['rampUp', 0.9], ['rampUp', 1.0]]
      break
    case 'custom':
      pairs = customTypes.map((t, i) => [t, (customPercents[i] ?? 100) / 100] as [WeekLoadType, number])
      break
  }
  return pairs.map(([type, percent], index) => ({ index, type, percent }))
}

export function currentWeek(plan: WorkoutPlan): WeekInfo | null {
  const weeks = cycle(plan.scheme, plan.customWeekTypes, plan.customWeekPercents)
  if (weeks.length === 0) return null
  return weeks[plan.currentWeekIndex % weeks.length]
}

/// Вес с учётом % недели, округление до 0,5 кг (шаг блинов).
export function adjustedWeight(base: number, percent: number): number {
  if (base <= 0) return 0
  return Math.round(base * percent * 2) / 2
}
