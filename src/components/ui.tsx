// MARK: - Общие UI-примитивы (тёмный премиальный стиль: стеклянные плитки, градиентные акценты)
import { useEffect, useState, type ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`tile-glass rounded-[22px] ${className}`}>{children}</div>
  )
}

export function PrimaryButton({ children, onClick, disabled, className = '' }: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-brutal w-full py-3.5 px-4 rounded-[18px] font-extrabold text-[15px] btn-flash disabled:opacity-40 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, className = '' }: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-brutal w-full py-3 px-4 rounded-[18px] font-bold text-[15px] bg-elevated text-ink border border-white/10 shadow-brutal-sm ${className}`}
    >
      {children}
    </button>
  )
}

export function Chip({ children, active, onClick, color }: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-brutal px-3.5 py-2 rounded-[999px] text-[13px] font-bold whitespace-nowrap border ${
        active ? 'border-transparent text-white' : 'bg-elevated text-text-secondary border-white/10'
      }`}
      style={active
        ? { background: color ?? 'linear-gradient(140deg, #a855f7 0%, #6d3df0 100%)', boxShadow: '0 6px 18px rgba(139,92,246,0.35)' }
        : undefined}
    >
      {children}
    </button>
  )
}

export function Stepper({ value, onChange, step = 2.5, min = 0, max = 1500 }: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10))
  return (
    <div className="flex items-center gap-1.5">
      <button
        className="w-9 h-9 rounded-full bg-elevated border border-white/10 text-ink text-lg font-bold btn-brutal flex items-center justify-center"
        onClick={() => onChange(clamp(value - step))}
        aria-label="минус"
      >−</button>
      <button
        className="w-9 h-9 rounded-full bg-elevated border border-white/10 text-ink text-lg font-bold btn-brutal flex items-center justify-center"
        onClick={() => onChange(clamp(value + step))}
        aria-label="плюс"
      >+</button>
    </div>
  )
}

/// Поле ввода числа с клавиатуры (для веса/повторов) — контролируемое,
/// коммит в состояние по blur/Enter.
export function NumberField({ value, onCommit, className = '' }: {
  value: number
  onCommit: (v: number) => void
  className?: string
}) {
  const [text, setText] = useState(() => (Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)))
  const [focused, setFocused] = useState(false)

  // Внешнее изменение (степпер, «как в прошлый раз») подменяет текст, пока не редактируем
  useEffect(() => {
    if (!focused) {
      setText(Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10))
    }
  }, [value, focused])

  const commit = () => {
    const v = parseFloat(text.replace(',', '.'))
    if (!isNaN(v) && v >= 0) {
      const rounded = Math.round(v * 10) / 10
      if (rounded !== value) onCommit(rounded)
      else setText(Number.isInteger(rounded) ? String(rounded) : String(rounded))
    } else {
      setText(Number.isInteger(value) ? String(value) : String(value))
    }
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { setFocused(false); commit() }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className={`bg-elevated border border-white/10 rounded-[14px] text-center text-ink font-bold text-[17px] py-1.5 w-20 outline-none focus:ring-2 ring-accent/60 font-digits ${className}`}
    />
  )
}

/// Переключатель (switch) в стиле тёмной темы
export function Toggle({ checked, onChange, ariaLabel }: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel?: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative w-[52px] h-[32px] rounded-full border transition-colors duration-200 shrink-0 ${
        checked ? 'bg-accent border-transparent' : 'bg-elevated border-white/10'
      }`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white transition-all duration-200 ${
          checked ? 'left-[23px]' : 'left-1'
        }`}
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.45)' }}
      />
    </button>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[12px] font-bold uppercase tracking-[0.12em] text-text-secondary mb-2">
      {children}
    </h2>
  )
}

export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-5xl mb-3">{emoji}</div>
      <div className="text-ink font-bold text-[16px]">{title}</div>
      {subtitle && <div className="text-text-secondary text-[13px] mt-1">{subtitle}</div>}
    </div>
  )
}

// MARK: - Модальное окно (нижний шит на телефоне)
export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-white/10 rounded-t-[24px] sm:rounded-[24px] w-full sm:max-w-md p-5 max-h-[85vh] overflow-y-auto safe-bottom">
        {children}
      </div>
    </div>
  )
}
