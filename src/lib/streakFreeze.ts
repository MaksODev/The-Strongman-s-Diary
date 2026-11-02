// MARK: - Страховка серии (streak freeze) — порт StreakFreeze.swift
import type { Profile, WorkoutSession } from '../types'
import { streakWeeks } from './gamification'

export const WEEKS_TO_EARN = 3

export interface StreakOutcome {
  effectiveStreak: number
  chargeWeeks: number // 0...WEEKS_TO_EARN
  freezeAvailable: boolean
  justEarned: boolean
  justSpent: boolean
  streakBurned: boolean
}

function sessionDate(s: WorkoutSession): Date {
  return new Date(s.finishedAt ?? s.startedAt)
}

function weekStartMs(d: Date): number {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x.getTime()
}

/// Оценивает состояние серии. Мутирует переданный профиль (как нативная версия).
export function evaluateStreak(profile: Profile, sessions: WorkoutSession[]): StreakOutcome {
  const outcome: StreakOutcome = {
    effectiveStreak: 0, chargeWeeks: 0, freezeAvailable: false,
    justEarned: false, justSpent: false, streakBurned: false,
  }
  const raw = streakWeeks(sessions)
  const weekStarts = new Set<number>()
  for (const s of sessions) {
    if (s.isCompleted) weekStarts.add(weekStartMs(sessionDate(s)))
  }

  if (raw > 0) {
    if (profile.freezeBurnedNotified) profile.freezeBurnedNotified = false
    if (profile.freezeProtectedBase > 0) {
      outcome.effectiveStreak = profile.freezeProtectedBase + raw
      profile.freezeProtectedBase = 0
    } else {
      outcome.effectiveStreak = raw
    }
    if (profile.freezeAvailable) {
      outcome.freezeAvailable = true
      outcome.chargeWeeks = WEEKS_TO_EARN
    } else {
      const charge = raw % WEEKS_TO_EARN
      if (charge === 0) {
        profile.freezeAvailable = true
        outcome.freezeAvailable = true
        outcome.chargeWeeks = WEEKS_TO_EARN
        outcome.justEarned = true
      } else {
        outcome.chargeWeeks = charge
      }
    }
    return outcome
  }

  // Серия прервана
  if (weekStarts.size === 0) return outcome
  const lastWeek = Math.max(...weekStarts)
  const thisWeekStart = weekStartMs(new Date())
  const gap = Math.round((thisWeekStart - lastWeek) / (7 * 86400_000))

  if (gap === 1 && profile.freezeAvailable && profile.freezeAutoSpend) {
    // Тратим страховку
    profile.freezeAvailable = false
    profile.freezeUsedCount += 1
    let base = 1
    let cursor = lastWeek
    while (weekStarts.has(cursor - 7 * 86400_000)) {
      base += 1
      cursor -= 7 * 86400_000
    }
    profile.freezeProtectedBase = base
    outcome.justSpent = true
    outcome.effectiveStreak = base
    outcome.chargeWeeks = 0
  } else if (gap === 1 && profile.freezeProtectedBase > 0) {
    outcome.effectiveStreak = profile.freezeProtectedBase
    outcome.chargeWeeks = 0
  } else {
    outcome.effectiveStreak = 0
    if (profile.freezeProtectedBase > 0) profile.freezeProtectedBase = 0
    if (gap > 1 && !profile.freezeBurnedNotified) {
      profile.freezeBurnedNotified = true
      outcome.streakBurned = true
    }
  }
  return outcome
}
