// MARK: - Онбординг: сбор профиля атлета и генерация стартовой программы
import { useRef, useState, type ReactElement } from 'react'
import type { Equipment, PeriodizationScheme, Profile, Sex, TrainingExperience, TrainingGoal as Goal, WeekLoadType } from '../types'
import { useApp } from '../state/store'
import { SEX_TITLES, EXPERIENCE_TITLES, GOAL_TITLES, EQUIPMENT_TITLES, SCHEME_TITLES, WEEK_TYPE_TITLES } from '../types'
import { PrimaryButton, SecondaryButton, Card } from '../components/ui'
import { RulerScale } from '../components/RulerScale'
import { ChartIcon, DumbbellIcon, ProgramIcon } from '../components/icons'

const TOTAL_STEPS = 9

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { completeOnboarding } = useApp()
  const [step, setStep] = useState(0)
  const [intro, setIntro] = useState(0) // страницы-знакомство; INTRO.length — анкета
  const [profile, setProfile] = useState<Profile>({
    sex: 'male',
    age: 30,
    heightCm: 175,
    weightKg: 75,
    experience: 'beginner',
    equipment: ['gym'],
    goals: ['generalFitness'],
    sessionMinutes: 60,
    sessionsPerWeek: 3,
    scheme: 'heavyLight',
    customWeekTypes: [],
    customWeekPercents: [],
    freezeAvailable: false,
    freezeAutoSpend: true,
    freezeUsedCount: 0,
    freezeProtectedBase: 0,
    freezeBurnedNotified: false,
  })

  const patch = (p: Partial<Profile>) => setProfile((prev) => ({ ...prev, ...p }))

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value]

  const finish = () => {
    completeOnboarding(profile)
    onDone()
  }

  const steps: { title: string; render: () => ReactElement }[] = [
    {
      title: 'Твой пол',
      render: () => (
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(SEX_TITLES) as Sex[]).map((s) => (
            <button key={s} onClick={() => patch({ sex: s })}
              className={`btn-brutal py-5 rounded-[16px] font-black text-[16px] border-2 border-ink shadow-brutal-sm ${profile.sex === s ? 'bg-accent text-black' : 'bg-card text-ink'}`}>
              {SEX_TITLES[s]}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Возраст',
      render: () => <NumberStep value={profile.age} min={14} max={90} unit="лет" onChange={(v) => patch({ age: v })} />,
    },
    {
      title: 'Рост и вес',
      render: () => (
        <div className="space-y-8">
          <div>
            <div className="text-text-secondary text-[13px] font-bold mb-2">Рост</div>
            <RulerScale large className="h-20" value={profile.heightCm} min={130} max={230} step={1} span={30} majorEvery={10} unit="см"
              onChange={(v) => patch({ heightCm: v })} />
          </div>
          <div>
            <div className="text-text-secondary text-[13px] font-bold mb-2">Вес</div>
            <RulerScale large className="h-20" value={profile.weightKg} min={35} max={250} step={0.5} span={20} majorEvery={5} unit="кг"
              onChange={(v) => patch({ weightKg: v })} />
          </div>
          <p className="text-text-disabled text-[12px] text-center">Тяни линейку пальцем или нажми на число, чтобы ввести точное значение</p>
        </div>
      ),
    },
    {
      title: 'Опыт тренировок',
      render: () => (
        <div className="space-y-2">
          {(Object.keys(EXPERIENCE_TITLES) as TrainingExperience[]).map((e) => (
            <button key={e} onClick={() => patch({ experience: e })}
              className={`btn-brutal w-full py-4 px-4 rounded-[16px] text-left font-extrabold text-[15px] border-2 border-ink shadow-brutal-sm ${profile.experience === e ? 'bg-accent text-black' : 'bg-card text-ink'}`}>
              {EXPERIENCE_TITLES[e]}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Где тренируешься?',
      render: () => (
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(EQUIPMENT_TITLES) as Equipment[]).map((eq) => {
            const active = profile.equipment.includes(eq)
            return (
              <button key={eq} onClick={() => patch({ equipment: toggleIn(profile.equipment, eq) })}
                className={`btn-brutal py-4 px-3 rounded-[16px] font-extrabold text-[14px] border-2 border-ink shadow-brutal-sm ${active ? 'bg-accent text-black' : 'bg-card text-ink'}`}>
                {EQUIPMENT_TITLES[eq]}
              </button>
            )
          })}
        </div>
      ),
    },
    {
      title: 'Цели (можно несколько)',
      render: () => (
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(GOAL_TITLES) as Goal[]).map((g) => {
            const active = profile.goals.includes(g)
            return (
              <button key={g} onClick={() => patch({ goals: toggleIn(profile.goals, g) })}
                className={`btn-brutal py-4 px-3 rounded-[16px] font-extrabold text-[14px] border-2 border-ink shadow-brutal-sm ${active ? 'bg-accent text-black' : 'bg-card text-ink'}`}>
                {GOAL_TITLES[g]}
              </button>
            )
          })}
        </div>
      ),
    },
    {
      title: 'Сколько времени на тренировку?',
      render: () => (
        <div className="grid grid-cols-2 gap-3">
          {[30, 45, 60, 90].map((m) => (
            <button key={m} onClick={() => patch({ sessionMinutes: m })}
              className={`btn-brutal py-5 rounded-[16px] font-black text-[16px] border-2 border-ink shadow-brutal-sm ${profile.sessionMinutes === m ? 'bg-accent text-black' : 'bg-card text-ink'}`}>
              {m} мин
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Сколько раз в неделю?',
      render: () => (
        <div className="grid grid-cols-5 gap-2">
          {[2, 3, 4, 5, 6].map((n) => (
            <button key={n} onClick={() => patch({ sessionsPerWeek: n })}
              className={`btn-brutal py-5 rounded-[16px] font-display font-bold text-[18px] border-2 border-ink shadow-brutal-sm ${profile.sessionsPerWeek === n ? 'bg-accent text-black' : 'bg-card text-ink'}`}>
              {n}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: 'Схема периодизации',
      render: () => (
        <div className="space-y-2">
          {(Object.keys(SCHEME_TITLES) as PeriodizationScheme[]).filter((s) => s !== 'custom').map((s) => (
            <button key={s} onClick={() => patch({ scheme: s })}
              className={`w-full py-4 px-4 rounded-[14px] text-left font-medium text-[15px] ${profile.scheme === s ? 'bg-accent text-black' : 'bg-card text-text-primary border border-elevated'}`}>
              {SCHEME_TITLES[s]}
            </button>
          ))}
          {profile.scheme === 'custom' && <CustomSchemeEditor profile={profile} patch={patch} />}
          <p className="text-text-disabled text-[12px] pt-2">
            Подходы и повторения подберём по опыту, а стартовые веса — по массе тела и снаряду. Веса примерные:
            первые тренировки идут с запасом 2–3 повторения, поправь их, если слишком легко или тяжело.
          </p>
        </div>
      ),
    },
  ]

  const canNext =
    profile.equipment.length > 0 &&
    profile.goals.length > 0 &&
    (profile.scheme !== 'custom' || (profile.customWeekTypes.length > 0 && profile.customWeekTypes.length === profile.customWeekPercents.length))

  if (intro < INTRO.length) {
    return <IntroSlides index={intro} onChange={setIntro} />
  }

  return (
    <div className="h-full flex flex-col bg-bg safe-top safe-bottom">
      <div className="px-5 pt-4 pb-2">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`flex-1 h-2.5 rounded-full border border-white/10 ${i <= step ? 'bg-accent' : 'hatch'}`} />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <h1 className="font-display text-[26px] font-medium mb-6">{steps[step].title}</h1>
        {steps[step].render()}
      </div>
      <div className="px-5 py-4 flex gap-3">
        {step > 0 && <SecondaryButton className="!w-auto px-6" onClick={() => setStep(step - 1)}>Назад</SecondaryButton>}
        {step < TOTAL_STEPS - 1 ? (
          <PrimaryButton disabled={!canNext} onClick={() => setStep(step + 1)}>Далее</PrimaryButton>
        ) : (
          <PrimaryButton disabled={!canNext} onClick={finish}>Сгенерировать программу</PrimaryButton>
        )}
      </div>
    </div>
  )
}

// MARK: Знакомство с приложением (3 страницы перед анкетой)
const INTRO: { icon: ReactElement; title: string; text: string; points: string[] }[] = [
  {
    icon: <ProgramIcon width={44} height={44} />,
    title: 'Программа под тебя',
    text: 'Ответь на несколько вопросов — приложение составит план: упражнения, подходы, повторения и примерные стартовые веса.',
    points: ['Учитываем опыт, цели и оборудование', 'Тяжёлые и лёгкие недели чередуются сами', 'Вес растёт, когда ты готов, — без ручных расчётов'],
  },
  {
    icon: <DumbbellIcon width={44} height={44} />,
    title: 'Тренировка без лишнего',
    text: 'Отмечай подходы одним касанием: вес выбирается линейкой, повторы — кнопками, а прошлый результат подставляется сам.',
    points: ['Каталог из 390 упражнений с фото и техникой', 'Свои тренировки: добавляй упражнения галочками', 'Оценка тяжести и итоги с тоннажем'],
  },
  {
    icon: <ChartIcon width={44} height={44} />,
    title: 'Прогресс и мотивация',
    text: 'Рекорды, графики и серия недель подряд показывают, что ты действительно растёшь.',
    points: ['Рекорды и вехи по тоннажу', 'Страховка серии: один пропуск не обнуляет её', 'Работает офлайн, данные — только на твоём телефоне'],
  },
]

function IntroSlides({ index, onChange }: { index: number; onChange: (i: number) => void }) {
  const last = index === INTRO.length - 1
  const startX = useRef<number | null>(null)
  const go = (i: number) => onChange(Math.max(0, Math.min(INTRO.length, i)))

  return (
    <div
      className="h-full flex flex-col bg-bg safe-top safe-bottom touch-pan-y"
      onPointerDown={(e) => { startX.current = e.clientX }}
      onPointerUp={(e) => {
        if (startX.current === null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (dx < -60) go(index + 1)
        else if (dx > 60 && index > 0) go(index - 1)
      }}
    >
      <div className="px-5 pt-4 flex justify-end h-10">
        {!last && (
          <button className="text-text-secondary text-[14px] font-semibold" onClick={() => go(INTRO.length)}>Пропустить</button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {INTRO.map((slide, i) => (
            <section key={i} className="w-full shrink-0 h-full overflow-y-auto px-6 flex flex-col items-center text-center pt-6" aria-hidden={i !== index}>
              <div className="tile-violet w-[104px] h-[104px] rounded-full flex items-center justify-center animate-float">
                {slide.icon}
              </div>
              <h1 className="font-display text-[28px] font-medium mt-8">{slide.title}</h1>
              <p className="text-text-secondary text-[15px] leading-relaxed mt-3 max-w-[320px]">{slide.text}</p>
              <ul className="mt-6 w-full max-w-[340px] space-y-2 text-left">
                {slide.points.map((p) => (
                  <li key={p} className="tile-glass rounded-[22px] px-4 py-3 flex items-center gap-3 text-[14px] font-semibold">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 py-3">
        {INTRO.map((_, i) => (
          <span key={i} className="h-2 rounded-full transition-all"
            style={{ width: i === index ? 22 : 8, background: i === index ? '#ffd02a' : 'rgba(255,255,255,0.15)' }} />
        ))}
      </div>
      <div className="px-5 pb-4 flex gap-3">
        {index > 0 && <SecondaryButton className="!w-auto px-6" onClick={() => go(index - 1)}>Назад</SecondaryButton>}
        <PrimaryButton onClick={() => go(index + 1)}>{last ? 'Начать' : 'Далее'}</PrimaryButton>
      </div>
    </div>
  )
}

function NumberStep({ value, min, max, unit, step = 1, onChange }: {
  value: number
  min: number
  max: number
  unit: string
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-center gap-6">
      <button className="btn-brutal w-14 h-14 rounded-full bg-card border-2 border-ink shadow-brutal text-ink text-3xl font-black flex items-center justify-center"
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}>−</button>
      <div className="text-center w-28">
        <div className="font-display text-4xl font-bold tabular-nums">{Number.isInteger(value) ? value : value.toFixed(1)}</div>
        <div className="text-text-secondary text-[14px] font-bold">{unit}</div>
      </div>
      <button className="btn-brutal w-14 h-14 rounded-full bg-card border-2 border-ink shadow-brutal text-ink text-3xl font-black flex items-center justify-center"
        onClick={() => onChange(Math.min(max, Math.round((value + step) * 10) / 10))}>+</button>
    </div>
  )
}

function CustomSchemeEditor({ profile, patch }: { profile: Profile; patch: (p: Partial<Profile>) => void }) {
  const addWeek = () => {
    const types: WeekLoadType[] = [...profile.customWeekTypes, 'heavy']
    const percents = [...profile.customWeekPercents, 85]
    patch({ customWeekTypes: types, customWeekPercents: percents })
  }
  const removeWeek = (i: number) => {
    patch({
      customWeekTypes: profile.customWeekTypes.filter((_, x) => x !== i),
      customWeekPercents: profile.customWeekPercents.filter((_, x) => x !== i),
    })
  }
  const setType = (i: number, t: WeekLoadType) => {
    const types = [...profile.customWeekTypes]
    types[i] = t
    patch({ customWeekTypes: types })
  }
  const setPercent = (i: number, p: number) => {
    const percents = [...profile.customWeekPercents]
    percents[i] = Math.min(120, Math.max(30, p))
    patch({ customWeekPercents: percents })
  }
  return (
    <Card className="p-3 space-y-2 mt-3">
      {profile.customWeekTypes.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <select value={t} onChange={(e) => setType(i, e.target.value as WeekLoadType)}
            className="bg-elevated rounded-[10px] text-text-primary text-[14px] py-2 px-2 flex-1 outline-none">
            {(Object.keys(WEEK_TYPE_TITLES) as WeekLoadType[]).map((wt) => (
              <option key={wt} value={wt}>{WEEK_TYPE_TITLES[wt]}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <input type="number" value={profile.customWeekPercents[i] ?? 85}
              onChange={(e) => setPercent(i, parseFloat(e.target.value) || 85)}
              className="w-16 bg-elevated rounded-[10px] text-text-primary text-center py-2 outline-none" />
            <span className="text-text-secondary text-[13px]">%</span>
          </div>
          <button onClick={() => removeWeek(i)} className="text-text-secondary px-2 text-lg">×</button>
        </div>
      ))}
      <SecondaryButton onClick={addWeek}>+ Добавить неделю</SecondaryButton>
    </Card>
  )
}
