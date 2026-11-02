// MARK: - Главный таб «Тренировка»: серия, неделя цикла, дни программы (старт и правка карандашом).
import { useMemo } from 'react'
import { useApp } from '../state/store'
import { currentWeek, cycle } from '../lib/periodization'
import { evaluateStreak, WEEKS_TO_EARN } from '../lib/streakFreeze'
import {
  completedThisWeek, consistencyNudge, dismissForThisWeek, isDismissedThisWeek,
  NUDGE_DISMISS_KEY, OVERLOAD_DISMISS_KEY, overloadStatus, sessionsInWeek,
} from '../lib/nudges'
import { CONSISTENCY_FACTS, RECOVERY_FACTS } from '../lib/catalog'
import type { WorkoutDay } from '../types'
import { WEEK_TYPE_COLORS, WEEK_TYPE_TITLES } from '../types'
import { Card, SecondaryButton, SectionTitle } from '../components/ui'
import { FlameIcon, ShieldIcon, SproutIcon, PencilIcon } from '../components/icons'

export function WorkoutTab({ onStartDay, onEditDay }: {
  onStartDay: (dayOrderIndex: number) => void
  onEditDay: (dayOrderIndex: number) => void
}) {
  const { profile, plan, sessions, updatePlan } = useApp()

  const streak = useMemo(() => {
    if (!profile) return null
    // evaluateStreak мутирует профиль — работаем с копией для расчёта отображения
    const copy = { ...profile }
    return evaluateStreak(copy, sessions)
  }, [profile, sessions])

  const week = plan ? currentWeek(plan) : null
  const weeks = plan ? cycle(plan.scheme, plan.customWeekTypes, plan.customWeekPercents) : []
  const doneThisWeek = useMemo(() => new Set(sessionsInWeek(sessions, 0).map((s) => s.dayName)), [sessions])
  const doneCount = doneThisWeek.size

  const overload = profile ? overloadStatus(completedThisWeek(sessions), profile.sessionsPerWeek) : 'ok'
  const overloadDismissed = isDismissedThisWeek(OVERLOAD_DISMISS_KEY)
  const nudge = profile && plan ? consistencyNudge(sessions, profile.sessionsPerWeek) : null
  const nudgeDismissed = isDismissedThisWeek(NUDGE_DISMISS_KEY)

  const overloadFact = RECOVERY_FACTS[(doneCount + 1) % RECOVERY_FACTS.length]
  const nudgeFact = nudge ? CONSISTENCY_FACTS[nudge.factIndex % CONSISTENCY_FACTS.length] : null

  if (!profile || !plan) return null

  return (
    <div className="h-full overflow-y-auto bg-bg safe-top">
      <div className="px-4 py-4 pb-28 max-w-md mx-auto space-y-3">
        {/* Карточка серии + заряд страховки */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            {/* Иллюстрация: плитка со смыслом серии/страховки */}
            <div className={`w-[64px] h-[64px] rounded-[18px] flex items-center justify-center shrink-0 transition-all ${
              streak?.freezeAvailable
                ? 'tile-indigo text-white'
                : streak && streak.effectiveStreak > 0
                  ? 'tile-violet text-white'
                  : 'bg-elevated border border-white/10 text-text-secondary'
            }`}>
              {streak?.freezeAvailable
                ? <ShieldIcon />
                : streak && streak.effectiveStreak > 0
                  ? <FlameIcon />
                  : <SproutIcon />}
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-[18px]">
                {streak && streak.effectiveStreak > 0
                  ? `Серия: ${streak.effectiveStreak} ${plural(streak.effectiveStreak, 'неделя', 'недели', 'недель')}`
                  : 'Серия начнётся с первой тренировки'}
              </div>
              <div className="text-text-secondary text-[12px] mt-0.5">
                {streak?.freezeAvailable
                  ? '🛡️ Страховка серии готова'
                  : `Заряд страховки: ${streak?.chargeWeeks ?? 0}/${WEEKS_TO_EARN} недель подряд`}
              </div>
              {/* Прогресс-бар заряда: иконка заливается цветом */}
              <div className="mt-2 h-2.5 rounded-full bg-elevated border border-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent animate-charge"
                  style={{ ['--charge' as string]: `${((streak?.freezeAvailable ? WEEKS_TO_EARN : streak?.chargeWeeks ?? 0) / WEEKS_TO_EARN) * 100}%` }}
                />
              </div>
            </div>
          </div>
          {streak?.justEarned && (
            <div className="animate-pop-in mt-2 text-[13px] text-accent font-medium">🛡️ Страховка заработана! Пропуск одной недели не сожжёт серию.</div>
          )}
          {streak?.justSpent && (
            <div className="animate-pop-in mt-2 text-[13px] text-ramp font-medium">🛡️ Страховка потрачена — серия сохранена. Вернись в ритм!</div>
          )}
          {streak?.streakBurned && (
            <div className="animate-pop-in mt-2 text-[13px] text-heavy font-medium">🔥 Серия сгорела. Ничего страшного — новая начинается сегодня.</div>
          )}
        </Card>

        {/* Перевыполнение плана → предупреждение о перетренированности */}
        {overload === 'over' && !overloadDismissed && (
          <Card className="p-4 border-heavy/50">
            <div className="font-semibold text-[15px] text-heavy">План перевыполнен на +1 тренировку</div>
            <p className="text-text-secondary text-[13px] mt-1.5">{overloadFact.text}</p>
            <div className="text-text-disabled text-[11px] mt-1">{overloadFact.source}</div>
            <button className="mt-2 text-[13px] text-text-secondary font-medium"
              onClick={() => { dismissForThisWeek(OVERLOAD_DISMISS_KEY) }}>
              Понятно
            </button>
          </Card>
        )}

        {/* Недовыполнение плана → мягкая мотивация */}
        {nudge && !nudgeDismissed && nudgeFact && (
          <Card className="p-4 border-ramp/50">
            <div className="font-semibold text-[15px]">
              На прошлой неделе: {nudge.completed} из {nudge.planned}
            </div>
            <p className="text-text-secondary text-[13px] mt-1.5">{nudgeFact.text}</p>
            <div className="text-text-disabled text-[11px] mt-1">{nudgeFact.source}</div>
            <button className="mt-2 text-[13px] text-text-secondary font-medium"
              onClick={() => { dismissForThisWeek(NUDGE_DISMISS_KEY) }}>
              Понятно
            </button>
          </Card>
        )}

        {/* Текущая неделя цикла: можно переключать вручную */}
        {week && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => updatePlan({ ...plan, currentWeekIndex: (plan.currentWeekIndex - 1 + weeks.length) % weeks.length })}
                aria-label="предыдущая неделя"
                className="w-9 h-9 rounded-full bg-elevated border border-white/10 text-text-secondary text-[16px] font-bold active:text-ink shrink-0"
              >‹</button>
              <div className="flex-1 text-center">
                <div className="text-[12px] text-text-secondary uppercase tracking-wide">Неделя {plan.currentWeekIndex + 1} цикла</div>
                <div className="font-bold text-[17px]" style={{ color: WEEK_TYPE_COLORS[week.type] }}>
                  {WEEK_TYPE_TITLES[week.type]} · {Math.round(week.percent * 100)}%
                </div>
              </div>
              <button
                onClick={() => updatePlan({ ...plan, currentWeekIndex: (plan.currentWeekIndex + 1) % weeks.length })}
                aria-label="следующая неделя"
                className="w-9 h-9 rounded-full bg-elevated border border-white/10 text-text-secondary text-[16px] font-bold active:text-ink shrink-0"
              >›</button>
            </div>
            <div className="flex justify-center gap-1 mt-3">
              {weeks.map((w) => (
                <div key={w.index} className="w-2 h-6 rounded-full"
                  style={{ backgroundColor: w.index === weeks.indexOf(week) ? WEEK_TYPE_COLORS[w.type] : 'rgba(255,255,255,0.08)' }} />
              ))}
            </div>
          </Card>
        )}

        <SectionTitle>Тренировки · {doneCount}/{plan.days.length} на этой неделе</SectionTitle>

        {plan.days.map((day) => (
          <DayCard key={day.orderIndex} day={day} done={doneThisWeek.has(day.name)}
            onStart={() => onStartDay(day.orderIndex)}
            onEdit={() => onEditDay(day.orderIndex)} />
        ))}

        <SecondaryButton onClick={() => onEditDay(-1)}>+ Добавить тренировку</SecondaryButton>
      </div>
    </div>
  )
}

// MARK: Карточка дня: старт тренировки и правка через карандаш (экран редактирования дня)
function DayCard({ day, done, onStart, onEdit }: {
  day: WorkoutDay
  done: boolean
  onStart: () => void
  onEdit: () => void
}) {
  return (
    <Card className={`p-4 flex items-center gap-2.5 ${done ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] flex items-center gap-2">
          {done && <span className="text-accent">✓</span>}
          {day.name}
        </div>
        <div className="text-text-secondary text-[12px] mt-0.5 truncate">
          {day.exercises.length} упражнений · {day.exercises.reduce((s, e) => s + e.sets, 0)} подходов
        </div>
      </div>
      <button
        onClick={onEdit}
        aria-label="редактировать тренировку"
        className="w-9 h-9 rounded-[12px] bg-elevated border border-white/10 text-text-secondary flex items-center justify-center shrink-0 active:text-ink"
      >
        <PencilIcon />
      </button>
      {!done && (
        <button
          onClick={onStart}
          className="btn-brutal shrink-0 px-5 py-2.5 rounded-[14px] font-extrabold text-[14px] text-white"
          style={{ background: 'linear-gradient(140deg, #a855f7 0%, #6d3df0 100%)', boxShadow: '0 6px 18px rgba(139,92,246,0.35)' }}
        >
          Начать
        </button>
      )}
    </Card>
  )
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}
