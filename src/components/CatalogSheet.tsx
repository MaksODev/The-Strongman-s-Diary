// MARK: - Каталог упражнений шитом: поиск, фильтры, сетка карточек.
// Используется при добавлении упражнений в день и в свободную тренировку.
import { useMemo, useState } from 'react'
import { CATALOG, exerciseImage } from '../lib/catalog'
import type { Difficulty, Equipment, Exercise, MuscleGroup } from '../types'
import { DIFFICULTY_TITLES, EQUIPMENT_TITLES, MUSCLE_TITLES } from '../types'
import { Chip, EmptyState, PrimaryButton, SecondaryButton } from './ui'
import { ExerciseInfoSheet } from './ExerciseInfoSheet'

export function CatalogSheet({ title = 'Каталог упражнений', exclude, onPick, multi, onClose }: {
  title?: string
  exclude?: string[]
  /** Режим одиночного выбора: «+» сразу вызывает onPick */
  onPick?: (id: string) => void
  /** Режим множественного выбора: «+» отмечает упражнение, снизу — подтверждение или отмена */
  multi?: { confirmLabel: string; onConfirm: (ids: string[]) => void }
  onClose: () => void
}) {
  const [infoId, setInfoId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const choose = (id: string) => (multi ? toggle(id) : onPick?.(id))
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const excluded = new Set(exclude ?? [])
    return CATALOG.filter((e) => {
      if (excluded.has(e.id)) return false
      if (q && !e.name.toLowerCase().includes(q)) return false
      if (muscle && !e.primaryMuscles.includes(muscle)) return false
      if (equipment && !e.equipment.includes(equipment)) return false
      if (difficulty && e.difficulty !== difficulty) return false
      return true
    })
  }, [query, muscle, equipment, difficulty, exclude])

  return (
    <div className="fixed inset-x-0 top-0 bg-bg z-40 flex flex-col safe-top safe-bottom" style={{ height: 'var(--app-h, 100%)' }}>
      {/* Шапка */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <h2 className="font-display font-bold text-[19px] flex-1">{title}</h2>
        <button onClick={onClose} aria-label="закрыть каталог"
          className="w-9 h-9 rounded-full bg-elevated border border-white/10 text-text-secondary text-[18px] flex items-center justify-center">
          ×
        </button>
      </div>
      <div className="px-4 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск упражнения…"
          className="w-full bg-elevated border border-white/10 rounded-[14px] px-4 py-3 text-ink font-semibold outline-none focus:ring-2 ring-accent/60"
        />
      </div>

      {/* Фильтры */}
      <div className="px-4 pb-2 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <Chip active={muscle === null} onClick={() => setMuscle(null)}>Все мышцы</Chip>
          {(Object.keys(MUSCLE_TITLES) as MuscleGroup[]).map((m) => (
            <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
              {MUSCLE_TITLES[m]}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <Chip active={equipment === null} onClick={() => setEquipment(null)}>Любое</Chip>
          {(Object.keys(EQUIPMENT_TITLES) as Equipment[]).map((eq) => (
            <Chip key={eq} active={equipment === eq} onClick={() => setEquipment(equipment === eq ? null : eq)}>
              {EQUIPMENT_TITLES[eq]}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <Chip active={difficulty === null} onClick={() => setDifficulty(null)}>Любой уровень</Chip>
          {(Object.keys(DIFFICULTY_TITLES) as Difficulty[]).map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
              {DIFFICULTY_TITLES[d]}
            </Chip>
          ))}
        </div>
      </div>

      {/* Сетка */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-6">
        <div className="text-text-secondary text-[12px] mb-2">{filtered.length} упражнений · тап — описание, «+» — {multi ? 'отметить' : 'добавить'}</div>
        {filtered.length === 0 && <EmptyState emoji="🔍" title="Ничего не найдено" subtitle="Попробуй изменить фильтры" />}
        <div className="grid grid-cols-2 gap-2.5">
          {filtered.map((e) => (
            <div key={e.id} className="relative">
              <ExerciseCard exercise={e} onClick={() => setInfoId(e.id)} />
              {selected.includes(e.id) ? (
                <button
                  onClick={() => toggle(e.id)}
                  aria-label={`убрать ${e.name}`}
                  className="btn-brutal absolute top-2 right-2 w-8 h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center"
                  style={{ boxShadow: '0 6px 16px rgba(34,197,94,0.4)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                </button>
              ) : (
                <button
                  onClick={() => choose(e.id)}
                  aria-label={`добавить ${e.name}`}
                  className="btn-brutal btn-flash absolute top-2 right-2 w-8 h-8 rounded-full text-[20px] font-bold leading-none flex items-center justify-center"
                >
                  +
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {multi && (
        <div className="px-4 py-3 border-t border-elevated flex gap-2">
          <SecondaryButton className="!w-auto px-5" onClick={onClose}>Отменить</SecondaryButton>
          <PrimaryButton disabled={selected.length === 0} onClick={() => multi.onConfirm(selected)}>
            {multi.confirmLabel}{selected.length > 0 ? ` (${selected.length})` : ''}
          </PrimaryButton>
        </div>
      )}

      {infoId && (
        <ExerciseInfoSheet
          exerciseId={infoId}
          onClose={() => setInfoId(null)}
          addLabel={multi ? (selected.includes(infoId) ? 'Убрать из выбранных' : 'Отметить') : undefined}
          onAdd={() => { const id = infoId; setInfoId(null); choose(id) }}
        />
      )}
    </div>
  )
}

function ExerciseCard({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const img = exerciseImage(exercise.id)
  return (
    <button onClick={onClick} className="w-full text-left">
      <div className="tile-glass rounded-[16px] overflow-hidden active:ring-1 ring-accent h-full">
        {img && (
          <img src={img} alt={exercise.name} loading="lazy"
            className="w-full aspect-[3/2] object-cover bg-elevated" />
        )}
        <div className="p-2.5">
          <div className="font-semibold text-[13px] leading-tight line-clamp-2">{exercise.name}</div>
          <div className="text-text-secondary text-[11px] mt-1">
            {exercise.primaryMuscles.map((m) => MUSCLE_TITLES[m]).join(', ')}
          </div>
        </div>
      </div>
    </button>
  )
}
