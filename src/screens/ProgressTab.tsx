// MARK: - Таб «Прогресс»: силовой индекс, перцентиль, история, достижения.
import { useMemo } from 'react'
import { useApp } from '../state/store'
import { evaluateStrength } from '../lib/strengthIndex'
import { achievements, bestMilestone } from '../lib/gamification'
import { cycle } from '../lib/periodization'
import type { WorkoutSession } from '../types'
import { formatWeight, WEEK_TYPE_COLORS, WEEK_TYPE_TITLES } from '../types'
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
        <h1 className="font-display font-medium text-[26px]">Прогресс</h1>

        {/* Силовой индекс */}
        {strength ? (
          <Card className="p-5">
            <div className="text-[14px] text-text-secondary">Силовой индекс</div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="font-display font-light text-[56px] leading-none tabular-nums">{Math.round(strength.index)}</span>
              <span className="font-display font-light text-[24px] text-text-secondary">/100</span>
            </div>
            <Gauge value={strength.index} />
            <div className="text-center text-[14px] text-text-secondary mt-4">
              Сильнее {Math.round(strength.percentile)}% людей на планете
            </div>
            <div className="text-center text-text-disabled text-[12px] mt-1">
              {strength.usedBaseLifts ? 'По базовым движениям' : 'По самым тяжёлым упражнениям'} · масса {formatWeight(profile?.weightKg ?? 0)} кг
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
          <Card className="p-4">
            <div className="text-[13px] text-text-secondary">Тренировок</div>
            <div className="font-display font-light text-[40px] leading-none mt-3 tabular-nums">{completed.length}</div>
          </Card>
          <div className="tile-raised rounded-[28px] p-4">
            <div className="text-[13px] text-text-secondary">Всего поднято</div>
            <div className="font-display font-light text-[30px] leading-none mt-3 tabular-nums">
              {formatWeight(Math.round(totalTonnage))}<span className="text-[15px] text-text-secondary ml-1">кг</span>
            </div>
            {bestMilestone(totalTonnage) && (
              <div className="text-[12px] text-text-secondary mt-2">{bestMilestone(totalTonnage)!.emoji} как {bestMilestone(totalTonnage)!.objectName}</div>
            )}
          </div>
        </div>

        {/* График тоннажа: цвет столбца — тип недели цикла */}
        {tonnageHistory.length > 1 && (
          <Card className="p-4">
            <div className="text-[14px] text-text-secondary mb-3">Тоннаж последних тренировок</div>
            <div className="flex gap-2 h-44">
              {tonnageHistory.map((t, i) => {
                const pct = Math.max(6, (t.tonnage / maxTonnage) * 100)
                return (
                  <div key={i} className="flex-1 min-w-0 flex flex-col gap-1.5" title={WEEK_TYPE_TITLES[t.session.weekLoadType]}>
                    <div className="flex-1 hatch rounded-[18px] overflow-hidden flex items-end">
                      <div className="w-full rounded-[18px] px-1.5 pt-2 text-center overflow-hidden"
                        style={{ height: `${pct}%`, background: WEEK_TYPE_COLORS[t.session.weekLoadType] ?? '#ffd02a' }}>
                        {pct > 22 && (
                          <span className="text-[11px] font-medium text-[#0a0a0a] tabular-nums">
                            {t.tonnage >= 1000 ? `${(t.tonnage / 1000).toFixed(1)}т` : Math.round(t.tonnage)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center text-[10px] text-text-secondary">{t.session.dayName.replace('День ', 'Д').split(' —')[0]}</div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Достижения */}
        <SectionTitle>Достижения</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5">
          {ach.map((a) => (
            <Card key={a.id} className={`p-3.5 ${a.isUnlocked ? '' : 'opacity-45'}`}>
              <div className="text-2xl">{a.isUnlocked ? a.emoji : '🔒'}</div>
              <div className="font-semibold text-[14px] mt-1">{a.title}</div>
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
        <div className="font-medium text-[15px] text-accent tabular-nums">{formatWeight(Math.round(tonnage))} кг</div>
      </div>
    </Card>
  )
}

// MARK: Полукруглая шкала: штриховая дорожка и зелёная дуга с «бегунком»
function Gauge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value))
  const R = 80
  const len = Math.PI * R
  const theta = Math.PI * (1 - v / 100)
  const kx = 100 + R * Math.cos(theta)
  const ky = 100 - R * Math.sin(theta)
  const arc = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`
  return (
    <svg viewBox="0 0 200 112" className="w-full max-w-[320px] mx-auto mt-3 overflow-visible" role="img" aria-label={`Индекс ${Math.round(v)} из 100`}>
      <defs>
        <pattern id="gauge-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
        </pattern>
      </defs>
      <path d={arc} fill="none" stroke="#131314" strokeWidth="22" strokeLinecap="round" />
      <path d={arc} fill="none" stroke="url(#gauge-hatch)" strokeWidth="22" strokeLinecap="round" />
      <path d={arc} fill="none" stroke="#4ecb8d" strokeWidth="22" strokeLinecap="round" strokeDasharray={`${(v / 100) * len} ${len}`} />
      <circle cx={kx} cy={ky} r="9" fill="#ffffff" />
    </svg>
  )
}
