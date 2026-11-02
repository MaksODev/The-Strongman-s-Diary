// MARK: - Шкала-линейка: тяни пальцем или тапай для прыжка.
// Тап по центральному числу — точный ввод с клавиатуры.
import { useEffect, useRef, useState } from 'react'
import { formatWeight } from '../types'

export function RulerScale({ value, planned, onChange, step = 2.5, min = 0, max = 400, span = 40, majorEvery = 10, unit = 'кг', large = false, className = 'h-11' }: {
  value: number
  planned?: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  /** сколько единиц видно на ленте одновременно */
  span?: number
  majorEvery?: number
  unit?: string
  large?: boolean
  className?: string
}) {
  const STEP = step
  const MIN = min
  const MAX = max
  const SPAN = span
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(240)
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    const measure = () => {
      if (ref.current) setWidth(ref.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const pxPerKg = width / SPAN
  const clampSnap = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v / STEP) * STEP))

  const drag = useRef<{ startX: number; startVal: number; moved: boolean } | null>(null)
  const valueBtnRef = useRef<HTMLButtonElement>(null)
  const lastDragMoved = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    if (editing) return
    // В некоторых окружениях (headless, stylus) захват указателя недоступен — не критично
    try { ref.current?.setPointerCapture(e.pointerId) } catch { /* noop */ }
    drag.current = { startX: e.clientX, startVal: valueRef.current, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 4) d.moved = true
    if (d.moved) onChange(clampSnap(d.startVal + dx / pxPerKg))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    lastDragMoved.current = d.moved
    if (!d.moved && ref.current) {
      // Тап по центральной кнопке значения — там откроется редактор (onClick), прыжок не нужен
      const btn = valueBtnRef.current?.getBoundingClientRect()
      const onValueBtn = btn && e.clientX >= btn.left - 8 && e.clientX <= btn.right + 8
      // NB: setPointerCapture перенаправляет click на контейнер, поэтому редактор
      // открываем здесь, а не по onClick кнопки.
      if (onValueBtn) {
        setDraftText(formatWeight(valueRef.current))
        setEditing(true)
        return
      }
      // Тап: прыжок к точке касания относительно центра
      const rect = ref.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      onChange(clampSnap(valueRef.current + (x - width / 2) / pxPerKg))
    }
  }

  // Риски вокруг текущего значения
  const first = Math.max(MIN, Math.floor((value - SPAN / 2) / STEP) * STEP)
  const ticks: number[] = []
  for (let v = first; v <= Math.min(MAX, value + SPAN / 2); v += STEP) ticks.push(v)

  const commitText = () => {
    const v = parseFloat(draftText.replace(',', '.'))
    if (!isNaN(v) && v >= MIN) onChange(clampSnap(v))
    setEditing(false)
  }

  return (
    <div ref={ref}
      className={`relative flex-1 min-w-0 rounded-[14px] bg-elevated border border-white/10 overflow-hidden touch-none select-none cursor-ew-resize ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { drag.current = null }}>
      {/* Риски ленты */}
      {ticks.map((v) => {
        const offset = (v - value) * pxPerKg
        const major = Math.abs(v / majorEvery - Math.round(v / majorEvery)) < 1e-6
        return (
          <div key={v} className="absolute bottom-0 pointer-events-none" style={{ left: `calc(50% + ${offset}px)` }}>
            <div className={`w-px mx-auto ${major ? 'h-2.5 bg-white/35' : 'h-1.5 bg-white/15'}`} />
            {major && (
              <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-1 text-[8px] font-semibold text-text-disabled whitespace-nowrap">
                {v}
              </div>
            )}
          </div>
        )
      })}
      {/* Маркер плана */}
      {planned != null && planned > 0 && Math.abs(planned - value) < SPAN / 2 && (
        <div className="absolute bottom-0 pointer-events-none" style={{ left: `calc(50% + ${(planned - value) * pxPerKg}px)` }}>
          <div className="w-[3px] h-2 rounded-full bg-flash -translate-x-1/2" />
        </div>
      )}
      {/* Затемнение краёв */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-elevated to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-elevated to-transparent pointer-events-none" />
      {/* Центральное риско-указатель */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[2px] h-2.5 bg-accent rounded-b pointer-events-none" />
      {/* Число по центру */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {editing ? (
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            value={draftText}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setDraftText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-24 bg-transparent text-center text-ink font-digits outline-none pointer-events-auto ${large ? 'text-[26px]' : 'text-[16px]'}`}
          />
        ) : (
          <button
            ref={valueBtnRef}
            onClick={() => {
              // Клик после перетаскивания (жест начался на кнопке) не открывает редактор
              if (lastDragMoved.current) return
              setDraftText(formatWeight(value))
              setEditing(true)
            }}
            className={`pointer-events-auto font-digits text-ink bg-elevated/90 px-1.5 rounded-md ${large ? 'text-[26px]' : 'text-[16px]'}`}
            aria-label="ввести значение вручную"
          >{formatWeight(value)}</button>
        )}
        <span className={`text-text-secondary ml-1 mt-0.5 ${large ? 'text-[13px]' : 'text-[10px]'}`}>{unit}</span>
      </div>
    </div>
  )
}
