// MARK: - Глобальное состояние приложения (React Context + localStorage)
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Measurement, Profile, SetLog, WeekLoadType, WorkoutPlan, WorkoutSession } from '../types'
import { storage, uid } from '../lib/storage'
import { generateProgram } from '../lib/programGenerator'

/// Незавершённая тренировка — переживает перезагрузку страницы.
export interface DraftWorkout {
  id: string
  startedAt: string
  planName: string
  dayName: string
  weekIndex: number
  weekLoadType: WeekLoadType
  isFree: boolean
  dayOrderIndex: number
  items: DraftItem[]
  logs: Record<string, SetLog[]>
  currentExerciseIdx: number
}

export interface DraftItem {
  exerciseID: string
  exerciseName: string
  sets: number
  repsMin: number
  repsMax: number
  baseWeightKg: number
  targetWeightKg: number
  plannedWeightKg: number
  restSeconds: number
}

const DRAFT_KEY = 'fa.draft'

interface AppState {
  profile: Profile | null
  plan: WorkoutPlan | null
  sessions: WorkoutSession[]
  measurements: Measurement[]
  draft: DraftWorkout | null
  completeOnboarding: (profile: Profile) => void
  updateProfile: (profile: Profile) => void
  updatePlan: (plan: WorkoutPlan) => void
  addSession: (session: WorkoutSession) => void
  saveDraft: (draft: DraftWorkout) => void
  clearDraft: () => void
  addMeasurement: (m: Omit<Measurement, 'id'>) => void
  deleteMeasurement: (id: string) => void
  resetAll: () => void
  exportData: () => string
  importData: (json: string) => boolean
}

const AppContext = createContext<AppState | null>(null)

function readDraft(): DraftWorkout | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as DraftWorkout) : null
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() => storage.loadProfile())
  const [plan, setPlan] = useState<WorkoutPlan | null>(() => storage.loadPlan())
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => storage.loadSessions())
  const [measurements, setMeasurements] = useState<Measurement[]>(() => storage.loadMeasurements())
  const [draft, setDraft] = useState<DraftWorkout | null>(() => readDraft())

  // Просим браузер не вычищать localStorage при нехватке места
  useEffect(() => { navigator.storage?.persist?.().catch(() => {}) }, [])
  useEffect(() => { if (profile) storage.saveProfile(profile) }, [profile])
  useEffect(() => { if (plan) storage.savePlan(plan) }, [plan])
  useEffect(() => { storage.saveSessions(sessions) }, [sessions])
  useEffect(() => { storage.saveMeasurements(measurements) }, [measurements])
  useEffect(() => {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    else localStorage.removeItem(DRAFT_KEY)
  }, [draft])

  const value = useMemo<AppState>(() => ({
    profile,
    plan,
    sessions,
    measurements,
    draft,
    completeOnboarding: (p) => {
      setProfile(p)
      setPlan(generateProgram(p))
    },
    updateProfile: setProfile,
    updatePlan: setPlan,
    addSession: (session) => setSessions((prev) => [...prev, session]),
    saveDraft: setDraft,
    clearDraft: () => setDraft(null),
    addMeasurement: (m) => setMeasurements((prev) => [...prev, { ...m, id: uid() }]),
    deleteMeasurement: (id) => setMeasurements((prev) => prev.filter((x) => x.id !== id)),
    exportData: () => JSON.stringify({ app: 'fitnessapp-web', version: 1, profile, plan, sessions, measurements, draft }),
    importData: (json) => {
      try {
        const d = JSON.parse(json)
        if (d?.app !== 'fitnessapp-web' || !d.profile || !Array.isArray(d.sessions)) return false
        setProfile(d.profile)
        setPlan(d.plan ?? null)
        setSessions(d.sessions)
        setMeasurements(Array.isArray(d.measurements) ? d.measurements : [])
        setDraft(d.draft ?? null)
        return true
      } catch {
        return false
      }
    },
    resetAll: () => {
      localStorage.clear()
      setProfile(null)
      setPlan(null)
      setSessions([])
      setMeasurements([])
      setDraft(null)
    },
  }), [profile, plan, sessions, measurements, draft])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp вне AppProvider')
  return ctx
}
