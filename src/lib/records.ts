// MARK: - Детект личных рекордов (порт PersonalRecords.swift)
import type { WorkoutSession } from '../types'

export interface ExerciseRecords {
  maxWeight: number
  maxSetTonnage: number
  maxSetWeight: number
  maxSetReps: number
  maxExerciseTonnage: number
  hasBaseline: boolean
}

export type RecordKind = 'maxWeight' | 'bestSet' | 'exerciseTonnage' | 'sessionTonnage'

export interface RecordEvent {
  kind: RecordKind
  exerciseName: string | null
  oldValue: number
  newValue: number
  oldSetWeight: number | null
  oldSetReps: number | null
}

export function recordHeadline(e: RecordEvent): string {
  switch (e.kind) {
    case 'maxWeight': return 'Новый рекорд веса!'
    case 'bestSet': return 'Новый рекорд подхода!'
    case 'exerciseTonnage': return 'Рекордный объём в упражнении!'
    case 'sessionTonnage': return 'Рекордный объём тренировки!'
  }
}

export function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

export function recordDetail(e: RecordEvent): string {
  switch (e.kind) {
    case 'maxWeight':
      return `${e.exerciseName ?? ''}: прошлый максимум ${formatValue(e.oldValue)} кг`
    case 'bestSet':
      if (e.oldSetWeight != null) {
        return `${e.exerciseName ?? ''}: прошлый лучший подход ${formatValue(e.oldValue)} кг (${formatValue(e.oldSetWeight)}×${e.oldSetReps ?? 0})`
      }
      return `${e.exerciseName ?? ''}: прошлый лучший подход ${formatValue(e.oldValue)} кг`
    case 'exerciseTonnage':
      return `${e.exerciseName ?? ''}: прошлый объём ${formatValue(e.oldValue)} кг`
    case 'sessionTonnage':
      return `Прошлый рекорд: ${formatValue(e.oldValue)} кг`
  }
}

/// Книга рекордов: исторические максимумы + проверка новых подходов в реальном времени.
export class RecordsBook {
  byExercise = new Map<string, ExerciseRecords>()
  maxSessionTonnage = 0
  private sessionsBaseline = false
  private sessionRecordFired = false

  static fromSessions(sessions: WorkoutSession[]): RecordsBook {
    const book = new RecordsBook()
    const sessionTonnages: number[] = []
    for (const s of sessions.filter((x) => x.isCompleted)) {
      let sessionTonnage = 0
      const perExercise = new Map<string, number>()
      for (const log of s.setLogs) {
        if (!log.isCompleted) continue
        const setTonnage = log.actualWeightKg * log.actualReps
        sessionTonnage += setTonnage
        perExercise.set(log.exerciseID, (perExercise.get(log.exerciseID) ?? 0) + setTonnage)
        const rec = book.byExercise.get(log.exerciseID) ?? {
          maxWeight: 0, maxSetTonnage: 0, maxSetWeight: 0, maxSetReps: 0, maxExerciseTonnage: 0, hasBaseline: true,
        }
        rec.hasBaseline = true
        rec.maxWeight = Math.max(rec.maxWeight, log.actualWeightKg)
        if (setTonnage > rec.maxSetTonnage) {
          rec.maxSetTonnage = setTonnage
          rec.maxSetWeight = log.actualWeightKg
          rec.maxSetReps = log.actualReps
        }
        book.byExercise.set(log.exerciseID, rec)
      }
      for (const [exerciseID, tonnage] of perExercise) {
        const rec = book.byExercise.get(exerciseID)!
        rec.maxExerciseTonnage = Math.max(rec.maxExerciseTonnage, tonnage)
      }
      if (sessionTonnage > 0) sessionTonnages.push(sessionTonnage)
    }
    book.maxSessionTonnage = sessionTonnages.length > 0 ? Math.max(...sessionTonnages) : 0
    book.sessionsBaseline = sessionTonnages.length > 0
    return book
  }

  /// Проверяет только что выполненный подход на рекорды. Мутирует книгу,
  /// чтобы повторные срабатывания одного типа не дублировались.
  check(input: {
    exerciseID: string
    exerciseName: string
    weight: number
    reps: number
    exerciseTonnage: number
    exerciseFinished: boolean
    sessionTonnage: number
  }): RecordEvent[] {
    const events: RecordEvent[] = []
    const { exerciseID, exerciseName, weight, reps, exerciseTonnage, exerciseFinished, sessionTonnage } = input
    const rec = this.byExercise.get(exerciseID) ?? {
      maxWeight: 0, maxSetTonnage: 0, maxSetWeight: 0, maxSetReps: 0, maxExerciseTonnage: 0, hasBaseline: false,
    }
    const hadBaseline = rec.hasBaseline
    const setTonnage = weight * reps

    if (hadBaseline) {
      if (weight > 0 && weight > rec.maxWeight) {
        events.push({ kind: 'maxWeight', exerciseName, oldValue: rec.maxWeight, newValue: weight, oldSetWeight: null, oldSetReps: null })
        rec.maxWeight = weight
      }
      if (setTonnage > 0 && setTonnage > rec.maxSetTonnage) {
        events.push({
          kind: 'bestSet', exerciseName,
          oldValue: rec.maxSetTonnage, newValue: setTonnage,
          oldSetWeight: rec.maxSetWeight, oldSetReps: rec.maxSetReps,
        })
        rec.maxSetTonnage = setTonnage
        rec.maxSetWeight = weight
        rec.maxSetReps = reps
      }
      if (exerciseFinished && exerciseTonnage > 0 && exerciseTonnage > rec.maxExerciseTonnage) {
        events.push({ kind: 'exerciseTonnage', exerciseName, oldValue: rec.maxExerciseTonnage, newValue: exerciseTonnage, oldSetWeight: null, oldSetReps: null })
        rec.maxExerciseTonnage = exerciseTonnage
      }
    } else {
      // Первая выполненная работа с упражнением — база, не рекорд.
      rec.hasBaseline = true
      rec.maxWeight = Math.max(rec.maxWeight, weight)
      rec.maxSetTonnage = Math.max(rec.maxSetTonnage, setTonnage)
    }
    this.byExercise.set(exerciseID, rec)

    if (this.sessionsBaseline && !this.sessionRecordFired && sessionTonnage > 0 && sessionTonnage > this.maxSessionTonnage) {
      events.push({ kind: 'sessionTonnage', exerciseName: null, oldValue: this.maxSessionTonnage, newValue: sessionTonnage, oldSetWeight: null, oldSetReps: null })
      this.maxSessionTonnage = sessionTonnage
      this.sessionRecordFired = true
    }
    return events
  }
}
