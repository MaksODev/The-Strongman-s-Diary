// MARK: - Активная тренировка: лог подходов, рекорды, тоннажные вехи, RPE.
// Порт ActiveWorkoutView + связанных движков нативного приложения.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SetLog, WorkoutDay, WorkoutPlan, WorkoutSession } from '../types'
import { useApp, type DraftItem, type DraftWorkout } from '../state/store'
import { exerciseById, exerciseImage } from '../lib/catalog'
import { adjustedWeight, currentWeek } from '../lib/periodization'
import { lastKnownSets } from '../lib/prefill'
import { RecordsBook, recordHeadline, recordDetail, type RecordEvent } from '../lib/records'
import { bestMilestone, reachedMilestones, type TonnageMilestone } from '../lib/gamification'
import { rpeLabel } from '../lib/rpe'
import { uid } from '../lib/storage'
import { formatWeight } from '../types'
import { PrimaryButton, SecondaryButton, Card, EmptyState, Modal } from '../components/ui'
import { CatalogSheet } from '../components/CatalogSheet'
import { ExerciseInfoSheet } from '../components/ExerciseInfoSheet'
import { InfoIcon } from '../components/icons'

// MARK: Запуск тренировки
export function startPlannedWorkout(plan: WorkoutPlan, day: WorkoutDay, sessions: WorkoutSession[]): DraftWorkout {
  const week = currentWeek(plan)!
  const prefill = lastKnownSets(sessions)
  const items: DraftItem[] = [...day.exercises]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => {
      const ex = exerciseById(item.exerciseID)
      const last = prefill.get(item.exerciseID)
      const planned = item.baseWeightKg > 0 ? adjustedWeight(item.baseWeightKg, week.percent) : last?.weight ?? 0
      return {
        exerciseID: item.exerciseID,
        exerciseName: ex?.name ?? item.exerciseID,
        sets: item.sets,
        repsMin: item.repsMin,
        repsMax: item.repsMax,
        baseWeightKg: item.baseWeightKg,
        targetWeightKg: item.targetWeightKg,
        plannedWeightKg: planned,
        restSeconds: item.restSeconds,
      }
    })
  return {
    id: uid(),
    startedAt: new Date().toISOString(),
    planName: plan.name,
    dayName: day.name,
    weekIndex: plan.currentWeekIndex,
    weekLoadType: week.type,
    isFree: false,
    dayOrderIndex: day.orderIndex,
    items,
    logs: {},
    currentExerciseIdx: 0,
  }
}

export function startFreeWorkout(): DraftWorkout {
  const week: { type: WorkoutSession['weekLoadType']; index: number } = { type: 'heavy', index: 0 }
  return {
    id: uid(),
    startedAt: new Date().toISOString(),
    planName: 'Свободная тренировка',
    dayName: 'Свободная тренировка',
    weekIndex: week.index,
    weekLoadType: week.type,
    isFree: true,
    dayOrderIndex: 0,
    items: [],
    logs: {},
    currentExerciseIdx: 0,
  }
}

function addFreeExercise(draft: DraftWorkout, exerciseID: string): DraftWorkout {
  const ex = exerciseById(exerciseID)
  if (!ex || draft.items.some((i) => i.exerciseID === exerciseID)) return draft
  const item: DraftItem = {
    exerciseID: ex.id,
    exerciseName: ex.name,
    sets: 3,
    repsMin: ex.repsMin,
    repsMax: ex.repsMax,
    baseWeightKg: 0,
    targetWeightKg: 0,
    plannedWeightKg: 0,
    restSeconds: 90,
  }
  return { ...draft, items: [...draft.items, item] }
}

// MARK: Экран тренировки
interface Celebration {
  id: string
  emoji: string
  title: string
  detail: string
}

export interface WorkoutResult {
  session: WorkoutSession
  tonnage: number
  milestone: TonnageMilestone | null
  recordEvents: RecordEvent[]
  progressionLines: string[]
  rpeMessages: string[]
  weekAdvanced: boolean
  weekNumber: number | null
  isFree: boolean
  dayOrderIndex: number
}

export function ActiveWorkout({ draft, onFinish, onAbort }: {
  draft: DraftWorkout
  onFinish: (result: WorkoutResult) => void
  onAbort: () => void
}) {
  const { sessions, saveDraft } = useApp()
  const [workout, setWorkout] = useState<DraftWorkout>(draft)
  const [celebrations, setCelebrations] = useState<Celebration[]>([])
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showRPE, setShowRPE] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [weightCapWarned, setWeightCapWarned] = useState(false)
  // Сколько тоннажных вех уже показано за тренировку
  const shownMilestones = useRef(0)
  const books = useMemo(() => RecordsBook.fromSessions(sessions), [sessions])

  const completedLogs = useMemo(
    () => Object.values(workout.logs).flat().filter((l) => l.isCompleted),
    [workout.logs],
  )
  const tonnage = useMemo(
    () => completedLogs.reduce((sum, l) => sum + l.actualWeightKg * l.actualReps, 0),
    [completedLogs],
  )

  const pushCelebration = (c: Omit<Celebration, 'id'>) => {
    const id = uid()
    setCelebrations((prev) => [...prev, { ...c, id }])
    setTimeout(() => setCelebrations((prev) => prev.filter((x) => x.id !== id)), 2600)
  }

  const setLog = (exerciseID: string, setIndex: number, patch: Partial<SetLog>, exerciseName: string, exerciseFinished: boolean) => {
    setWorkout((prev) => {
      const item = prev.items.find((i) => i.exerciseID === exerciseID)
      const logs = { ...prev.logs }
      const list = [...(logs[exerciseID] ?? [])]
      const idx = list.findIndex((l) => l.setIndex === setIndex)
      const existing = idx >= 0 ? list[idx] : null
      // Дефолты нового подхода — из плана дня (как показывает интерфейс),
      // иначе первый ввод веса создавал подход с нулевыми повторами.
      const defaultReps = item && item.repsMax > 0 ? item.repsMax : 10
      const updated: SetLog = {
        exerciseID,
        exerciseName,
        setIndex,
        plannedWeightKg: item?.plannedWeightKg ?? 0,
        plannedReps: defaultReps,
        actualWeightKg: item?.plannedWeightKg ?? 0,
        actualReps: defaultReps,
        isCompleted: false,
        ...existing,
        ...patch,
      }
      if (idx >= 0) list[idx] = updated
      else list.push(updated)
      logs[exerciseID] = list

      // Рекорды и тоннажные вехи — только при отметке подхода выполненным
      if (patch.isCompleted === true && (!existing || !existing.isCompleted)) {
        const exerciseTonnage = list.filter((l) => l.isCompleted).reduce((s, l) => s + l.actualWeightKg * l.actualReps, 0)
        const sessionTonnage = Object.values(logs).flat().filter((l) => l.isCompleted).reduce((s, l) => s + l.actualWeightKg * l.actualReps, 0)
        const events = books.check({
          exerciseID, exerciseName,
          weight: updated.actualWeightKg,
          reps: updated.actualReps,
          exerciseTonnage,
          exerciseFinished: exerciseFinished || list.filter((l) => l.isCompleted).length >= (item?.sets ?? list.length),
          sessionTonnage,
        })
        for (const e of events) {
          pushCelebration({ emoji: '🏆', title: recordHeadline(e), detail: recordDetail(e) })
        }
        // Тоннажная веха пересечена?
        const reached = reachedMilestones(sessionTonnage).length
        if (reached > shownMilestones.current) {
          const m = reachedMilestones(sessionTonnage)[reached - 1]
          shownMilestones.current = reached
          pushCelebration({ emoji: m.emoji, title: m.phrase, detail: `Тоннаж тренировки: ${formatWeight(Math.round(sessionTonnage))} кг` })
        }
        if (sessionTonnage > 1500 && !weightCapWarned) setWeightCapWarned(true)
      }
      const next = { ...prev, logs }
      saveDraft(next)
      return next
    })
  }

  const finishWorkout = (rpe: number | null) => {
    const finishedAt = new Date().toISOString()
    const allLogs = Object.values(workout.logs).flat()
    const session: WorkoutSession = {
      id: workout.id,
      startedAt: workout.startedAt,
      finishedAt,
      planName: workout.planName,
      dayName: workout.dayName,
      weekIndex: workout.weekIndex,
      weekLoadType: workout.weekLoadType,
      isCompleted: true,
      rpe,
      setLogs: allLogs,
    }
    const result: WorkoutResult = {
      session,
      tonnage,
      milestone: bestMilestone(tonnage),
      recordEvents: [],
      progressionLines: [],
      rpeMessages: [],
      weekAdvanced: false,
      weekNumber: null,
      isFree: workout.isFree,
      dayOrderIndex: workout.dayOrderIndex,
    }
    onFinish(result) // App применит прогрессию, RPE-фидбек и переход недели
  }

  const confirmFinish = () => {
    setShowFinishConfirm(false)
    setShowRPE(true)
  }

  const nextPendingIdx = workout.items.findIndex((item) => {
    const done = (workout.logs[item.exerciseID] ?? []).filter((l) => l.isCompleted).length
    return done < item.sets
  })

  return (
    <div className="h-full flex flex-col bg-bg safe-top safe-bottom">
      {/* Шапка */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-elevated">
        <div>
          <div className="text-[11px] text-text-secondary uppercase tracking-wide">Тренировка</div>
          <div className="font-bold text-[16px] leading-tight">{workout.dayName}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-text-secondary">Тоннаж</div>
          <div className="font-bold text-accent text-[16px] tabular-nums">{formatWeight(Math.round(tonnage))} кг</div>
        </div>
      </div>

      {/* Список упражнений */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {workout.items.length === 0 && (
          <EmptyState emoji="🏋️" title="Добавь первое упражнение" subtitle="Нажми «+ Упражнение» ниже" />
        )}
        {workout.items.map((item, idx) => (
          <ExerciseBlock
            key={item.exerciseID}
            item={item}
            logs={workout.logs[item.exerciseID] ?? []}
            isCurrent={idx === workout.currentExerciseIdx}
            onFocus={() => setWorkout((p) => ({ ...p, currentExerciseIdx: idx }))}
            onSetLog={(setIndex, patch, exerciseFinished) => setLog(item.exerciseID, setIndex, patch, item.exerciseName, exerciseFinished)}
            onRemove={workout.isFree ? () => {
              setWorkout((p) => {
                const logs = { ...p.logs }
                delete logs[item.exerciseID]
                const next = { ...p, items: p.items.filter((x) => x.exerciseID !== item.exerciseID), logs }
                saveDraft(next)
                return next
              })
            } : undefined}
          />
        ))}
      </div>

      {/* Нижняя панель */}
      <div className="px-4 py-3 border-t border-elevated space-y-2">
        {workout.isFree && (
          <SecondaryButton onClick={() => setPickerOpen(true)}>+ Упражнение</SecondaryButton>
        )}
        <div className="flex gap-2">
          <SecondaryButton className="!w-auto px-5" onClick={onAbort}>Отменить</SecondaryButton>
          <PrimaryButton onClick={() => setShowFinishConfirm(true)}>Завершить</PrimaryButton>
        </div>
        {nextPendingIdx >= 0 && nextPendingIdx !== workout.currentExerciseIdx && (
          <button className="w-full text-accent text-[14px] font-medium py-1"
            onClick={() => setWorkout((p) => ({ ...p, currentExerciseIdx: nextPendingIdx }))}>
            К следующему упражнению ↓
          </button>
        )}
      </div>

      {/* Каталог упражнений для свободной тренировки */}
      {pickerOpen && (
        <CatalogSheet
          title="Добавить упражнение"
          exclude={workout.items.map((i) => i.exerciseID)}
          onPick={(id) => {
            setWorkout((p) => {
              const next = addFreeExercise(p, id)
              saveDraft(next)
              return next
            })
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Подтверждение завершения */}
      {showFinishConfirm && (
        <Modal onClose={() => setShowFinishConfirm(false)}>
          <div className="text-center">
            <div className="text-4xl mb-2">🏁</div>
            <h3 className="font-bold text-[18px] mb-1">Завершить тренировку?</h3>
            <p className="text-text-secondary text-[14px] mb-4">
              Выполнено подходов: {completedLogs.length} · Тоннаж: {formatWeight(Math.round(tonnage))} кг
            </p>
            <PrimaryButton onClick={confirmFinish}>Завершить</PrimaryButton>
            <div className="h-2" />
            <SecondaryButton onClick={() => setShowFinishConfirm(false)}>Продолжить тренировку</SecondaryButton>
          </div>
        </Modal>
      )}

      {/* Оценка RPE */}
      {showRPE && (
        <Modal onClose={() => finishWorkout(null)}>
          <h3 className="font-bold text-[18px] text-center mb-1">Насколько тяжёлой была тренировка?</h3>
          <p className="text-text-secondary text-[13px] text-center mb-4">
            Оценка поможет подстроить программу: тяжёлые тренировки снизят веса, лёгкие — ускорят прогрессию.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <button key={v} onClick={() => finishWorkout(v)}
                className="btn-brutal py-3 rounded-[14px] bg-card border-2 border-ink shadow-brutal-sm">
                <div className="font-bold text-[18px]">{v}</div>
                <div className="text-[11px] text-text-secondary">{rpeLabel(v)}</div>
              </button>
            ))}
          </div>
          <button className="w-full text-text-secondary text-[14px] py-2" onClick={() => finishWorkout(null)}>
            Пропустить оценку
          </button>
        </Modal>
      )}

      {/* Праздничные плашки (рекорды + вехи тоннажа) */}
      {celebrations.length > 0 && (
        <div className="fixed left-4 right-4 top-16 z-50 space-y-2 pointer-events-none">
          {celebrations.map((c) => (
            <div key={c.id} className="animate-pop-in bg-card border-2 border-ink rounded-[16px] px-4 py-3 flex items-center gap-3 shadow-brutal">
              <div className="text-3xl animate-float">{c.emoji}</div>
              <div>
                <div className="font-black text-[15px]">{c.title}</div>
                <div className="text-text-secondary text-[12px] font-bold">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// MARK: Блок одного упражнения
function ExerciseBlock({ item, logs, isCurrent, onFocus, onSetLog, onRemove }: {
  item: DraftItem
  logs: SetLog[]
  isCurrent: boolean
  onFocus: () => void
  onSetLog: (setIndex: number, patch: Partial<SetLog>, exerciseFinished: boolean) => void
  onRemove?: () => void
}) {
  const img = exerciseImage(item.exerciseID)
  const completedCount = logs.filter((l) => l.isCompleted).length
  const allDone = item.sets > 0 && completedCount >= item.sets
  const [infoOpen, setInfoOpen] = useState(false)

  const getLog = (setIndex: number): SetLog => {
    const existing = logs.find((l) => l.setIndex === setIndex)
    if (existing) return existing
    const plannedReps = item.repsMax > 0 ? item.repsMax : 10
    return {
      exerciseID: item.exerciseID,
      exerciseName: item.exerciseName,
      setIndex,
      plannedWeightKg: item.plannedWeightKg,
      plannedReps,
      actualWeightKg: item.plannedWeightKg,
      actualReps: plannedReps,
      isCompleted: false,
    }
  }

  return (
    <Card className={`overflow-hidden ${isCurrent ? '' : ''} ${allDone ? 'opacity-70' : ''}`}>
      <button className="w-full flex items-center gap-3 p-3 text-left" onClick={onFocus}>
        {img && (
          <img src={img} alt="" loading="lazy" className="w-14 h-14 rounded-[12px] object-cover bg-elevated border-2 border-ink" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px] leading-tight truncate">{item.exerciseName}</div>
          <div className="text-text-secondary text-[12px] mt-0.5">
            {item.sets} × {item.repsMin}–{item.repsMax}
            {item.plannedWeightKg > 0 && <> · план {formatWeight(item.plannedWeightKg)} кг</>}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[13px] font-semibold ${allDone ? 'text-accent' : 'text-text-secondary'}`}>
            {completedCount}/{item.sets}
          </div>
          <div className="flex items-center justify-end gap-0.5">
            <span role="button" tabIndex={0}
              aria-label="информация об упражнении"
              className="text-text-disabled hover:text-text-secondary transition-colors px-1"
              onClick={(e) => { e.stopPropagation(); setInfoOpen(true) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setInfoOpen(true) } }}>
              <InfoIcon />
            </span>
            {onRemove && (
              <span role="button" tabIndex={0} className="text-text-disabled text-[18px] px-1"
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onRemove() } }}>×</span>
            )}
          </div>
        </div>
      </button>
      {infoOpen && <ExerciseInfoSheet exerciseId={item.exerciseID} onClose={() => setInfoOpen(false)} />}
      {isCurrent && (
        <div className="px-3 pb-3 space-y-1.5">
          {Array.from({ length: item.sets }, (_, i) => i + 1).map((setIndex) => {
            const log = getLog(setIndex)
            return (
              <SetRow
                key={`${item.exerciseID}-${setIndex}-${log.isCompleted}`}
                setIndex={setIndex}
                log={log}
                repsRange={`${item.repsMin}–${item.repsMax}`}
                lastSet={setIndex > 1 ? getLog(setIndex - 1) : null}
                onChange={(patch) => onSetLog(setIndex, patch, false)}
              />
            )
          })}
        </div>
      )}
    </Card>
  )
}

// MARK: Строка подхода
function SetRow({ setIndex, log, repsRange, lastSet, onChange }: {
  setIndex: number
  log: SetLog
  repsRange: string
  lastSet: SetLog | null
  onChange: (patch: Partial<SetLog>) => void
}) {
  // Пустой подход предзаполняем «как в прошлый раз» (предыдущий подход этого упражнения)
  const effective = { ...log }
  if (!effective.isCompleted && lastSet && effective.actualWeightKg === 0 && effective.actualReps === 0) {
    effective.actualWeightKg = lastSet.actualWeightKg
    effective.actualReps = lastSet.actualReps
  }

  const toggle = () => {
    const completing = !effective.isCompleted
    onChange({
      isCompleted: completing,
      // При отметке копируем значения последнего подхода, если текущие нулевые
      actualWeightKg: completing && effective.actualWeightKg === 0 ? lastSet?.actualWeightKg ?? 0 : effective.actualWeightKg,
      actualReps: completing && effective.actualReps === 0 ? lastSet?.actualReps ?? 0 : effective.actualReps,
    })
  }

  return (
    <div className={`rounded-[16px] border p-2 space-y-1 ${effective.isCompleted ? 'bg-accent/15 border-accent/40' : 'bg-card/60 border-white/5'}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          aria-label={effective.isCompleted ? 'снять отметку' : 'отметить выполненным'}
          className={`w-8 h-8 rounded-[10px] border flex items-center justify-center shrink-0 transition-colors
            ${effective.isCompleted ? 'bg-accent border-transparent' : 'bg-elevated border-white/15'}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: effective.isCompleted ? 1 : 0, transition: 'opacity 0.15s ease' }}>
            <path d="M4.5 12.5l5 5 10-11" />
          </svg>
        </button>
        <div className="w-4 text-text-secondary text-[13px] font-semibold text-center shrink-0">{setIndex}</div>
        <WeightScale
          value={effective.actualWeightKg}
          planned={log.plannedWeightKg}
          onChange={(v) => onChange({ actualWeightKg: v })}
        />
        <RepsPill value={effective.actualReps} onChange={(v) => onChange({ actualReps: v })} />
      </div>
      <div className="flex justify-between items-center pl-14 pr-1">
        <span className="text-[10px] text-text-disabled">{repsRange} повт.</span>
        {log.plannedWeightKg > 0 && (
          <span className="text-[10px] text-text-disabled">план {formatWeight(log.plannedWeightKg)} кг</span>
        )}
      </div>
    </div>
  )
}

// MARK: Весовая шкала-линейка: тяни пальцем или тапай для прыжка.
// Тап по центральному числу — точный ввод с клавиатуры.
function WeightScale({ value, planned, onChange }: {
  value: number
  planned?: number
  onChange: (v: number) => void
}) {
  const STEP = 2.5
  const MIN = 0
  const MAX = 400
  const SPAN = 40 // сколько кг видно на ленте одновременно
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(240)
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const measure = () => {
      if (ref.current) setWidth(ref.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const pxPerKg = width / SPAN
  const clampSnap = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v / STEP) * STEP))

  const drag = useRef<{ startX: number; startVal: number; moved: boolean } | null>(null)
  const valueBtnRef = useRef<HTMLButtonElement>(null)
  const lastDragMoved = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return
    // В некоторых окружениях (headless, stylus) захват указателя недоступен — не критично
    try { ref.current?.setPointerCapture(e.pointerId) } catch { /* noop */ }
    drag.current = { startX: e.clientX, startVal: valueRef.current, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 4) d.moved = true
    if (d.moved) onChange(clampSnap(d.startVal + dx / pxPerKg))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    lastDragMoved.current = d.moved
    if (!d.moved && ref.current) {
      // Тап по центральной кнопке значения — там откроется редактор (onClick), прыжок не нужен
      const btn = valueBtnRef.current?.getBoundingClientRect()
      const onValueBtn = btn && e.clientX >= btn.left - 8 && e.clientX <= btn.right + 8
      // NB: setPointerCapture перенаправляет click на контейнер, поэтому редактор
      // открываем здесь, а не по onClick кнопки.
      if (onValueBtn) {
        setDraftText(formatWeight(valueRef.current))
        setEditing(true)
        return
      }
      // Тап: прыжок к точке касания относительно центра
      const rect = ref.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      onChange(clampSnap(valueRef.current + (x - width / 2) / pxPerKg))
    }
  }

  // Риски вокруг текущего значения
  const first = Math.max(MIN, Math.floor((value - SPAN / 2) / STEP) * STEP)
  const ticks: number[] = []
  for (let v = first; v <= Math.min(MAX, value + SPAN / 2); v += STEP) ticks.push(v)

  const commitText = () => {
    const v = parseFloat(draftText.replace(',', '.'))
    if (!isNaN(v) && v >= MIN) onChange(clampSnap(v))
    setEditing(false)
  }

  return (
    <div ref={ref}
      className="relative flex-1 min-w-0 h-11 rounded-[14px] bg-elevated border border-white/10 overflow-hidden touch-none select-none cursor-ew-resize"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { drag.current = null }}>
      {/* Риски ленты */}
      {ticks.map((v) => {
        const offset = (v - value) * pxPerKg
        const major = v % 10 === 0
        return (
          <div key={v} className="absolute bottom-0 pointer-events-none" style={{ left: `calc(50% + ${offset}px)` }}>
            <div className={`w-px mx-auto ${major ? 'h-2.5 bg-white/35' : 'h-1.5 bg-white/15'}`} />
            {major && (
              <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-1 text-[8px] font-semibold text-text-disabled whitespace-nowrap">
                {v}
              </div>
            )}
          </div>
        )
      })}
      {/* Маркер плана */}
      {planned != null && planned > 0 && Math.abs(planned - value) < SPAN / 2 && (
        <div className="absolute bottom-0 pointer-events-none" style={{ left: `calc(50% + ${(planned - value) * pxPerKg}px)` }}>
          <div className="w-[3px] h-2 rounded-full bg-flash -translate-x-1/2" />
        </div>
      )}
      {/* Затемнение краёв */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-elevated to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-elevated to-transparent pointer-events-none" />
      {/* Центральное риско-указатель */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] h-2.5 bg-accent rounded-b pointer-events-none" />
      {/* Число по центру */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {editing ? (
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={draftText}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-16 bg-transparent text-center text-ink font-digits text-[16px] outline-none pointer-events-auto"
          />
        ) : (
          <button
            ref={valueBtnRef}
            onClick={() => {
              // Клик после перетаскивания (жест начался на кнопке) не открывает редактор
              if (lastDragMoved.current) return
              setDraftText(formatWeight(value))
              setEditing(true)
            }}
            className="pointer-events-auto font-digits text-[16px] text-ink bg-elevated/90 px-1.5 rounded-md"
            aria-label="ввести вес вручную"
          >{formatWeight(value)}</button>
        )}
        <span className="text-text-secondary text-[10px] ml-0.5 mt-0.5">кг</span>
      </div>
    </div>
  )
}

// MARK: Компактная пилюля повторов: − число +, тап по числу — ввод.
function RepsPill({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)))
  const commitText = () => {
    const v = parseFloat(draftText.replace(',', '.'))
    if (!isNaN(v)) onChange(clamp(v))
    setEditing(false)
  }
  return (
    <div className="flex items-center bg-elevated border border-white/10 rounded-[14px] h-11 shrink-0">
      <button className="w-7 h-full rounded-l-[14px] text-text-secondary text-[16px] font-bold active:text-ink" aria-label="минус повтор"
        onClick={() => onChange(clamp(value - 1))}>−</button>
      {editing ? (
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-9 bg-transparent text-center text-ink font-digits text-[15px] outline-none"
        />
      ) : (
        <button className="w-9 text-center text-ink font-digits text-[15px]" aria-label="ввести повторы вручную"
          onClick={() => { setDraftText(String(value)); setEditing(true) }}>{value}</button>
      )}
      <button className="w-7 h-full rounded-r-[14px] text-text-secondary text-[16px] font-bold active:text-ink" aria-label="плюс повтор"
        onClick={() => onChange(clamp(value + 1))}>+</button>
    </div>
  )
}
