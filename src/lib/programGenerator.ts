// MARK: - Генератор стартовой программы (порт ProgramGenerator.swift)
import type { Exercise, DayExercise, MuscleGroup, Profile, TrainingExperience, TrainingGoal, WorkoutDay, WorkoutPlan } from '../types'
import { CATALOG } from './catalog'

interface DayTemplate {
  name: string
  muscles: MuscleGroup[]
}

function splitTemplate(daysPerWeek: number): DayTemplate[] {
  const ppl: DayTemplate[] = [
    { name: 'Толкающие', muscles: ['chest', 'shoulders', 'arms'] },
    { name: 'Тянущие', muscles: ['back', 'arms'] },
    { name: 'Ноги', muscles: ['legs', 'abs'] },
  ]
  switch (daysPerWeek) {
    case 2:
      return [
        { name: 'Всё тело A', muscles: ['legs', 'chest', 'back', 'abs'] },
        { name: 'Всё тело B', muscles: ['back', 'legs', 'shoulders', 'arms'] },
      ]
    case 3:
      return ppl
    case 4:
      return [
        { name: 'Верх A', muscles: ['chest', 'back', 'shoulders'] },
        { name: 'Низ A', muscles: ['legs', 'abs'] },
        { name: 'Верх B', muscles: ['back', 'chest', 'arms'] },
        { name: 'Низ B', muscles: ['legs', 'abs'] },
      ]
    case 5:
      return [
        { name: 'Грудь', muscles: ['chest', 'arms'] },
        { name: 'Спина', muscles: ['back', 'arms'] },
        { name: 'Ноги', muscles: ['legs', 'abs'] },
        { name: 'Плечи', muscles: ['shoulders', 'abs'] },
        { name: 'Руки', muscles: ['arms', 'abs'] },
      ]
    default: // 6 дней — PPL дважды
      return [...ppl, ...ppl]
  }
}

function rankDifficulty(d: Exercise['difficulty']): number {
  return d === 'beginner' ? 0 : d === 'intermediate' ? 1 : 2
}

function rankExperience(e: TrainingExperience): number {
  if (e === 'beginner') return 0
  if (e === 'years3plus') return 2
  return 1
}

function isAvailable(exercise: Exercise, profile: Profile): boolean {
  const owned = new Set(profile.equipment)
  if (owned.has('gym')) return true
  return exercise.equipment.filter((x) => x !== 'bodyweight').every((x) => owned.has(x))
}

function bestMatch(candidates: Exercise[], experience: TrainingExperience): Exercise | undefined {
  const target = rankExperience(experience) === 0 ? 0 : 1
  return [...candidates].sort((a, b) => {
    const d0 = Math.abs(rankDifficulty(a.difficulty) - target)
    const d1 = Math.abs(rankDifficulty(b.difficulty) - target)
    if (d0 !== d1) return d0 - d1
    return a.repsMin - b.repsMin
  })[0]
}

function pickExercises(
  muscles: MuscleGroup[],
  available: Exercise[],
  count: number,
  experience: TrainingExperience,
  used: Set<string>,
): Exercise[] {
  const result: Exercise[] = []
  const taken = new Set<string>()

  // 1) По одному базовому на каждую целевую группу (в порядке приоритета)
  for (const muscle of muscles) {
    const candidates = available.filter(
      (e) => e.primaryMuscles.includes(muscle) && !used.has(e.id) && !taken.has(e.id),
    )
    const best = bestMatch(candidates, experience)
    if (best) {
      result.push(best)
      taken.add(best.id)
    }
  }

  // 2) Добиваем до лимита времени остальными доступными
  if (result.length < count) {
    const rest = available
      .filter((e) => !taken.has(e.id) && !e.primaryMuscles.includes('cardio'))
      .sort((a, b) => rankDifficulty(a.difficulty) - rankDifficulty(b.difficulty))
    for (const e of rest) {
      if (result.length >= count) break
      result.push(e)
      taken.add(e.id)
    }
  }

  taken.forEach((t) => used.add(t))
  return result.slice(0, count)
}

function prescription(exercise: Exercise, goals: TrainingGoal[]): { sets: number; repsMin: number; repsMax: number; rest: number } {
  if (exercise.primaryMuscles.includes('cardio')) {
    return { sets: 1, repsMin: 10, repsMax: 15, rest: 0 }
  }
  if (goals.includes('strength') && !goals.includes('mass')) {
    return { sets: 4, repsMin: Math.max(3, exercise.repsMin), repsMax: Math.max(4, Math.min(6, exercise.repsMax)), rest: 150 }
  }
  if (goals.includes('endurance')) {
    return { sets: 3, repsMin: Math.max(12, exercise.repsMin), repsMax: Math.max(15, exercise.repsMax), rest: 45 }
  }
  // Похудение: больше повторов и короче отдых (если не нужна масса)
  if (goals.includes('fatLoss') && !goals.includes('mass')) {
    return { sets: 3, repsMin: Math.max(10, exercise.repsMin), repsMax: Math.max(15, exercise.repsMax), rest: 60 }
  }
  // Рекомпозиция: гипертрофийный диапазон с умеренным отдыхом
  if (goals.includes('recomposition') && !goals.includes('mass')) {
    return { sets: 3, repsMin: exercise.repsMin, repsMax: exercise.repsMax, rest: 75 }
  }
  return { sets: 3, repsMin: exercise.repsMin, repsMax: exercise.repsMax, rest: 90 }
}

export function generateProgram(profile: Profile): WorkoutPlan {
  const plan: WorkoutPlan = {
    name: `Программа · ${profile.sessionsPerWeek} × в неделю`,
    createdAt: new Date().toISOString(),
    isActive: true,
    scheme: profile.scheme,
    customWeekTypes: profile.customWeekTypes,
    customWeekPercents: profile.customWeekPercents,
    currentWeekIndex: 0,
    days: [],
  }

  const available = CATALOG.filter((e) => isAvailable(e, profile))
  // ~1 упражнение на 10 минут, не меньше 4 и не больше 9 в день
  const perSession = Math.max(4, Math.min(9, Math.floor(profile.sessionMinutes / 10)))

  const used = new Set<string>() // разнообразие между днями

  splitTemplate(profile.sessionsPerWeek).forEach((template, index) => {
    const day: WorkoutDay = { name: `День ${index + 1} — ${template.name}`, orderIndex: index, exercises: [] }
    const picked = pickExercises(template.muscles, available, perSession, profile.experience, used)
    picked.forEach((exercise, order) => {
      const rx = prescription(exercise, profile.goals)
      const item: DayExercise = {
        exerciseID: exercise.id,
        orderIndex: order,
        sets: rx.sets,
        repsMin: rx.repsMin,
        repsMax: rx.repsMax,
        baseWeightKg: 0, // стартовый вес атлет вводит на первой тренировке
        targetWeightKg: 0,
        restSeconds: rx.rest,
      }
      day.exercises.push(item)
    })
    plan.days.push(day)
  })

  return plan
}
