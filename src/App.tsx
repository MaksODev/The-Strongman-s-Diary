// MARK: - Корень приложения: навигация, таб-бар, сценарий завершения тренировки.
import { useState, type ReactElement } from 'react'
import { useApp } from './state/store'
import { Onboarding } from './screens/Onboarding'
import { WorkoutTab } from './screens/WorkoutTab'
import { ExerciseDetail } from './screens/CatalogTab'
import { DayEdit } from './screens/ProgramTab'
import { ProgressTab } from './screens/ProgressTab'
import { ProfileTab } from './screens/ProfileTab'
import { ActiveWorkout, startPlannedWorkout, startFreeWorkout, type WorkoutResult } from './screens/ActiveWorkout'
import { WorkoutSummary } from './screens/WorkoutSummary'
import { DumbbellIcon, ChartIcon, ProfileIcon } from './components/icons'
import { progressableExerciseIDs, incrementKg, weeksRemainingIn } from './lib/progression'
import { applyRPEFeedback, advanceWeekIfFinished } from './lib/rpe'
import { exerciseById } from './lib/catalog'
import { formatWeight } from './types'

type Tab = 'workout' | 'progress' | 'profile'
type Screen =
  | { name: 'tabs' }
  | { name: 'workout' }
  | { name: 'summary'; result: WorkoutResult }
  | { name: 'exercise'; id: string }
  | { name: 'dayEdit'; dayOrderIndex: number }

const TABS: { id: Tab; title: string; icon: (p: { width?: number; height?: number; className?: string }) => ReactElement }[] = [
  { id: 'workout', title: 'Тренировка', icon: (p) => <DumbbellIcon {...p} /> },
  { id: 'progress', title: 'Прогресс', icon: (p) => <ChartIcon {...p} /> },
  { id: 'profile', title: 'Профиль', icon: (p) => <ProfileIcon {...p} /> },
]

export default function App() {
  const app = useApp()
  const [tab, setTab] = useState<Tab>('workout')
  const [screen, setScreen] = useState<Screen>({ name: 'tabs' })

  if (!app.profile) {
    return <Onboarding onDone={() => setScreen({ name: 'tabs' })} />
  }

  // MARK: Завершение тренировки: прогрессия, RPE-фидбек, переход недели
  const handleWorkoutFinish = (result: WorkoutResult) => {
    const { sessions, plan, addSession, updatePlan, clearDraft } = app
    addSession(result.session)

    if (!result.isFree && plan) {
      const newPlan = structuredClone(plan)
      const day = newPlan.days.find((d) => d.orderIndex === result.dayOrderIndex)
      if (day) {
        const items = [...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex)
        const remaining = weeksRemainingIn(newPlan)
        const incFor = (item: (typeof items)[number]) => incrementKg(item, remaining)

        // Прогрессия: все подходы верхней границы → +вес
        const ids = progressableExerciseIDs(result.session.setLogs, items)
        for (const id of ids) {
          const item = items.find((i) => i.exerciseID === id)!
          const inc = incFor(item)
          item.baseWeightKg = Math.round((item.baseWeightKg + inc) * 10) / 10
          result.progressionLines.push(
            `${exerciseById(id)?.name ?? id}: +${formatWeight(inc)} кг → ${formatWeight(item.baseWeightKg)} кг`,
          )
        }

        // RPE-адаптация (оценка уже сохранена в сессии)
        if (result.session.rpe != null) {
          const feedback = applyRPEFeedback(result.session.rpe, newPlan, day, [...sessions, result.session], incFor)
          result.rpeMessages.push(...feedback.messages)
        }
      }

      // Переход недели, когда все дни пройдены
      const advanced = advanceWeekIfFinished(newPlan, [...sessions, result.session])
      if (advanced !== null) {
        newPlan.currentWeekIndex = advanced
        result.weekAdvanced = true
        result.weekNumber = advanced + 1
      }
      updatePlan(newPlan)
    }

    clearDraft()
    setScreen({ name: 'summary', result })
  }

  const startDay = (dayOrderIndex: number) => {
    const { plan, sessions } = app
    if (!plan) return
    app.saveDraft(startPlannedWorkout(plan, plan.days.find((d) => d.orderIndex === dayOrderIndex)!, sessions))
    setScreen({ name: 'workout' })
  }

  // MARK: Экраны поверх табов
  if (screen.name === 'workout') {
    const draft = app.draft ?? startFreeWorkout()
    return (
      <ActiveWorkout
        draft={draft}
        onFinish={handleWorkoutFinish}
        onAbort={() => {
          if (confirm('Отменить тренировку? Прогресс будет потерян.')) {
            app.clearDraft()
            setScreen({ name: 'tabs' })
          }
        }}
      />
    )
  }

  if (screen.name === 'summary') {
    return <WorkoutSummary result={screen.result} onDone={() => setScreen({ name: 'tabs' })} />
  }

  if (screen.name === 'exercise') {
    return <ExerciseDetail exerciseId={screen.id} onBack={() => setScreen({ name: 'tabs' })} />
  }

  if (screen.name === 'dayEdit') {
    return <DayEdit dayOrderIndex={screen.dayOrderIndex} onBack={() => setScreen({ name: 'tabs' })} />
  }

  // MARK: Табы
  return (
    <div className="h-full flex flex-col bg-bg">
      <div className="flex-1 overflow-hidden">
        {tab === 'workout' && (
          <WorkoutTab
            onStartDay={startDay}
            onEditDay={(i) => setScreen({ name: 'dayEdit', dayOrderIndex: i })}
          />
        )}
        {tab === 'progress' && <ProgressTab />}
        {tab === 'profile' && <ProfileTab />}
      </div>

      {/* Баннер незавершённой тренировки + парящий таб-бар */}
      <div className="px-3" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) - 16px), 8px)' }}>
        {app.draft && screen.name === 'tabs' && (
          <button
            onClick={() => setScreen({ name: 'workout' })}
            className="btn-brutal w-full mb-2 py-3 rounded-[18px] btn-flash font-extrabold text-[14px] animate-pop-in"
          >
            ▶ Продолжить тренировку
          </button>
        )}

        {/* Парящий таб-бар: не касается краёв экрана */}
        <nav className="flex rounded-[24px] bg-card/90 backdrop-blur-md border border-white/10 shadow-brutal">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 flex flex-col items-center gap-1 transition-colors"
            >
              <span className={tab === t.id ? 'text-[#a78bfa]' : 'text-text-disabled'}>
                {t.icon({ width: 22, height: 22 })}
              </span>
              <span className={`text-[10px] ${tab === t.id ? 'font-bold text-ink' : 'font-semibold text-text-secondary'}`}>
                {t.title}
              </span>
              {tab === t.id && <span className="w-1 h-1 rounded-full bg-accent" />}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
