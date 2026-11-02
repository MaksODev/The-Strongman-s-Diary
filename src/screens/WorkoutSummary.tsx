// MARK: - Итоги завершённой тренировки: тоннаж, веха, рекорды, прогрессия, RPE
import type { WorkoutResult } from './ActiveWorkout'
import { formatWeight } from '../types'
import { PrimaryButton } from '../components/ui'

export function WorkoutSummary({ result, onDone }: { result: WorkoutResult; onDone: () => void }) {
  const start = new Date(result.session.startedAt)
  const end = new Date(result.session.finishedAt ?? Date.now())
  const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
  const setsDone = result.session.setLogs.filter((l) => l.isCompleted).length

  return (
    <div className="h-full overflow-y-auto bg-bg safe-top safe-bottom">
      <div className="px-5 py-8 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-[13px] text-text-secondary uppercase tracking-wide">Тренировка завершена</div>
          <div className="font-display font-bold text-[19px] mt-1">{result.session.dayName}</div>
          <div className="text-text-secondary text-[13px] mt-1">{minutes} мин · {setsDone} подходов</div>
        </div>

        {/* Тоннаж + веха */}
        <div className="bg-card border-2 border-ink shadow-brutal rounded-[18px] p-5 text-center mb-3">
          <div className="text-[12px] text-text-secondary uppercase tracking-wide">Суммарный тоннаж</div>
          <div className="font-display font-bold text-[38px] text-ink tabular-nums my-1">
            {formatWeight(Math.round(result.tonnage))} <span className="text-[18px]">кг</span>
          </div>
          {result.milestone && (
            <div className="animate-pop-in mt-2">
              <div className="text-5xl animate-float">{result.milestone.emoji}</div>
              <div className="font-semibold text-[15px] mt-2">{result.milestone.phrase}</div>
            </div>
          )}
        </div>

        {result.recordEvents.length > 0 && (
          <div className="bg-card border border-elevated rounded-[14px] p-4 mb-3 space-y-2">
            <div className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Рекорды</div>
            {result.recordEvents.map((e, i) => (
              <div key={i} className="animate-pop-in flex items-start gap-2">
                <span className="text-xl">🏆</span>
                <div>
                  <div className="font-semibold text-[14px]">{e.exerciseName ?? 'Тренировка'}</div>
                  <div className="text-text-secondary text-[12px]">Новый рекорд: {formatWeight(e.newValue)} кг</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {result.progressionLines.length > 0 && (
          <div className="bg-accent/40 border-2 border-ink shadow-brutal-sm rounded-[16px] p-4 mb-3">
            <div className="font-display text-[12px] font-bold uppercase tracking-wide mb-2">Прогрессия весов</div>
            {result.progressionLines.map((l, i) => (
              <div key={i} className="text-[14px] py-0.5">📈 {l}</div>
            ))}
          </div>
        )}

        {result.rpeMessages.map((m, i) => (
          <div key={i} className="bg-card border border-elevated rounded-[14px] p-4 mb-3 text-[14px] text-text-secondary">
            {m}
          </div>
        ))}

        {result.weekAdvanced && (
          <div className="bg-card border border-elevated rounded-[14px] p-4 mb-3 text-[14px]">
            🔄 Все дни недели пройдены — программа перешла к неделе {result.weekNumber}
          </div>
        )}

        {result.session.rpe != null && (
          <div className="text-center text-text-secondary text-[13px] mb-4">
            Оценка нагрузки: <span className="text-text-primary font-semibold">{result.session.rpe}/10</span>
          </div>
        )}

        <PrimaryButton onClick={onDone}>Готово</PrimaryButton>
      </div>
    </div>
  )
}
