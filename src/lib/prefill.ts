// MARK: - Предзаполнение «как в прошлый раз» (порт PrefillResolver.swift)
import type { WorkoutSession } from '../types'

export interface LastSet {
  weight: number
  reps: number
}

function sessionDate(s: WorkoutSession): Date {
  return new Date(s.finishedAt ?? s.startedAt)
}

/// Последний выполненный подход по каждому упражнению.
export function lastKnownSets(sessions: WorkoutSession[]): Map<string, LastSet> {
  const ordered = sessions
    .filter((s) => s.isCompleted)
    .sort((a, b) => sessionDate(a).getTime() - sessionDate(b).getTime())
  const result = new Map<string, LastSet>()
  for (const s of ordered) {
    for (const log of s.setLogs) {
      if (log.isCompleted) {
        result.set(log.exerciseID, { weight: log.actualWeightKg, reps: log.actualReps })
      }
    }
  }
  return result
}
