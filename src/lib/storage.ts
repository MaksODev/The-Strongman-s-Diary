// MARK: - Слой хранения: localStorage (порт слоя SwiftData)
import type { Measurement, Profile, WorkoutPlan, WorkoutSession } from '../types'

const KEYS = {
  profile: 'fa.profile',
  plan: 'fa.plan',
  sessions: 'fa.sessions',
  measurements: 'fa.measurements',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Не удалось сохранить данные:', e)
  }
}

export const storage = {
  loadProfile: (): Profile | null => read<Profile | null>(KEYS.profile, null),
  saveProfile: (p: Profile) => write(KEYS.profile, p),
  loadPlan: (): WorkoutPlan | null => read<WorkoutPlan | null>(KEYS.plan, null),
  savePlan: (p: WorkoutPlan) => write(KEYS.plan, p),
  loadSessions: (): WorkoutSession[] => read<WorkoutSession[]>(KEYS.sessions, []),
  saveSessions: (s: WorkoutSession[]) => write(KEYS.sessions, s),
  loadMeasurements: (): Measurement[] => read<Measurement[]>(KEYS.measurements, []),
  saveMeasurements: (m: Measurement[]) => write(KEYS.measurements, m),
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
