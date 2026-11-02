// MARK: - Геймификация: серия, достижения, тоннажные вехи
// (порт GamificationEngine.swift + TonnageMilestones.swift)
import type { WorkoutSession } from '../types'

function sessionDate(s: WorkoutSession): Date {
  return new Date(s.finishedAt ?? s.startedAt)
}

function weekStart(d: Date): number {
  // Начало календарной недели (пн), как в Calendar.current (пн = 1-й день в РФ-локали)
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7 // 0 = пн
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - day)
  return x.getTime()
}

/// Сколько календарных недель подряд (пн–вс) была хотя бы одна завершённая тренировка.
export function streakWeeks(sessions: WorkoutSession[]): number {
  const weekStarts = new Set<number>()
  for (const s of sessions) {
    if (s.isCompleted) weekStarts.add(weekStart(sessionDate(s)))
  }
  if (weekStarts.size === 0) return 0
  const last = Math.max(...weekStarts)
  const thisWeekStart = weekStart(new Date())
  // Серия прервана, если с последней тренировки прошло больше недели
  if (last < thisWeekStart - 7 * 86400_000) return 0

  let streak = 1
  let cursor = last
  while (weekStarts.has(cursor - 7 * 86400_000)) {
    streak += 1
    cursor -= 7 * 86400_000
  }
  return streak
}

// MARK: - Достижения
export interface Achievement {
  id: string
  title: string
  emoji: string
  subtitle: string
  isUnlocked: boolean
}

function hasNewRecord(completed: WorkoutSession[]): boolean {
  if (completed.length === 0) return false
  const last = completed.reduce((a, b) => (sessionDate(a) > sessionDate(b) ? a : b))
  const lastDate = sessionDate(last)
  const lastLogs = last.setLogs.filter((l) => l.isCompleted)
  for (const log of lastLogs) {
    const earlierMax = completed
      .filter((s) => sessionDate(s) < lastDate)
      .flatMap((s) => s.setLogs)
      .filter((l) => l.isCompleted && l.exerciseID === log.exerciseID)
      .reduce((m, l) => Math.max(m, l.actualWeightKg), 0)
    if (earlierMax > 0 && log.actualWeightKg > earlierMax) return true
  }
  return false
}

export function achievements(sessions: WorkoutSession[], cycleSessions: number): Achievement[] {
  const completed = sessions.filter((s) => s.isCompleted)
  const count = completed.length
  return [
    { id: 'first', title: 'Первый шаг', emoji: '🚩', subtitle: 'Первая завершённая тренировка', isUnlocked: count >= 1 },
    { id: 'ten', title: 'Десятка', emoji: '🔟', subtitle: '10 тренировок', isUnlocked: count >= 10 },
    { id: 'fifty', title: 'Марафонец', emoji: '🏃', subtitle: '50 тренировок', isUnlocked: count >= 50 },
    { id: 'hundred', title: 'Сотня', emoji: '💯', subtitle: '100 тренировок', isUnlocked: count >= 100 },
    { id: 'record', title: 'Новый максимум', emoji: '📈', subtitle: 'Последняя тренировка — рекордный вес', isUnlocked: hasNewRecord(completed) },
    { id: 'cycle', title: 'Цикл завершён', emoji: '🔄', subtitle: 'Пройден полный цикл периодизации', isUnlocked: count >= Math.max(1, cycleSessions) },
  ]
}

// MARK: - Тоннажные вехи (как в Duolingo: в моменте, весело)
export interface TonnageMilestone {
  thresholdKg: number
  emoji: string
  objectName: string
  phrase: string
}

export const TONNAGE_MILESTONES: TonnageMilestone[] = [
  { thresholdKg: 100, emoji: '🎒', objectName: 'большой туристический рюкзак', phrase: 'Первая сотня! Ты поднял(а) рюкзак марафонца.' },
  { thresholdKg: 250, emoji: '🧍', objectName: 'взрослый человек', phrase: 'Ты поднял(а) взрослого человека!' },
  { thresholdKg: 500, emoji: '🏍️', objectName: 'мотоцикл', phrase: 'Ты поднял(а) мотоцикл!' },
  { thresholdKg: 1000, emoji: '🐴', objectName: 'лошадь', phrase: 'Тонна! Как лошадь.' },
  { thresholdKg: 2000, emoji: '🚗', objectName: 'легковой автомобиль', phrase: 'Ты поднял(а) целую машину!' },
  { thresholdKg: 5000, emoji: '🐘', objectName: 'африканский слон', phrase: 'Слоноподобно! 5 тонн.' },
  { thresholdKg: 10000, emoji: '🚌', objectName: 'городской автобус', phrase: 'Автобус поднят. Остановка — твоя.' },
  { thresholdKg: 25000, emoji: '🦕', objectName: 'бронтозавр (ещё детёныш)', phrase: '25 тонн — детёныш бронтозавра покорён.' },
  { thresholdKg: 42000, emoji: '✈️', objectName: 'Boeing 737 (пустой)', phrase: 'Ты поднял(а) целый самолёт!' },
  { thresholdKg: 100000, emoji: '🐋', objectName: 'синий кит', phrase: '100 тонн. Синий кит отдыхает.' },
]

export function reachedMilestones(tonnage: number): TonnageMilestone[] {
  return TONNAGE_MILESTONES.filter((m) => tonnage >= m.thresholdKg)
}

export function bestMilestone(tonnage: number): TonnageMilestone | null {
  const r = reachedMilestones(tonnage)
  return r.length > 0 ? r[r.length - 1] : null
}
