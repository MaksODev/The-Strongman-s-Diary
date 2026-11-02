// MARK: - Каталог упражнений: поиск, фильтры, карточка упражнения
import { useMemo, useState } from 'react'
import { CATALOG, exerciseImage } from '../lib/catalog'
import type { Difficulty, Equipment, Exercise, MuscleGroup } from '../types'
import { DIFFICULTY_TITLES, EQUIPMENT_TITLES, MUSCLE_TITLES } from '../types'
import { Card, Chip, SectionTitle, EmptyState } from '../components/ui'

export function CatalogTab({ onOpenExercise }: { onOpenExercise: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null)
  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false
      if (muscle && !e.primaryMuscles.includes(muscle)) return false
      if (equipment && !e.equipment.includes(equipment)) return false
      if (difficulty && e.difficulty !== difficulty) return false
      return true
    })
  }, [query, muscle, equipment, difficulty])

  return (
    <div className="h-full flex flex-col bg-bg safe-top">
      <div className="px-4 pt-4 pb-2">
        <h1 className="font-display font-bold text-[24px] mb-3">Каталог</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск упражнения…"
          className="w-full bg-card border-2 border-ink rounded-[14px] px-4 py-3 text-ink font-bold outline-none focus:ring-2 ring-accent shadow-brutal-sm"
        />
      </div>
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
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-24">
        <div className="text-text-secondary text-[12px] mb-2">{filtered.length} упражнений</div>
        {filtered.length === 0 && <EmptyState emoji="🔍" title="Ничего не найдено" subtitle="Попробуй изменить фильтры" />}
        <div className="grid grid-cols-2 gap-2.5">
          {filtered.map((e) => (
            <ExerciseCard key={e.id} exercise={e} onClick={() => onOpenExercise(e.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ExerciseCard({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const img = exerciseImage(exercise.id)
  return (
    <button onClick={onClick} className="text-left">
      <Card className="overflow-hidden active:ring-1 ring-accent h-full">
        {img && (
          <img src={img} alt={exercise.name} loading="lazy"
            className="w-full aspect-[3/2] object-cover bg-elevated border-b-2 border-ink" />
        )}
        <div className="p-2.5">
          <div className="font-semibold text-[13px] leading-tight line-clamp-2">{exercise.name}</div>
          <div className="text-text-secondary text-[11px] mt-1">
            {exercise.primaryMuscles.map((m) => MUSCLE_TITLES[m]).join(', ')}
          </div>
        </div>
      </Card>
    </button>
  )
}

// MARK: - Детальная карточка упражнения
export function ExerciseDetail({ exerciseId, onBack }: { exerciseId: string; onBack: () => void }) {
  const exercise = CATALOG.find((e) => e.id === exerciseId)
  if (!exercise) return null
  const img = exerciseImage(exercise.id)
  return (
    <div className="h-full overflow-y-auto bg-bg safe-top safe-bottom">
      <div className="relative">
        {img && <img src={img} alt={exercise.name} className="w-full aspect-[3/2] object-cover" />}
        <button onClick={onBack}
          className="absolute top-3 left-3 w-10 h-10 rounded-full bg-card border-2 border-ink shadow-brutal-sm text-ink text-lg font-black flex items-center justify-center">
          ←
        </button>
      </div>
      <div className="px-4 py-4 pb-10 max-w-md mx-auto">
        <h1 className="font-display font-bold text-[19px] leading-tight">{exercise.name}</h1>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {exercise.primaryMuscles.map((m) => (
            <span key={m} className="sticker px-2.5 py-0.5 bg-accent text-[12px]">
              {MUSCLE_TITLES[m]}
            </span>
          ))}
          {exercise.secondaryMuscles.map((m) => (
            <span key={m} className="px-2.5 py-1 rounded-[10px] bg-elevated text-text-secondary text-[12px]">
              {MUSCLE_TITLES[m]}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Card className="p-3 text-center">
            <div className="text-[11px] text-text-secondary">Повторы</div>
            <div className="font-bold text-[15px]">{exercise.repsMin}–{exercise.repsMax}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-[11px] text-text-secondary">Уровень</div>
            <div className="font-bold text-[15px]">{DIFFICULTY_TITLES[exercise.difficulty]}</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-[11px] text-text-secondary">Снаряды</div>
            <div className="font-bold text-[13px] leading-tight">
              {exercise.equipment.map((eq) => EQUIPMENT_TITLES[eq]).join(', ')}
            </div>
          </Card>
        </div>
        <SectionTitle>Техника выполнения</SectionTitle>
        <Card className="p-4">
          <ol className="space-y-3">
            {exercise.technique.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent text-black text-[12px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-[14px] leading-snug text-text-primary">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}
