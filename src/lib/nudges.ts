// MARK: - Недельные карточки: недовыполнение плана (ConsistencyNudge)
// и перевыполнение (OverloadWatch) — порты одноимённых Swift-модулей.
import type { WorkoutSession } from '../types'

function sessionDate(s: WorkoutSession): Date {
  return new Date(s.finishedAt ?? s.startedAt)
}

function weekRange(offset: number): { start: number; end: number } {
  const now = new Date()
  const day = (now.getDay() + 6) % 7
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day + offset * 7)
  return { start: start.getTime(), end: start.getTime() + 7 * 86400_000 }
}

export function sessionsInWeek(sessions: WorkoutSession[], offset: number): WorkoutSession[] {
  const { start, end } = weekRange(offset)
  return sessions.filter((s) => {
    if (!s.isCompleted) return false
    const t = sessionDate(s).getTime()
    return t >= start && t < end
  })
}

export function completedThisWeek(sessions: WorkoutSession[]): number {
  return sessionsInWeek(sessions, 0).length
}

// «Скрыть до конца недели» — ключ в localStorage на неделю
export function isDismissedThisWeek(key: string): boolean {
  return localStorage.getItem(key) === String(weekRange(0).start)
}

export function dismissForThisWeek(key: string) {
  localStorage.setItem(key, String(weekRange(0).start))
}

export const NUDGE_DISMISS_KEY = 'fa.consistency.dismissed.week'
export const OVERLOAD_DISMISS_KEY = 'fa.overload.dismissed.week'

/// Прошлая полная неделя выполнена частично (но не нулём) → мягкая мотивация.
export function consistencyNudge(sessions: WorkoutSession[], plannedPerWeek: number): { completed: number; planned: number; factIndex: number } | null {
  if (plannedPerWeek <= 1) return null
  const lastWeek = sessionsInWeek(sessions, -1)
  const done = lastWeek.length
  if (done > 0 && done < plannedPerWeek) {
    return { completed: done, planned: plannedPerWeek, factIndex: done - 1 }
  }
  return null
}

/// Перевыполнение плана на +1 тренировку → предупреждение о перетренированности.
export function overloadStatus(completedThisWeekCount: number, plannedPerWeek: number): 'ok' | 'over' {
  if (plannedPerWeek <= 0 || completedThisWeekCount < plannedPerWeek + 1) return 'ok'
  return 'over'
}
