// MARK: - Обратная связь по RPE (порт WorkoutViewModel.applyRPEFeedback)
// и переход недели цикла (advanceWeekIfFinished).
import type { DayExercise, WorkoutDay, WorkoutPlan, WorkoutSession } from '../types'
import { cycle, sessionsThisCycleWeek } from './periodization'

export interface RPEFeedback {
  messages: string[]
  suggestLightWeek: boolean
}

const roundToStep = (w: number) => Math.round(w / 2.5) * 2.5

function sessionDate(s: WorkoutSession): Date {
  return new Date(s.finishedAt ?? s.startedAt)
}

/// Правила влияния оценки сложности на программу:
/// - два подряд RPE ≥ 9 на одном дне → веса дня −10%;
/// - три подряд RPE ≤ 6 на одном дне → веса дня +2,5 кг;
/// - средний RPE ≥ 8,5 за текущую неделю (≥ 2 оценок) → предложить лёгкую неделю.
/// Принимает plan/day, мутирует массив упражнений дня, возвращает текстовую обратную связь.
export function applyRPEFeedback(
  rpe: number,
  plan: WorkoutPlan,
  day: WorkoutDay,
  sessions: WorkoutSession[],
  incrementKgFor: (item: DayExercise) => number,
): RPEFeedback {
  const feedback: RPEFeedback = { messages: [], suggestLightWeek: false }
  const dayName = day.name

  // Завершённые сессии этого дня с оценкой, от новых к старым
  const daySessions = sessions
    .filter((s) => s.dayName === dayName && s.isCompleted && s.rpe != null)
    .sort((a, b) => sessionDate(b).getTime() - sessionDate(a).getTime())

  if (rpe >= 9) {
    const secondHeavy = (daySessions[1]?.rpe ?? 0) >= 9
    const thirdHeavy = (daySessions[2]?.rpe ?? 0) >= 9
    if (secondHeavy && !thirdHeavy) {
      for (const item of day.exercises) {
        if (item.baseWeightKg > 0) item.baseWeightKg = Math.max(0, roundToStep(item.baseWeightKg * 0.9))
      }
      feedback.messages.push('Две тяжёлые тренировки подряд (RPE ≥ 9) — веса в этом дне снижены на 10%')
    }
  }

  if (rpe <= 6) {
    let easyStreak = 0
    for (const s of daySessions) {
      if ((s.rpe ?? 10) <= 6) easyStreak += 1
    }
    if (easyStreak === 3) {
      for (const item of day.exercises) {
        item.baseWeightKg += incrementKgFor(item)
      }
      feedback.messages.push('Три тренировки подряд ощущались лёгкими (RPE ≤ 6) — веса в этом дне увеличены на 2,5 кг')
    }
  }

  // Средний RPE текущей недели
  const weekSessions = sessionsThisCycleWeek(plan, sessions).filter((s) => s.rpe != null)
  if (weekSessions.length >= 2) {
    const average = weekSessions.reduce((sum, s) => sum + (s.rpe ?? 0), 0) / weekSessions.length
    if (average >= 8.5) {
      feedback.suggestLightWeek = true
      feedback.messages.push(`Неделя выдалась очень тяжёлой (средний RPE ${average.toFixed(1)}) — стоит сделать следующую лёгкой`)
    }
  }
  return feedback
}

/// Сдвиг недели цикла: когда каждый день недели отметился хотя бы одной
/// завершённой сессией — цикл переходит к следующей неделе.
/// Возвращает новый currentWeekIndex или null, если перехода не было.
export function advanceWeekIfFinished(plan: WorkoutPlan, sessions: WorkoutSession[]): number | null {
  const weeks = cycle(plan.scheme, plan.customWeekTypes, plan.customWeekPercents)
  if (weeks.length === 0 || plan.days.length === 0) return null
  const done = new Set(sessionsThisCycleWeek(plan, sessions).map((s) => s.dayName))
  if (plan.days.every((d) => done.has(d.name))) {
    return (plan.currentWeekIndex + 1) % weeks.length
  }
  return null
}

/// Подписи шкалы RPE 1–10 (порт RPESelectionView).
export function rpeLabel(value: number): string {
  switch (value) {
    case 1: return 'Очень легко'
    case 2: return 'Легко'
    case 3: return 'Скорее легко'
    case 4: return 'Нормально'
    case 5: return 'Средне'
    case 6: return 'Умеренно тяжело'
    case 7: return 'Сложно'
    case 8: return 'Тяжело'
    case 9: return 'Очень тяжело'
    case 10: return 'Предельно'
    default: return ''
  }
}
