// MARK: - Генератор стартовой программы (порт ProgramGenerator.swift)
import type { Exercise, DayExercise, MuscleGroup, Profile, TrainingExperience, TrainingGoal, WorkoutDay, WorkoutPlan } from '../types'
import { CATALOG } from './catalog'
import { estimateWorkingWeight, isFiller, matchesArmsBias, type ArmsBias, isMainLift, kindOf, levelOf, variantKey, type ExerciseKind, type Level } from './loadEstimate'

/// Акцент дня (раздел 4–5 документа): тяжёлый — основные движения в 3–6 повторениях,
/// объёмный — 8–15 повторений и больше подходов, смешанный — тяжёлое основное + умеренная вспомогательная работа.
type DayFocus = 'moderate' | 'heavy' | 'volume' | 'mixed'

interface DayTemplate {
  name: string
  muscles: MuscleGroup[]
  focus: DayFocus
  /** Какие мышцы рук брать в этот день: тянущий — бицепс, толкающий — трицепс */
  arms?: ArmsBias
}

function splitTemplate(daysPerWeek: number): DayTemplate[] {
  const ppl = (focus: DayFocus[]): DayTemplate[] => [
    { name: 'Толкающие', muscles: ['chest', 'shoulders', 'arms'], focus: focus[0], arms: 'triceps' },
    { name: 'Тянущие', muscles: ['back', 'arms'], focus: focus[1], arms: 'biceps' },
    { name: 'Ноги', muscles: ['legs', 'abs'], focus: focus[2] },
  ]
  switch (daysPerWeek) {
    case 2:
      return [
        { name: 'Всё тело A', muscles: ['legs', 'chest', 'back', 'abs'], focus: 'moderate' },
        { name: 'Всё тело B', muscles: ['back', 'legs', 'shoulders', 'arms'], focus: 'moderate' },
      ]
    case 3:
      return ppl(['heavy', 'volume', 'mixed'])
    case 4:
      return [
        { name: 'Верх A', muscles: ['chest', 'back', 'shoulders'], focus: 'heavy' },
        { name: 'Низ A', muscles: ['legs', 'abs'], focus: 'heavy' },
        { name: 'Верх B', muscles: ['back', 'chest', 'arms'], focus: 'volume' },
        { name: 'Низ B', muscles: ['legs', 'abs'], focus: 'volume' },
      ]
    case 5:
      return [
        { name: 'Грудь', muscles: ['chest', 'arms'], focus: 'mixed', arms: 'triceps' },
        { name: 'Спина', muscles: ['back', 'arms'], focus: 'mixed', arms: 'biceps' },
        { name: 'Ноги', muscles: ['legs', 'abs'], focus: 'heavy' },
        { name: 'Плечи', muscles: ['shoulders', 'abs'], focus: 'volume' },
        { name: 'Руки', muscles: ['arms', 'abs'], focus: 'volume' },
      ]
    default: // 6 дней — PPL дважды: сначала тяжёлая, затем объёмная неделя
      return [...ppl(['heavy', 'heavy', 'heavy']), ...ppl(['volume', 'volume', 'volume'])]
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
    const f0 = isFiller(a) ? 1 : 0
    const f1 = isFiller(b) ? 1 : 0
    if (f0 !== f1) return f0 - f1
    // при равной сложности — базовые подъёмы раньше экзотических вариантов
    const m0 = isMainLift(a) ? 0 : 1
    const m1 = isMainLift(b) ? 0 : 1
    if (m0 !== m1) return m0 - m1
    return a.repsMin - b.repsMin
  })[0]
}

/// Какие типы упражнений предпочесть для очередного выбора по мышечной группе:
/// большие группы начинаются с базовых многосуставных, руки и пресс — с изоляции.
function preferredKinds(muscle: MuscleGroup, pickIndex: number): ExerciseKind[] {
  if (muscle === 'abs') return ['core']
  if (muscle === 'arms') return ['iso', 'compound']
  if (muscle === 'shoulders') return pickIndex === 0 ? ['compound', 'iso'] : ['iso', 'compound']
  return pickIndex < 2 ? ['compound', 'iso'] : ['iso', 'compound']
}

const KIND_ORDER: Record<ExerciseKind, number> = { compound: 0, iso: 1, core: 2, cardio: 3 }

function pickExercises(
  muscles: MuscleGroup[],
  available: Exercise[],
  count: number,
  experience: TrainingExperience,
  used: Set<string>,
  armsBias: ArmsBias = 'any',
): Exercise[] {
  const result: Exercise[] = []
  const taken = new Set<string>()
  const picksByMuscle = new Map<MuscleGroup, number>()
  const keys = new Set<string>() // семейства уже выбранных упражнений дня

  // 1) Набираем упражнения по целевым группам циклами: главная группа дня идёт с двойным весом,
  //    остальные по одному — чтобы «тянущий» день не заполнялся случайными жимами.
  const order = muscles.flatMap((m, i) => (i === 0 && muscles.length > 1 ? [m, m] : [m]))
  let progressed = true
  while (result.length < count && progressed) {
    progressed = false
    for (const muscle of order) {
      if (result.length >= count) break
      let all = available.filter(
        (e) => e.primaryMuscles.includes(muscle) && !used.has(e.id) && !taken.has(e.id),
      )
      if (muscle === 'arms') {
        const biased = all.filter((e) => matchesArmsBias(e, armsBias))
        if (biased.length > 0) all = biased
      }
      // без дублей по семейству (два жима носками, два пуловера), если есть из чего выбрать
      const fresh = all.filter((e) => !keys.has(variantKey(e)))
      const candidates = fresh.length > 0 ? fresh : all
      let best: Exercise | undefined
      for (const kind of preferredKinds(muscle, picksByMuscle.get(muscle) ?? 0)) {
        best = bestMatch(candidates.filter((e) => kindOf(e) === kind), experience)
        if (best) break
      }
      best ??= bestMatch(candidates, experience)
      if (best) {
        result.push(best)
        taken.add(best.id)
        keys.add(variantKey(best))
        picksByMuscle.set(muscle, (picksByMuscle.get(muscle) ?? 0) + 1)
        progressed = true
      }
    }
  }

  // 2) Если целевых групп не хватило — добиваем остальными доступными
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
  // Порядок занятия: сначала тяжёлые многосуставные (приоритетное движение — первым), затем изоляция, затем пресс
  return result.slice(0, count).sort((a, b) => KIND_ORDER[kindOf(a)] - KIND_ORDER[kindOf(b)])
}

interface Rx { sets: number; repsMin: number; repsMax: number; rest: number }

/// Подходы × повторения по опыту, акценту дня и роли упражнения (разделы 3–4 документа).
/// Новичку — 2 подхода в умеренных диапазонах (тяжёлые 3–6 вводятся после освоения техники),
/// опытным — больше подходов и тяжёлая практика приоритетного движения.
function baseRx(level: Level, focus: DayFocus, kind: ExerciseKind, priority: boolean): { sets: number; repsMin: number; repsMax: number } {
  if (kind === 'core') return { sets: level === 'advanced' ? 3 : 2, repsMin: 10, repsMax: 15 }

  if (kind === 'iso') {
    if (level === 'novice' || level === 'early') return { sets: 2, repsMin: 10, repsMax: 15 }
    if (level === 'intermediate') {
      return focus === 'volume' ? { sets: 3, repsMin: 10, repsMax: 15 }
        : focus === 'heavy' ? { sets: 2, repsMin: 8, repsMax: 12 }
          : { sets: 2, repsMin: 10, repsMax: 15 }
    }
    return focus === 'heavy' ? { sets: 3, repsMin: 8, repsMax: 12 } : { sets: 3, repsMin: 10, repsMax: 15 }
  }

  // Многосуставные
  switch (level) {
    case 'novice':
      return priority ? { sets: 2, repsMin: 6, repsMax: 10 } : { sets: 2, repsMin: 8, repsMax: 12 }
    case 'early':
      if (focus === 'heavy') return priority ? { sets: 3, repsMin: 5, repsMax: 8 } : { sets: 2, repsMin: 6, repsMax: 10 }
      if (focus === 'volume') return { sets: 3, repsMin: 8, repsMax: 12 }
      return priority ? { sets: 3, repsMin: 6, repsMax: 10 } : { sets: 2, repsMin: 8, repsMax: 12 }
    case 'intermediate':
      if (focus === 'heavy') return priority ? { sets: 4, repsMin: 3, repsMax: 6 } : { sets: 3, repsMin: 6, repsMax: 10 }
      if (focus === 'volume') return { sets: 3, repsMin: 8, repsMax: 12 }
      if (focus === 'mixed') return priority ? { sets: 4, repsMin: 4, repsMax: 6 } : { sets: 3, repsMin: 8, repsMax: 12 }
      return { sets: 3, repsMin: 6, repsMax: 10 }
    case 'advanced':
      if (focus === 'heavy') return priority ? { sets: 4, repsMin: 3, repsMax: 6 } : { sets: 3, repsMin: 5, repsMax: 8 }
      if (focus === 'volume') return priority ? { sets: 4, repsMin: 6, repsMax: 10 } : { sets: 3, repsMin: 8, repsMax: 12 }
      if (focus === 'mixed') return priority ? { sets: 4, repsMin: 4, repsMax: 6 } : { sets: 3, repsMin: 8, repsMax: 12 }
      return priority ? { sets: 4, repsMin: 6, repsMax: 10 } : { sets: 3, repsMin: 6, repsMax: 10 }
  }
}

function prescription(exercise: Exercise, goals: TrainingGoal[], level: Level, focus: DayFocus, priority: boolean): Rx {
  const kind = kindOf(exercise)
  if (kind === 'cardio') return { sets: 1, repsMin: 10, repsMax: 15, rest: 0 }

  let { sets, repsMin, repsMax } = baseRx(level, focus, kind, priority)
  // Упражнения со специальным диапазоном в каталоге (пресс 12–20, икры 10–20, планка по времени) сохраняем
  if (exercise.repsMin >= 10) { repsMin = exercise.repsMin; repsMax = exercise.repsMax }

  const strengthOnly = goals.includes('strength') && !goals.includes('mass')
  let heavy = kind === 'compound' && repsMax <= 6

  if (strengthOnly && kind === 'compound' && !(exercise.repsMin >= 10)) {
    // Тяжёлая работа вводится после освоения техники — новичкам 5–8, опытным 3–6
    if (level === 'novice' || level === 'early') { repsMin = 5; repsMax = 8 } else { repsMin = 3; repsMax = 6 }
    heavy = repsMax <= 6
  }
  if (goals.includes('endurance') && !(exercise.repsMin >= 10)) {
    repsMin = Math.max(12, repsMin); repsMax = Math.max(15, repsMax); heavy = false
  } else if (goals.includes('fatLoss') && !goals.includes('mass') && !strengthOnly && !(exercise.repsMin >= 10)) {
    repsMin = Math.max(10, repsMin); repsMax = Math.max(15, repsMax); heavy = false
  }

  // Отдых по готовности: тяжёлые многосуставные — дольше, изоляция и пресс — короче
  let rest = kind === 'core' ? 60 : kind === 'iso' ? 75 : heavy ? 180 : level === 'novice' ? 90 : 120
  if (goals.includes('endurance')) rest = Math.min(rest, 45)
  else if (goals.includes('fatLoss') && !goals.includes('mass')) rest = Math.max(45, rest - 30)
  else if (goals.includes('recomposition') && !goals.includes('mass') && !heavy) rest = Math.min(rest, 90)
  return { sets, repsMin, repsMax, rest }
}

/// Сколько подходов реально помещается в занятие (~3 минуты на подход с отдыхом).
function trimToTime(items: { sets: number; kind: ExerciseKind }[], sessionMinutes: number) {
  const budget = Math.max(8, Math.floor(sessionMinutes / 3))
  let total = items.reduce((s, i) => s + i.sets, 0)
  // сначала сокращаем пресс и изоляцию, затем многосуставные — но не ниже 2 подходов
  for (const pass of [['core', 'iso'], ['compound']] as ExerciseKind[][]) {
    for (let i = items.length - 1; i >= 0 && total > budget; i--) {
      const it = items[i]
      if (pass.includes(it.kind) && it.sets > 2) { it.sets--; total-- }
    }
  }
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
    const picked = pickExercises(template.muscles, available, perSession, profile.experience, used, template.arms)
    const level = levelOf(profile.experience)
    const firstCompound = picked.findIndex((e) => kindOf(e) === 'compound')
    const rxs = picked.map((exercise, order) => ({
      exercise,
      kind: kindOf(exercise),
      rx: prescription(exercise, profile.goals, level, template.focus, order === firstCompound),
    }))
    const trimmed = rxs.map((r) => ({ sets: r.rx.sets, kind: r.kind }))
    trimToTime(trimmed, profile.sessionMinutes)
    rxs.forEach(({ exercise, rx }, order) => {
      const item: DayExercise = {
        exerciseID: exercise.id,
        orderIndex: order,
        sets: trimmed[order].sets,
        repsMin: rx.repsMin,
        repsMax: rx.repsMax,
        // Примерный стартовый вес по массе тела и опыту; атлет уточняет его на первой тренировке
        baseWeightKg: estimateWorkingWeight(exercise, profile, rx.repsMin, rx.repsMax),
        targetWeightKg: 0,
        restSeconds: rx.rest,
      }
      day.exercises.push(item)
    })
    plan.days.push(day)
  })

  return plan
}
