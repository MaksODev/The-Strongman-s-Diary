// MARK: - Таб «Профиль»: данные атлета (с редактированием и замерами), настройки страховки.
import { useState } from 'react'
import { useApp } from '../state/store'
import type { Equipment, PeriodizationScheme, Profile, TrainingExperience, TrainingGoal } from '../types'
import {
  SEX_TITLES, EXPERIENCE_TITLES, GOAL_TITLES, EQUIPMENT_TITLES, SCHEME_TITLES,
  formatWeight,
} from '../types'
import { Card, PrimaryButton, SecondaryButton, Modal, Toggle } from '../components/ui'
import { PencilIcon } from '../components/icons'

export function ProfileTab() {
  const { profile, plan, sessions, measurements, addMeasurement, deleteMeasurement, resetAll, updateProfile, exportData, importData } = useApp()
  const [measureOpen, setMeasureOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  if (!profile) return null

  const completedCount = sessions.filter((s) => s.isCompleted).length

  return (
    <div className="h-full overflow-y-auto bg-bg safe-top">
      <div className="px-4 py-4 pb-28 max-w-md mx-auto space-y-3">
        <h1 className="font-display font-bold text-[24px]">Профиль</h1>

        {/* Единый блок данных атлета (из онбординга) + замеры */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-[17px]">Данные атлета</div>
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] text-text-secondary">{completedCount} тренировок</span>
              <button
                onClick={() => setEditOpen(true)}
                aria-label="редактировать данные атлета"
                className="w-8 h-8 rounded-full bg-elevated border border-white/10 flex items-center justify-center text-text-secondary active:text-ink"
              >
                <PencilIcon />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Field label="Пол" value={SEX_TITLES[profile.sex]} />
            <Field label="Возраст" value={`${profile.age} лет`} />
            <Field label="Рост" value={`${formatWeight(profile.heightCm)} см`} />
            <Field label="Вес" value={`${formatWeight(profile.weightKg)} кг`} />
            <Field label="Опыт" value={EXPERIENCE_TITLES[profile.experience]} />
            <Field label="Тренировок/нед" value={String(profile.sessionsPerWeek)} />
            <Field label="Длительность" value={`${profile.sessionMinutes} мин`} />
            <Field label="Периодизация" value={SCHEME_TITLES[profile.scheme]} />
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-[11px] text-text-secondary mb-1">Цели</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.goals.map((g) => (
                <span key={g} className="sticker px-2.5 py-0.5 bg-accent/20 text-accent text-[12px]">
                  {GOAL_TITLES[g]}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-text-secondary mt-2.5 mb-1">Оборудование</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.equipment.map((eq) => (
                <span key={eq} className="px-2.5 py-1 rounded-[10px] bg-elevated text-text-secondary text-[12px]">
                  {EQUIPMENT_TITLES[eq]}
                </span>
              ))}
            </div>
          </div>

          {/* Замеры тела — часть данных атлета */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] text-text-secondary">Замеры тела</div>
              <button className="text-accent text-[12px] font-semibold" onClick={() => setMeasureOpen(true)}>+ Добавить</button>
            </div>
            {measurements.length === 0 ? (
              <div className="text-text-secondary text-[13px] bg-elevated/50 rounded-[12px] px-3 py-2.5">
                Замеров пока нет. Отслеживай массу и объёмы.
              </div>
            ) : (
              <div className="space-y-1.5">
                {[...measurements].reverse().slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-elevated/50 rounded-[12px] px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px]">
                        {new Date(m.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="text-text-secondary text-[12px] mt-0.5 truncate">
                        {formatWeight(m.weightKg)} кг
                        {m.chestCm != null && ` · грудь ${formatWeight(m.chestCm)} см`}
                        {m.waistCm != null && ` · талия ${formatWeight(m.waistCm)} см`}
                        {m.hipsCm != null && ` · бёдра ${formatWeight(m.hipsCm)} см`}
                      </div>
                    </div>
                    <button onClick={() => deleteMeasurement(m.id)} className="text-text-disabled text-[18px] px-2 shrink-0">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Страховка серии */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-[15px]">🛡️ Страховка серии</div>
              <div className="text-text-secondary text-[12px] mt-0.5">
                Тратится автоматически при пропуске одной недели
              </div>
            </div>
            <Toggle
              checked={profile.freezeAutoSpend}
              onChange={(v) => updateProfile({ ...profile, freezeAutoSpend: v })}
              ariaLabel="автотрата страховки"
            />
          </div>
          <div className="text-text-disabled text-[11px] mt-2">
            Использовано страховок за всё время: {profile.freezeUsedCount}
          </div>
        </Card>

        <div className="pt-2">
          <button className="w-full text-center text-[13px] text-text-secondary py-3" onClick={async () => {
            const file = new File([exportData()], `strongman-backup-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' })
            if (navigator.canShare?.({ files: [file] })) {
              try { await navigator.share({ files: [file] }); return } catch { return }
            }
            const a = document.createElement('a')
            a.href = URL.createObjectURL(file)
            a.download = file.name
            a.click()
            URL.revokeObjectURL(a.href)
          }}>
            Сохранить резервную копию
          </button>
          <label className="block w-full text-center text-[13px] text-text-secondary py-3">
            Восстановить из копии
            <input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              if (!importData(await f.text())) alert('Файл не похож на резервную копию приложения')
            }} />
          </label>
          <button className="w-full text-center text-[13px] text-text-disabled py-3" onClick={() => setConfirmReset(true)}>
            Сбросить все данные
          </button>
          <div className="text-center text-text-disabled text-[11px]">
            Дневник силача · веб-версия {plan ? `· ${plan.name}` : ''}
          </div>
        </div>
      </div>

      {measureOpen && (
        <MeasurementSheet
          defaultWeight={profile.weightKg}
          onSave={(m) => { addMeasurement(m); setMeasureOpen(false) }}
          onClose={() => setMeasureOpen(false)}
        />
      )}

      {editOpen && (
        <AthleteEditSheet
          profile={profile}
          onSave={(p) => { updateProfile(p); setEditOpen(false) }}
          onClose={() => setEditOpen(false)}
        />
      )}

      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <h3 className="font-bold text-[17px] text-center mb-2">Сбросить все данные?</h3>
          <p className="text-text-secondary text-[14px] text-center mb-4">
            Профиль, программа, история тренировок и достижения будут удалены безвозвратно.
          </p>
          <PrimaryButton onClick={() => { resetAll(); setConfirmReset(false) }}>Удалить всё</PrimaryButton>
          <div className="h-2" />
          <SecondaryButton onClick={() => setConfirmReset(false)}>Отмена</SecondaryButton>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-text-secondary">{label}</div>
      <div className="font-semibold text-[14px]">{value}</div>
    </div>
  )
}

// MARK: Редактирование данных атлета: селекты и переключаемые чипы
function AthleteEditSheet({ profile, onSave, onClose }: {
  profile: Profile
  onSave: (p: Profile) => void
  onClose: () => void
}) {
  const [sex, setSex] = useState(profile.sex)
  const [age, setAge] = useState(String(profile.age))
  const [height, setHeight] = useState(String(profile.heightCm))
  const [weight, setWeight] = useState(String(profile.weightKg))
  const [experience, setExperience] = useState<TrainingExperience>(profile.experience)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(String(profile.sessionsPerWeek))
  const [sessionMinutes, setSessionMinutes] = useState(String(profile.sessionMinutes))
  const [scheme, setScheme] = useState<PeriodizationScheme>(profile.scheme)
  const [goals, setGoals] = useState<TrainingGoal[]>(profile.goals)
  const [equipment, setEquipment] = useState<Equipment[]>(profile.equipment)

  const toggleIn = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v]

  const save = () => {
    const ageN = parseInt(age, 10)
    const hN = parseFloat(height.replace(',', '.'))
    const wN = parseFloat(weight.replace(',', '.'))
    if (isNaN(ageN) || ageN < 10 || ageN > 100) return
    if (isNaN(hN) || hN < 120 || hN > 230) return
    if (isNaN(wN) || wN < 30 || wN > 300) return
    onSave({
      ...profile,
      sex, age: ageN, heightCm: hN, weightKg: wN,
      experience,
      sessionsPerWeek: parseInt(sessionsPerWeek, 10),
      sessionMinutes: parseInt(sessionMinutes, 10),
      scheme, goals, equipment,
    })
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-bold text-[17px] mb-4">Данные атлета</h3>
      <div className="space-y-3">
        <SelectRow label="Пол" value={sex} onChange={(v) => setSex(v as Profile['sex'])} options={[
          { value: 'male', title: SEX_TITLES.male },
          { value: 'female', title: SEX_TITLES.female },
        ]} />
        <div className="grid grid-cols-3 gap-2">
          <NumRow label="Возраст" value={age} onChange={setAge} suffix="лет" />
          <NumRow label="Рост" value={height} onChange={setHeight} suffix="см" />
          <NumRow label="Вес" value={weight} onChange={setWeight} suffix="кг" />
        </div>
        <SelectRow label="Опыт" value={experience} onChange={(v) => setExperience(v as TrainingExperience)}
          options={(Object.keys(EXPERIENCE_TITLES) as TrainingExperience[]).map((k) => ({ value: k, title: EXPERIENCE_TITLES[k] }))} />
        <SelectRow label="Тренировок в неделю" value={sessionsPerWeek} onChange={setSessionsPerWeek}
          options={[2, 3, 4, 5, 6].map((n) => ({ value: String(n), title: `${n}` }))} />
        <SelectRow label="Длительность" value={sessionMinutes} onChange={setSessionMinutes}
          options={[30, 45, 60, 75, 90, 120].map((n) => ({ value: String(n), title: `${n} мин` }))} />
        <SelectRow label="Периодизация" value={scheme} onChange={(v) => setScheme(v as PeriodizationScheme)}
          options={(Object.keys(SCHEME_TITLES) as PeriodizationScheme[]).map((k) => ({ value: k, title: SCHEME_TITLES[k] }))} />

        <div>
          <div className="text-[12px] text-text-secondary mb-1.5">Цели</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(GOAL_TITLES) as TrainingGoal[]).map((g) => (
              <button key={g}
                onClick={() => setGoals((prev) => toggleIn(prev, g))}
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                  goals.includes(g) ? 'bg-accent/20 text-accent border-accent/40' : 'bg-elevated text-text-secondary border-white/10'
                }`}>
                {GOAL_TITLES[g]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[12px] text-text-secondary mb-1.5">Оборудование</div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(EQUIPMENT_TITLES) as Equipment[]).map((eq) => (
              <button key={eq}
                onClick={() => setEquipment((prev) => toggleIn(prev, eq))}
                className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                  equipment.includes(eq) ? 'bg-accent/20 text-accent border-accent/40' : 'bg-elevated text-text-secondary border-white/10'
                }`}>
                {EQUIPMENT_TITLES[eq]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="h-4" />
      <PrimaryButton onClick={save}>Сохранить</PrimaryButton>
      <div className="h-2" />
      <SecondaryButton onClick={onClose}>Отмена</SecondaryButton>
    </Modal>
  )
}

/// Тёмный нативный селект — на мобильном открывает системный пикер
function SelectRow({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; title: string }[]
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <div className="relative mt-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-elevated border border-white/10 rounded-[14px] px-4 py-3 text-ink font-semibold text-[15px] outline-none focus:ring-2 ring-accent/60"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-card text-ink">{o.title}</option>
          ))}
        </select>
        <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9.5l6 6 6-6" />
        </svg>
      </div>
    </label>
  )
}

function NumRow({ label, value, onChange, suffix }: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix: string
}) {
  return (
    <label className="block">
      <span className="text-[12px] text-text-secondary">{label}, {suffix}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-elevated border border-white/10 rounded-[14px] px-3 py-3 text-ink font-semibold text-[15px] outline-none focus:ring-2 ring-accent/60 font-digits"
      />
    </label>
  )
}

function MeasurementSheet({ defaultWeight, onSave, onClose }: {
  defaultWeight: number
  onSave: (m: { date: string; weightKg: number; chestCm: number | null; waistCm: number | null; hipsCm: number | null }) => void
  onClose: () => void
}) {
  const [weight, setWeight] = useState(String(defaultWeight))
  const [chest, setChest] = useState('')
  const [waist, setWaist] = useState('')
  const [hips, setHips] = useState('')
  const num = (s: string) => (s.trim() === '' ? null : parseFloat(s.replace(',', '.')))

  return (
    <Modal onClose={onClose}>
      <h3 className="font-bold text-[17px] mb-4">Новый замер</h3>
      <div className="space-y-3">
        <MeasureField label="Вес, кг" value={weight} onChange={setWeight} />
        <MeasureField label="Грудь, см (необязательно)" value={chest} onChange={setChest} />
        <MeasureField label="Талия, см (необязательно)" value={waist} onChange={setWaist} />
        <MeasureField label="Бёдра, см (необязательно)" value={hips} onChange={setHips} />
      </div>
      <div className="h-4" />
      <PrimaryButton onClick={() => {
        const w = num(weight)
        if (w == null || w <= 0) return
        onSave({ date: new Date().toISOString(), weightKg: w, chestCm: num(chest), waistCm: num(waist), hipsCm: num(hips) })
      }}>Сохранить</PrimaryButton>
      <div className="h-2" />
      <SecondaryButton onClick={onClose}>Отмена</SecondaryButton>
    </Modal>
  )
}

function MeasureField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-elevated border border-white/10 rounded-[14px] px-4 py-3 text-ink font-semibold text-[15px] outline-none focus:ring-2 ring-accent/60 font-digits"
      />
    </label>
  )
}

