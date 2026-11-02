// MARK: - Таб «Прогресс»: силовой индекс, перцентиль, история, достижения.
import { useMemo } from 'react'
import { useApp } from '../state/store'
import { evaluateStrength } from '../lib/strengthIndex'
import { achievements, bestMilestone } from '../lib/gamification'
import { cycle } from '../lib/periodization'
import type { WorkoutSession } from '../types'
import { formatWeight } from '../types'
import { Card, SectionTitle, EmptyState } from '../components/ui'

export function ProgressTab() {
  const { profile, plan, sessions } = useApp()

  const strength = useMemo(() => {
    if (!profile) return null
    return evaluateStrength(sessions, profile.sex, profile.weightKg)
  }, [profile, sessions])

  const cycleSessions = plan
    ? cycle(plan.scheme, plan.customWeekTypes, plan.customWeekPercents).length * Math.max(1, plan.days.length)
    : 1
  const ach = useMemo(() => achievements(sessions, cycleSessions), [sessions, cycleSessions])
  const completed = useMemo(() => sessions.filter((s) => s.isCompleted), [sessions])

  // Тоннаж последних 8 завершённых тренировок (для мини-графика)
  const tonnageHistory = useMemo(() => {
    return completed
      .slice(-8)
      .map((s) => ({ session: s, tonnage: s.setLogs.filter((l) => l.isCompleted).reduce((sum, l) => sum + l.actualWeightKg * l.actualReps, 0) }))
  }, [completed])

  const maxTonnage = Math.max(1, ...tonnageHistory.map((t) => t.tonnage))
  const totalTonnage = completed.reduce(
    (sum, s) => sum + s.setLogs.filter((l) => l.isCompleted).reduce((s2, l) => s2 + l.actualWeightKg * l.actualReps, 0),
    0,
  )

  return (
    <div className="h-full overflow-y-auto bg-bg safe-top">
      <div className="px-4 py-4 pb-28 max-w-md mx-auto space-y-3">
        <h1 className="font-display font-bold text-[24px]">Прогресс</h1>

        {/* Силовой индекс */}
        {strength ? (
          <Card className="p-4">
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#8b5cf6" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(strength.index / 100) * 213.6} 213.6`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display font-bold text-[20px]">{Math.round(strength.index)}</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[12px] text-text-secondary uppercase tracking-wide">Силовой индекс</div>
                <div className="font-display font-bold text-[14px] leading-snug">Сильнее {Math.round(strength.percentile)}% людей на планете</div>
                <div className="text-text-secondary text-[12px] mt-1">
                  {strength.usedBaseLifts ? 'По базовым движениям' : 'По самым тяжёлым упражнениям'} · масса {formatWeight(profile?.weightKg ?? 0)} кг
                </div>
              </div>
            </div>
            {strength.lifts.map((l) => (
              <div key={l.id} className="flex justify-between items-center mt-2.5 pt-2.5 border-t border-elevated">
                <span className="text-[13px] text-text-secondary">{l.title}</span>
                <span className="font-semibold text-[13px]">
                  {formatWeight(l.weight)} кг · DOTS {Math.round(l.dots)}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="p-4">
            <div className="text-text-secondary text-[13px]">
              Заверши тренировку с отягощениями — здесь появится силовой индекс
              (сила с поправкой на массу тела) и твой перцентиль в populации.
            </div>
          </Card>
        )}

        {/* Сводка тоннажа */}
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="p-3.5">
            <div className="text-[11px] text-text-secondary">Тренировок</div>
            <div className="font-display font-bold text-[22px]">{completed.length}</div>
          </Card>
          <Card className="p-3.5">
            <div className="text-[11px] text-text-secondary">Всего поднято</div>
            <div className="font-display font-bold text-[19px] tabular-nums">{formatWeight(Math.round(totalTonnage))} <span className="text-[13px]">кг</span></div>
            {bestMilestone(totalTonnage) && (
              <div className="text-[11px] text-text-secondary">{bestMilestone(totalTonnage)!.emoji} как {bestMilestone(totalTonnage)!.objectName}</div>
            )}
          </Card>
        </div>

        {/* Мини-график тоннажа */}
        {tonnageHistory.length > 1 && (
          <Card className="p-4">
            <SectionTitle>Тоннаж последних тренировок</SectionTitle>
            <div className="flex items-end gap-1.5 h-24">
              {tonnageHistory.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-[6px] bg-accent border-2 border-b-0 border-ink"
                    style={{ height: `${Math.max(4, (t.tonnage / maxTonnage) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-text-disabled mt-1">
              <span>{tonnageHistory[0].session.dayName.replace('День ', 'Д')}</span>
              <span>{tonnageHistory[tonnageHistory.length - 1].session.dayName.replace('День ', 'Д')}</span>
            </div>
          </Card>
        )}

        {/* Достижения */}
        <SectionTitle>Достижения</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {ach.map((a) => (
            <Card key={a.id} className={`p-3.5 ${a.isUnlocked ? '' : 'opacity-45'}`}>
              <div className="text-2xl">{a.isUnlocked ? a.emoji : '🔒'}</div>
              <div className="font-black text-[13px] mt-1">{a.title}</div>
              <div className="text-text-secondary text-[11px] leading-tight mt-0.5">{a.subtitle}</div>
            </Card>
          ))}
        </div>

        {/* История тренировок */}
        <SectionTitle>История</SectionTitle>
        {completed.length === 0 && <EmptyState emoji="📓" title="Пока пусто" subtitle="Заверши первую тренировку" />}
        {[...completed].reverse().slice(0, 30).map((s) => (
          <SessionRow key={s.id} session={s} />
        ))}
      </div>
    </div>
  )
}

function SessionRow({ session }: { session: WorkoutSession }) {
  const tonnage = session.setLogs.filter((l) => l.isCompleted).reduce((sum, l) => sum + l.actualWeightKg * l.actualReps, 0)
  const date = new Date(session.finishedAt ?? session.startedAt)
  const sets = session.setLogs.filter((l) => l.isCompleted).length
  return (
    <Card className="p-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-[14px]">{session.dayName}</div>
          <div className="text-text-secondary text-[11px] mt-0.5">
            {date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} · {sets} подходов
            {session.rpe != null && ` · RPE ${session.rpe}`}
          </div>
        </div>
        <div className="font-bold text-[14px] text-accent tabular-nums">{formatWeight(Math.round(tonnage))} кг</div>
      </div>
    </Card>
  )
}
