// MARK: - Таб «Программа»: обзор плана, дни, редактирование упражнений дня.
import { useState } from 'react'
import { useApp } from '../state/store'
import { adjustedWeight, currentWeek, cycle } from '../lib/periodization'
import { exerciseById, exerciseImage } from '../lib/catalog'
import type { DayExercise, WorkoutDay } from '../types'
import { SCHEME_TITLES, WEEK_TYPE_COLORS, WEEK_TYPE_TITLES, formatWeight } from '../types'
import { Card, PrimaryButton, SecondaryButton, SectionTitle, Modal } from '../components/ui'
import { InfoIcon } from '../components/icons'
import { ExerciseInfoSheet } from '../components/ExerciseInfoSheet'
import { CatalogSheet } from '../components/CatalogSheet'

export function ProgramTab({ onEditDay }: { onEditDay: (dayOrderIndex: number) => void }) {
  const { plan, updatePlan } = useApp()
  if (!plan) return null
  const week = currentWeek(plan)
  const weeks = cycle(plan.scheme, plan.customWeekTypes, plan.customWeekPercents)

  return (
    <div className="h-full overflow-y-auto bg-bg safe-top">
      <div className="px-4 py-4 pb-28 max-w-md mx-auto space-y-3">
        <h1 className="font-display font-bold text-[24px]">Программа</h1>

        <Card className="p-4">
          <div className="font-bold text-[17px]">{plan.name}</div>
          <div className="text-text-secondary text-[13px] mt-0.5">Периодизация: {SCHEME_TITLES[plan.scheme]}</div>
          {/* Цикл: тап по неделе делает её текущей */}
          <div className="flex gap-1.5 mt-3">
            {weeks.map((w) => {
              const isCurrent = week && w.index === weeks.indexOf(week)
              return (
                <button key={w.index}
                  onClick={() => updatePlan({ ...plan, currentWeekIndex: w.index })}
                  title="Сделать текущей неделей"
                  className="flex-1 rounded-[10px] px-2 py-2 text-center transition-transform active:scale-95"
                  style={{
                    backgroundColor: isCurrent ? WEEK_TYPE_COLORS[w.type] : 'rgba(255,255,255,0.05)',
                    color: isCurrent ? '#0a0a0e' : '#9b9ba8',
                  }}>
                  <div className="text-[10px] font-semibold uppercase">{WEEK_TYPE_TITLES[w.type]}</div>
                  <div className="text-[11px] font-bold">{Math.round(w.percent * 100)}%</div>
                </button>
              )
            })}
          </div>
          <div className="text-text-disabled text-[11px] mt-2">
            Цикл повторяется · сейчас неделя {plan.currentWeekIndex + 1} · тапни неделю, чтобы переключить
          </div>
        </Card>

        <SectionTitle>Тренировочные дни</SectionTitle>
        {plan.days.map((day) => (
          <DayCard key={day.orderIndex} day={day} weekPercent={week?.percent ?? 1}
            onEdit={() => onEditDay(day.orderIndex)} />
        ))}

        <SecondaryButton onClick={() => onEditDay(-1)}>+ Новый день</SecondaryButton>
      </div>
    </div>
  )
}

function DayCard({ day, weekPercent, onEdit }: { day: WorkoutDay; weekPercent: number; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card className="overflow-hidden">
      <button className="w-full flex items-center justify-between p-4" onClick={() => setExpanded(!expanded)}>
        <div className="text-left">
          <div className="font-semibold text-[15px]">{day.name}</div>
          <div className="text-text-secondary text-[12px] mt-0.5">{day.exercises.length} упражнений</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-text-secondary text-[13px]">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5">
          {[...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex).map((item) => {
            const ex = exerciseById(item.exerciseID)
            const img = exerciseImage(item.exerciseID)
            const working = item.baseWeightKg > 0 ? adjustedWeight(item.baseWeightKg, weekPercent) : null
            return (
              <div key={item.exerciseID} className="flex items-center gap-2.5 py-1.5">
                {img && <img src={img} alt="" loading="lazy" className="w-9 h-9 rounded-[8px] object-cover bg-elevated" />}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{ex?.name ?? item.exerciseID}</div>
                  <div className="text-[11px] text-text-secondary">
                    {item.sets} × {item.repsMin}–{item.repsMax}
                    {working != null && <> · {formatWeight(working)} кг</>}
                    {item.baseWeightKg === 0 && <span className="text-text-disabled"> · вес не задан</span>}
                  </div>
                </div>
              </div>
            )
          })}
          <SecondaryButton className="mt-2" onClick={onEdit}>Изменить день</SecondaryButton>
        </div>
      )}
    </Card>
  )
}

// MARK: - Редактор дня
export function DayEdit({ dayOrderIndex, onBack }: { dayOrderIndex: number; onBack: () => void }) {
  const { plan, updatePlan } = useApp()
  const [pickerFor, setPickerFor] = useState<number | null>(null) // индекс упражнения для замены
  const [addOpen, setAddOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [infoId, setInfoId] = useState<string | null>(null)
  if (!plan) return null

  const isNew = dayOrderIndex < 0
  const day: WorkoutDay = isNew
    ? { name: `День ${plan.days.length + 1}`, orderIndex: plan.days.length, exercises: [] }
    : plan.days.find((d) => d.orderIndex === dayOrderIndex)!

  const commitDay = (updated: WorkoutDay) => {
    const days = isNew
      ? [...plan.days, updated]
      : plan.days.map((d) => (d.orderIndex === dayOrderIndex ? updated : d))
    updatePlan({ ...plan, days: days.map((d, i) => ({ ...d, orderIndex: i })) })
  }

  const patchExercise = (exerciseID: string, patch: Partial<DayExercise>) => {
    commitDay({
      ...day,
      exercises: day.exercises.map((e) => (e.exerciseID === exerciseID ? { ...e, ...patch } : e)),
    })
  }

  const replaceExercise = (oldId: string, newId: string) => {
    const ex = exerciseById(newId)
    if (!ex) return
    commitDay({
      ...day,
      exercises: day.exercises.map((e) =>
        e.exerciseID === oldId
          ? { ...e, exerciseID: ex.id, sets: e.sets || 3, repsMin: e.repsMin || ex.repsMin, repsMax: e.repsMax || ex.repsMax }
          : e),
    })
    setPickerFor(null)
  }

  const addExercise = (id: string) => {
    const ex = exerciseById(id)
    if (!ex || day.exercises.some((e) => e.exerciseID === id)) return
    commitDay({
      ...day,
      exercises: [...day.exercises, {
        exerciseID: ex.id, orderIndex: day.exercises.length,
        sets: 3, repsMin: ex.repsMin, repsMax: ex.repsMax,
        baseWeightKg: 0, targetWeightKg: 0, restSeconds: 90,
      }],
    })
    setAddOpen(false)
  }

  const removeExercise = (id: string) => {
    commitDay({ ...day, exercises: day.exercises.filter((e) => e.exerciseID !== id) })
  }

  const confirmDeleteDay = () => {
    updatePlan({
      ...plan,
      days: plan.days.filter((d) => d.orderIndex !== dayOrderIndex).map((d, i) => ({ ...d, orderIndex: i })),
    })
    onBack()
  }

  const week = currentWeek(plan)
  const weekPercent = week?.percent ?? 1

  return (
    <div className="h-full flex flex-col bg-bg safe-top safe-bottom">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-elevated">
        <button onClick={onBack} className="text-text-secondary text-lg">←</button>
        <input
          value={day.name}
          onChange={(e) => commitDay({ ...day, name: e.target.value })}
          className="flex-1 bg-transparent font-bold text-[17px] outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {day.exercises.length === 0 && (
          <div className="text-text-secondary text-center py-8 text-[14px]">День пуст — добавь упражнения</div>
        )}
        {[...day.exercises].sort((a, b) => a.orderIndex - b.orderIndex).map((item) => {
          const ex = exerciseById(item.exerciseID)
          const img = exerciseImage(item.exerciseID)
          const working = item.baseWeightKg > 0 ? adjustedWeight(item.baseWeightKg, weekPercent) : null
          return (
            <Card key={item.exerciseID} className="p-3">
              <div className="flex items-center gap-2.5">
                {img && <img src={img} alt="" loading="lazy" className="w-10 h-10 rounded-[8px] object-cover bg-elevated" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px] truncate">{ex?.name ?? item.exerciseID}</div>
                  <div className="text-[11px] text-text-secondary">
                    рабочий {formatWeight(item.baseWeightKg)} кг
                    {working != null && <> · на этой неделе {formatWeight(working)} кг</>}
                  </div>
                </div>
                <button onClick={() => setInfoId(item.exerciseID)}
                  aria-label="информация об упражнении"
                  className="text-text-disabled hover:text-text-secondary transition-colors px-1 py-1">
                  <InfoIcon />
                </button>
                <button onClick={() => setPickerFor(day.exercises.indexOf(item))}
                  className="text-[12px] text-accent font-medium px-2 py-1">Заменить</button>
                <button onClick={() => removeExercise(item.exerciseID)}
                  aria-label="удалить упражнение"
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-[10px] border border-white/20 bg-white/5 text-text-secondary text-[18px] leading-none active:scale-95 transition-transform">×</button>
              </div>
              {/* Параметры */}
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                <Param label="Подходы" value={item.sets}
                  onChange={(v) => patchExercise(item.exerciseID, { sets: Math.max(1, Math.min(10, Math.round(v))) })} />
                <Param label="От" value={item.repsMin}
                  onChange={(v) => patchExercise(item.exerciseID, { repsMin: Math.max(1, Math.min(30, Math.round(v))) })} />
                <Param label="До" value={item.repsMax}
                  onChange={(v) => patchExercise(item.exerciseID, { repsMax: Math.max(1, Math.min(50, Math.round(v))) })} />
                <Param label="Вес, кг" value={item.baseWeightKg} step={2.5}
                  onChange={(v) => patchExercise(item.exerciseID, { baseWeightKg: Math.max(0, v) })} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Param label="Цель, кг (0 — нет)" value={item.targetWeightKg} step={2.5}
                  onChange={(v) => patchExercise(item.exerciseID, { targetWeightKg: Math.max(0, v) })} />
                <Param label="Отдых, сек" value={item.restSeconds} step={15}
                  onChange={(v) => patchExercise(item.exerciseID, { restSeconds: Math.max(0, Math.round(v)) })} />
              </div>
            </Card>
          )
        })}
        <SecondaryButton onClick={() => setAddOpen(true)}>+ Добавить упражнение</SecondaryButton>
        {!isNew && (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full py-2 text-[13px] font-semibold text-heavy">
            Удалить тренировку
          </button>
        )}
      </div>
      <div className="px-4 py-3 border-t border-elevated">
        <PrimaryButton onClick={onBack}>Готово</PrimaryButton>
      </div>

      {/* Подтверждение удаления тренировки */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)}>
          <h3 className="font-bold text-[17px] text-center mb-2">Удалить тренировку?</h3>
          <p className="text-text-secondary text-[14px] text-center mb-4">
            «{day.name}» и её упражнения будут удалены из программы.
          </p>
          <PrimaryButton onClick={confirmDeleteDay}>Удалить</PrimaryButton>
          <div className="h-2" />
          <SecondaryButton onClick={() => setConfirmDelete(false)}>Отмена</SecondaryButton>
        </Modal>
      )}

      {/* Пикер: добавление или замена (каталог с поиском и фильтрами по мышцам) */}
      {(addOpen || pickerFor !== null) && (
        <CatalogSheet
          title={pickerFor !== null ? 'Заменить упражнение' : 'Добавить упражнение'}
          exclude={day.exercises.map((e) => e.exerciseID)}
          onPick={(id) => (pickerFor !== null ? replaceExercise(day.exercises[pickerFor].exerciseID, id) : addExercise(id))}
          onClose={() => { setAddOpen(false); setPickerFor(null) }}
        />
      )}

      {/* Карточка упражнения: фото с анимацией + техника */}
      {infoId && <ExerciseInfoSheet exerciseId={infoId} onClose={() => setInfoId(null)} />}
    </div>
  )
}

function Param({ label, value, onChange, step = 1 }: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div className="bg-elevated/60 rounded-[10px] px-2 py-1.5 text-center">
      <div className="text-[10px] text-text-secondary leading-tight">{label}</div>
      <div className="flex items-center justify-center gap-1">
        <button className="text-text-secondary w-5" onClick={() => onChange(value - step)}>−</button>
        <span className="font-semibold text-[14px] tabular-nums w-12 text-center">
          {Number.isInteger(value) ? value : value.toFixed(1)}
        </span>
        <button className="text-text-secondary w-5" onClick={() => onChange(value + step)}>+</button>
      </div>
    </div>
  )
}
