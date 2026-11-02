// MARK: - Общие типы (порт моделей нативного приложения)

export type Sex = 'male' | 'female'
export type TrainingExperience = 'beginner' | 'months6to12' | 'years1to3' | 'years3plus'
export type TrainingGoal = 'fatLoss' | 'recomposition' | 'mass' | 'strength' | 'endurance' | 'definition' | 'generalFitness'
export type Equipment = 'gym' | 'dumbbells' | 'pullupBar' | 'resistanceBands' | 'bodyweight' | 'bench'
export type PeriodizationScheme = 'heavyLight' | 'twoHeavyOneLight' | 'threeUpDeload' | 'linear' | 'custom'
export type WeekLoadType = 'heavy' | 'rampUp' | 'light' | 'deload'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'abs' | 'cardio' | 'hips'

export interface Exercise {
  id: string
  name: string
  primaryMuscles: MuscleGroup[]
  secondaryMuscles: MuscleGroup[]
  equipment: Equipment[]
  difficulty: Difficulty
  repsMin: number
  repsMax: number
  technique: string[]
  movement: { movingParts: string[]; axis: string; rangeMultiplier: number }
}

export interface DayExercise {
  exerciseID: string
  orderIndex: number
  sets: number
  repsMin: number
  repsMax: number
  baseWeightKg: number
  targetWeightKg: number
  restSeconds: number
}

export interface WorkoutDay {
  name: string
  orderIndex: number
  exercises: DayExercise[]
}

export interface WorkoutPlan {
  name: string
  createdAt: string // ISO
  isActive: boolean
  scheme: PeriodizationScheme
  customWeekTypes: WeekLoadType[]
  customWeekPercents: number[]
  currentWeekIndex: number
  /** Когда началась текущая неделя цикла (ISO); тренировки раньше этого момента в неё не засчитываются */
  weekStartedAt?: string
  days: WorkoutDay[]
}

export interface SetLog {
  exerciseID: string
  exerciseName: string
  setIndex: number
  plannedWeightKg: number
  plannedReps: number
  actualWeightKg: number
  actualReps: number
  isCompleted: boolean
}

export interface WorkoutSession {
  id: string
  startedAt: string
  finishedAt: string | null
  planName: string
  dayName: string
  weekIndex: number
  weekLoadType: WeekLoadType
  isCompleted: boolean
  rpe: number | null
  setLogs: SetLog[]
}

export interface Measurement {
  id: string
  date: string
  weightKg: number
  chestCm: number | null
  waistCm: number | null
  hipsCm: number | null
}

export interface Profile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  experience: TrainingExperience
  equipment: Equipment[]
  goals: TrainingGoal[]
  sessionMinutes: number
  sessionsPerWeek: number
  scheme: PeriodizationScheme
  customWeekTypes: WeekLoadType[]
  customWeekPercents: number[]
  freezeAvailable: boolean
  freezeAutoSpend: boolean
  freezeUsedCount: number
  freezeProtectedBase: number
  freezeBurnedNotified: boolean
}

// MARK: - Справочники (порт SharedEnums.swift)

export const SEX_TITLES: Record<Sex, string> = { male: 'Мужской', female: 'Женский' }

export const EXPERIENCE_TITLES: Record<TrainingExperience, string> = {
  beginner: 'Новичок',
  months6to12: '6–12 месяцев',
  years1to3: '1–3 года',
  years3plus: '3+ лет',
}

export const GOAL_TITLES: Record<TrainingGoal, string> = {
  fatLoss: 'Похудение',
  recomposition: 'Рекомпозиция',
  mass: 'Масса',
  strength: 'Сила',
  endurance: 'Выносливость',
  definition: 'Рельеф',
  generalFitness: 'Общая форма',
}

export const EQUIPMENT_TITLES: Record<Equipment, string> = {
  gym: 'Тренажёрный зал',
  dumbbells: 'Гантели',
  pullupBar: 'Турник',
  resistanceBands: 'Резинки',
  bodyweight: 'Свой вес',
  bench: 'Скамья',
}

export const SCHEME_TITLES: Record<PeriodizationScheme, string> = {
  heavyLight: '1 тяжёлая / 1 лёгкая',
  twoHeavyOneLight: '2 тяжёлые / 1 лёгкая',
  threeUpDeload: '3 нарастающие / 1 разгрузочная',
  linear: 'Линейная (постепенный рост %)',
  custom: 'Настраиваемая',
}

export const WEEK_TYPE_TITLES: Record<WeekLoadType, string> = {
  heavy: 'Тяжёлая',
  rampUp: 'Нарастающая',
  light: 'Лёгкая',
  deload: 'Разгрузочная',
}

export const MUSCLE_TITLES: Record<MuscleGroup, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
  abs: 'Пресс',
  cardio: 'Кардио',
  hips: 'Ягодицы',
}

export const DIFFICULTY_TITLES: Record<Difficulty, string> = {
  beginner: 'Новичок',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

// Цвета типов недель (тёмная тема)
export const WEEK_TYPE_COLORS: Record<WeekLoadType, string> = {
  heavy: '#ff7a5c',
  rampUp: '#ffd400',
  light: '#34d399',
  deload: '#6e8bff',
}

export function formatWeight(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
