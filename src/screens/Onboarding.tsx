// MARK: - Онбординг: сбор профиля атлета и генерация стартовой программы
import { useState, type ReactElement } from 'react'
import type { Equipment, PeriodizationScheme, Profile, Sex, TrainingExperience, TrainingGoal as Goal, WeekLoadType } from '../types'
import { useApp } from '../state/store'
import { SEX_TITLES, EXPERIENCE_TITLES, GOAL_TITLES, EQUIPMENT_TITLES, SCHEME_TITLES, WEEK_TYPE_TITLES } from '../types'
import { PrimaryButton, SecondaryButton, Card } from '../components/ui'
import { RulerScale } from '../components/RulerScale'

const TOTAL_STEPS = 9

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { completeOnboarding } = useApp()
  const [step, setStep] = useState(0)
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
              className={`btn-brutal py-5 rounded-[16px] font-black text-[16px] border-2 border-ink shadow-brutal-sm ${profile.sex === s ? 'bg-accent text-ink' : 'bg-card text-ink'}`}>
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
              className={`btn-brutal w-full py-4 px-4 rounded-[16px] text-left font-extrabold text-[15px] border-2 border-ink shadow-brutal-sm ${profile.experience === e ? 'bg-accent text-ink' : 'bg-card text-ink'}`}>
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
                className={`btn-brutal py-4 px-3 rounded-[16px] font-extrabold text-[14px] border-2 border-ink shadow-brutal-sm ${active ? 'bg-accent text-ink' : 'bg-card text-ink'}`}>
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
                className={`btn-brutal py-4 px-3 rounded-[16px] font-extrabold text-[14px] border-2 border-ink shadow-brutal-sm ${active ? 'bg-accent text-ink' : 'bg-card text-ink'}`}>
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
              className={`btn-brutal py-5 rounded-[16px] font-black text-[16px] border-2 border-ink shadow-brutal-sm ${profile.sessionMinutes === m ? 'bg-accent text-ink' : 'bg-card text-ink'}`}>
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
              className={`btn-brutal py-5 rounded-[16px] font-display font-bold text-[18px] border-2 border-ink shadow-brutal-sm ${profile.sessionsPerWeek === n ? 'bg-accent text-ink' : 'bg-card text-ink'}`}>
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
        </div>
      ),
    },
  ]

  const canNext =
    profile.equipment.length > 0 &&
    profile.goals.length > 0 &&
    (profile.scheme !== 'custom' || (profile.customWeekTypes.length > 0 && profile.customWeekTypes.length === profile.customWeekPercents.length))

  return (
    <div className="h-full flex flex-col bg-bg safe-top safe-bottom">
      <div className="px-5 pt-4 pb-2">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className="flex-1 h-2.5 rounded-full border border-white/10"
              style={{ background: i <= step ? 'linear-gradient(90deg, #a855f7, #6d3df0)' : 'rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <h1 className="font-display text-[24px] font-bold mb-6">{steps[step].title}</h1>
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
