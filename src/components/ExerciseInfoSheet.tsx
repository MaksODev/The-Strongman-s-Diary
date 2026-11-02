// MARK: - Всплывающее окно упражнения: «живое» фото (кен-бёрнс) и техника выполнения
import { exerciseById, exerciseImage } from '../lib/catalog'
import { MUSCLE_TITLES } from '../types'
import { PrimaryButton, SecondaryButton, Modal } from './ui'

export function ExerciseInfoSheet({ exerciseId, onClose, onAdd }: { exerciseId: string; onClose: () => void; onAdd?: () => void }) {
  const exercise = exerciseById(exerciseId)
  if (!exercise) return null
  const img = exerciseImage(exercise.id)
  return (
    <Modal onClose={onClose}>
      <div className="rounded-[16px] overflow-hidden border border-white/10 bg-elevated -mt-1 mb-3 aspect-[3/2]">
        {img && <img src={img} alt={exercise.name} className="w-full h-full object-cover animate-kenburns" />}
      </div>
      <h3 className="font-bold text-[17px] leading-tight mb-1.5">{exercise.name}</h3>
      <div className="flex flex-wrap gap-1 mb-3">
        {exercise.primaryMuscles.map((m) => (
          <span key={m} className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[11px] font-medium">
            {MUSCLE_TITLES[m]}
          </span>
        ))}
        {exercise.secondaryMuscles.map((m) => (
          <span key={m} className="px-2 py-0.5 rounded-full bg-elevated text-text-secondary text-[11px]">
            {MUSCLE_TITLES[m]}
          </span>
        ))}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-text-secondary mb-1.5">Техника выполнения</div>
      <div className="max-h-[30vh] overflow-y-auto -mx-1 px-1">
        <ol className="space-y-2.5">
          {exercise.technique.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent text-black text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[13px] leading-snug text-text-primary">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="h-3" />
      {onAdd && <PrimaryButton onClick={onAdd}>Добавить в тренировку</PrimaryButton>}
      {onAdd && <div className="h-2" />}
      <SecondaryButton onClick={onClose}>Закрыть</SecondaryButton>
    </Modal>
  )
}
