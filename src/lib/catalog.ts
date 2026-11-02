// MARK: - Каталог упражнений (данные из exercises.json нативного приложения)
import catalogJson from '../data/exercises.json'
import type { Exercise } from '../types'

export const CATALOG: Exercise[] = catalogJson as Exercise[]

const byId = new Map(CATALOG.map((e) => [e.id, e]))

export function exerciseById(id: string): Exercise | undefined {
  return byId.get(id)
}

export function catalogDictionary(): Map<string, Exercise> {
  return byId
}

// У этих упражнений нет иллюстрации (388 из 390 имеют {id}.jpg)
const NO_IMAGE = new Set(['high-knees', 'burpees'])

export function exerciseImage(id: string): string | null {
  if (NO_IMAGE.has(id)) return null
  return `${import.meta.env.BASE_URL}illustrations/${id}.jpg`
}

// MARK: - Факты о восстановлении и регулярности (порт RecoveryFacts.swift)
export interface Fact {
  id: string
  text: string
  source: string
}

export const RECOVERY_FACTS: Fact[] = [
  {
    id: 'ots-rare',
    text: 'Истинное перетренирование у любителей — редкость: даже среди элитных выносливостников синдром встречается примерно у 10% в сезон. Тренируясь 3–5 раз в неделю, вы скорее недотренируетесь, чем перетренируетесь.',
    source: 'Kreher & Schwartz, Sports Health, 2012',
  },
  {
    id: 'overreaching',
    text: 'Чаще встречается временное перенапряжение: краткосрочное снижение результатов, от которого восстанавливаются за дни — неделю отдыха. Оно проходит само, если вовремя снизить нагрузку.',
    source: 'Bell et al., J. Sports Sci., 2020',
  },
  {
    id: 'symptoms',
    text: 'Сигналы перенапряжения в силовых тренировках простые: стойкая усталость, проседающие рабочие веса, сон хуже обычного, раздражительность. Заметили два-три признака — сделайте неделю лёгкой.',
    source: 'Grandou et al., Int. J. Sports Physiol. Perform., 2021',
  },
  {
    id: 'recovery-time',
    text: 'Сила растёт не на тренировке, а между ними: усталость накапливается быстрее, чем приспособление. План уже заложил дни отдыха — они часть программы, а не пропуск.',
    source: 'Консенсус ECSS/ACSM, Meeusen et al., Med. Sci. Sports Exerc., 2013',
  },
]

export const CONSISTENCY_FACTS: Fact[] = [
  {
    id: 'volume-strength',
    text: 'Рост силы копит недельный объём: в мета-анализе группы с больше 5 подходов в неделю нагрузились значимо сильнее, чем с пятью и меньше.',
    source: 'Ralston et al., J. Sports Sci., 2018',
  },
  {
    id: 'dose-hypertrophy',
    text: 'Каждый дополнительный подход в неделю добавляет примерно 0,4% к приросту мышц — по нарастающей, до плато. Пропущенная неделя — это вычеркнутые «дозы» из этой суммы.',
    source: 'Schoenfeld, Ogborn & Krieger, J. Sports Sci., 2017',
  },
  {
    id: 'frequency-less',
    text: 'Важна не частота сама по себе, а суммарный недельный объём: 3 коротких тренировки и 1 длинная работают схоже, если объём одинаковый.',
    source: 'Grgic et al., 2018; Pelland et al., Sports Med., 2026',
  },
  {
    id: 'come-back',
    text: 'Пропустил — не катастрофа: даже один подход в отказ 2–3 раза в неделю даёт большую часть возможного прироста за первые месяцы. Главное — вернуться в ритм.',
    source: 'Androulakis-Korakakis et al., Sports Med., 2020',
  },
]
