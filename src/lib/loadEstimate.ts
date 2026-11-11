// MARK: - Классификация упражнений и оценка стартового рабочего веса.
// Документ-источник не задаёт килограммы: он советует начинать с веса, при котором остаётся запас
// 2–4 повторения (RIR), и затем двигаться двойной прогрессией. Поэтому вес здесь — консервативная оценка
// от массы тела, опыта и типа снаряда; атлет уточняет её на первой тренировке.
import type { Exercise, MuscleGroup, Profile, TrainingExperience } from '../types'

export type ExerciseKind = 'compound' | 'iso' | 'core' | 'cardio'
export type Implement = 'barbell' | 'ez' | 'dumbbell' | 'kettlebell' | 'smith' | 'cable' | 'machine' | 'bodyweight'
export type Level = 'novice' | 'early' | 'intermediate' | 'advanced'

const ISO_WORDS = [
  'разгибан', 'сгибан', 'разведен', 'сведен', 'кикбэк', 'французск', 'носк', 'икр', 'запяст', 'пальцев',
  'сжимани', 'тяга к лицу', 'пуловер', 'махи', 'в стороны', 'шраг', 'молот', 'концентрир', 'скотта',
  'паук', 'бабочк', 'кроссовер', 'бицепс', 'трицепс', 'отведени', 'приведени', 'подъём гантел', 'подъёмы гантел',
]
const MAIN_LIFT_WORDS = ['присед', 'жим', 'тяга', 'тяги', 'становая', 'выпад', 'подтягив', 'отжим', 'мост', 'гребл', 'брусья']

// Упражнения со своим весом: внешняя нагрузка не назначается (даже если в каталоге указан «зал»)
const BODYWEIGHT_WORDS = ['отжиман', 'подтягив', 'на брусьях', 'с весом тела', 'планк', 'скручиван', 'русский поворот', 'подъём коленей', 'подъёмы коленей', 'подъём ног', 'подъёмы ног', 'подтягивание коленей']
const WEIGHTED_WORDS = ['гантел', 'штанг', 'блок', 'гир', 'тренажёр', 'с отягощ', 'с диском']
// Малополезные «по умолчанию» упражнения: выбираются автоматически только если больше ничего нет
const FILLER_WORDS = ['сжимани', 'пальцев', 'запяст', 'колдун', 'пират', 'ручная тяга', 'махи гантелью', 'балансиров', 'скольжени', 'на высокий ящик', 'раскачк']

export function levelOf(experience: TrainingExperience): Level {
  switch (experience) {
    case 'beginner': return 'novice'
    case 'months6to12': return 'early'
    case 'years1to3': return 'intermediate'
    case 'years3plus': return 'advanced'
  }
}

function has(name: string, words: string[]): boolean {
  return words.some((w) => name.includes(w))
}

export function kindOf(e: Exercise): ExerciseKind {
  const name = e.name.toLowerCase()
  if (e.primaryMuscles.includes('cardio')) return 'cardio'
  if (e.primaryMuscles.includes('abs')) return 'core'
  // «Молот» в жимах и тягах — тренажёр Hammer, а не сгибание на бицепс
  if (name.includes('молот') && (name.includes('жим') || name.includes('тяг'))) return 'compound'
  if (has(name, ISO_WORDS)) return 'iso'
  return 'compound'
}

/// Базовые подъёмы (приседания, жимы, тяги) — выбираются раньше «экзотики» при равной сложности.
export function isMainLift(e: Exercise): boolean {
  return has(e.name.toLowerCase(), MAIN_LIFT_WORDS)
}

export function isFiller(e: Exercise): boolean {
  return has(e.name.toLowerCase(), FILLER_WORDS) || e.id.includes('balance') || e.id.includes('judo')
}

export type ArmsBias = 'biceps' | 'triceps' | 'any'
const TRICEPS_WORDS = ['трицепс', 'разгибан', 'французск', 'узким хватом', 'отжиман', 'брусья', 'кикбэк', 'jm', 'от скамьи']
const BICEPS_WORDS = ['бицепс', 'сгибан', 'молот', 'скотта', 'концентрир', 'паук', 'подъём штанги', 'подъём гантел']

/// Подходит ли упражнение для рук под акцент дня (тянущий день — бицепс, толкающий — трицепс).
export function matchesArmsBias(e: Exercise, bias: ArmsBias): boolean {
  if (bias === 'any') return true
  const name = e.name.toLowerCase()
  return has(name, bias === 'triceps' ? TRICEPS_WORDS : BICEPS_WORDS) && !has(name, bias === 'triceps' ? BICEPS_WORDS.filter((w) => w !== 'сгибан') : TRICEPS_WORDS)
}

/// Ключ «семейства» упражнения: в одном занятии не берём два похожих (два жима носками, два пуловера).
export function variantKey(e: Exercise): string {
  const name = e.name.toLowerCase()
  if (name.includes('носк') || name.includes('икр')) return 'calves'
  const words = name.replace(/[^а-яёa-z ]/g, ' ').split(/\s+/).filter(Boolean)
  return (kindOf(e) === 'compound' ? words.slice(0, 3) : words.slice(0, 1)).join(' ')
}

export function implementOf(e: Exercise): Implement {
  const name = e.name.toLowerCase()
  const external = e.equipment.filter((x) => x === 'gym' || x === 'dumbbells')
  if (external.length === 0) return 'bodyweight' // турник, резинки, свой вес
  if (has(name, BODYWEIGHT_WORDS) && !has(name, WEIGHTED_WORDS)) return 'bodyweight'
  if (name.includes('ez') || name.includes('эз')) return 'ez'
  if (name.includes('штанг') || name.includes('гриф')) return 'barbell'
  if (name.includes('смит')) return 'smith'
  if (name.includes('гантел')) return 'dumbbell'
  if (name.includes('гир')) return 'kettlebell'
  if (name.includes('блок') || name.includes('канат')) return 'cable'
  if (e.equipment.includes('dumbbells') && !e.equipment.includes('gym')) return 'dumbbell'
  return 'machine'
}

type Coef = Partial<Record<Implement, number>> & { def: number }

// Доля массы тела для мужчины среднего уровня: вес на ~9 повторений с запасом 2 (для гантелей — на одну руку).
const COEF: Record<MuscleGroup, { compound: Coef; iso: Coef }> = {
  chest: {
    compound: { barbell: 0.65, dumbbell: 0.26, smith: 0.55, machine: 0.55, cable: 0.18, def: 0.5 },
    iso: { machine: 0.35, dumbbell: 0.1, cable: 0.12, def: 0.25 },
  },
  back: {
    compound: { barbell: 0.55, ez: 0.5, dumbbell: 0.28, smith: 0.5, machine: 0.55, cable: 0.5, def: 0.5 },
    iso: { cable: 0.15, dumbbell: 0.12, machine: 0.2, def: 0.15 },
  },
  legs: {
    compound: { barbell: 0.8, smith: 0.75, dumbbell: 0.22, kettlebell: 0.25, machine: 1.1, def: 0.7 },
    iso: { machine: 0.35, cable: 0.1, dumbbell: 0.12, def: 0.3 },
  },
  hips: {
    compound: { barbell: 0.8, smith: 0.75, machine: 0.7, dumbbell: 0.35, kettlebell: 0.3, def: 0.6 },
    iso: { machine: 0.3, cable: 0.1, def: 0.15 },
  },
  shoulders: {
    compound: { barbell: 0.4, smith: 0.38, dumbbell: 0.17, machine: 0.35, cable: 0.15, def: 0.3 },
    iso: { dumbbell: 0.07, cable: 0.06, machine: 0.2, barbell: 0.3, def: 0.06 },
  },
  arms: {
    compound: { barbell: 0.5, ez: 0.35, smith: 0.5, dumbbell: 0.2, machine: 0.5, def: 0.45 },
    iso: { barbell: 0.25, ez: 0.22, dumbbell: 0.11, cable: 0.22, machine: 0.3, def: 0.15 },
  },
  abs: {
    compound: { def: 0 },
    iso: { cable: 0.22, machine: 0.3, dumbbell: 0.1, def: 0 },
  },
  cardio: { compound: { def: 0 }, iso: { def: 0 } },
}

const LEVEL_FACTOR: Record<Level, number> = { novice: 0.45, early: 0.65, intermediate: 1, advanced: 1.25 }
const UPPER: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms']

/// Вес на `reps` повторений с запасом 2 относительно веса на 9 повторений (формула Эпли).
function repFactor(repsMin: number, repsMax: number): number {
  const mid = (repsMin + repsMax) / 2
  const f = (r: number) => 1 / (1 + (r + 2) / 30)
  return f(mid) / f(9)
}

function round(value: number, impl: Implement): number {
  if (impl === 'dumbbell' || impl === 'kettlebell') {
    const step = value < 10 ? 1 : 2
    return Math.max(step, Math.round(value / step) * step)
  }
  return Math.max(5, Math.round(value / 2.5) * 2.5)
}

/// Примерный рабочий вес (кг) на 100% нагрузки недели; 0 — упражнение без внешнего веса.
export function estimateWorkingWeight(
  e: Exercise,
  profile: Pick<Profile, 'sex' | 'weightKg' | 'experience'>,
  repsMin: number,
  repsMax: number,
): number {
  const kind = kindOf(e)
  if (kind === 'cardio') return 0
  const impl = implementOf(e)
  if (impl === 'bodyweight') return 0
  const muscle = e.primaryMuscles[0]
  const table = COEF[muscle]?.[kind === 'compound' ? 'compound' : 'iso']
  if (!table) return 0
  const coef = table[impl] ?? table.def
  if (coef <= 0) return 0

  const sexFactor = profile.sex === 'female' ? (UPPER.includes(muscle) ? 0.7 : 0.85) : 1
  let weight = profile.weightKg * coef * LEVEL_FACTOR[levelOf(profile.experience)] * sexFactor * repFactor(repsMin, repsMax)

  // Пустой гриф — разумный минимум для упражнений со штангой
  if (impl === 'barbell') weight = Math.max(weight, kind === 'compound' ? 20 : 10)
  if (impl === 'ez') weight = Math.max(weight, 10)
  return round(weight, impl)
}
