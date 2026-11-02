// MARK: - SVG-иконки в стиле тёмной темы (обводка 1.8, скруглённые концы)
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  }
}

export function DumbbellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 6.5v11" />
      <path d="M17.5 6.5v11" />
      <path d="M3.5 8.5v7" />
      <path d="M20.5 8.5v7" />
      <path d="M6.5 12h11" />
    </svg>
  )
}

export function CatalogIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h7" />
      <path d="M9 11h5" />
    </svg>
  )
}

export function ProgramIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M9 18h3.5" />
    </svg>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 3.5v16a1.5 1.5 0 0 0 1.5 1.5h16" />
      <path d="M7.5 15.5v-4" />
      <path d="M12 15.5V8" />
      <path d="M16.5 15.5v-6.5" />
    </svg>
  )
}

export function ProfileIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20.2c.9-3.5 3.8-5.2 7.2-5.2s6.3 1.7 7.2 5.2" />
    </svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base({ width: 16, height: 16, ...props })}>
      <path d="M12 20h8" />
      <path d="M16.5 3.9a2.1 2.1 0 0 1 3 3L8 18.4 3.6 19.6 4.8 15.2z" />
    </svg>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base({ width: 15, height: 15, ...props })}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11.2V16" />
      <path d="M12 7.9v.2" />
    </svg>
  )
}

export function FlameIcon(props: IconProps) {
  return (
    <svg {...base({ width: 30, height: 30, ...props })}>
      <path d="M12 2.8c.6 3.4-1.1 5.3-2.6 7C7.6 11.8 6 13.8 6 16.4a6 6 0 0 0 12 0c0-2-0.9-3.6-2-5-.2 1-.7 1.8-1.6 2.4.3-3.6-.9-8.1-2.4-11z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base({ width: 30, height: 30, ...props })}>
      <path d="M12 2.8 4.8 5.6v5.6c0 4.6 3 8 7.2 9.8 4.2-1.8 7.2-5.2 7.2-9.8V5.6z" fill="currentColor" stroke="none" />
      <path d="M8.8 11.6l2.3 2.3 4.2-4.4" stroke="#0a0a0e" strokeWidth="2" fill="none" />
    </svg>
  )
}

export function SproutIcon(props: IconProps) {
  return (
    <svg {...base({ width: 30, height: 30, ...props })}>
      <path d="M12 21.5v-8.5" />
      <path d="M12 13C12 9 9.4 6.8 5 6.8c0 4.6 2.6 6.9 7 6.2z" fill="currentColor" stroke="none" />
      <path d="M12 11.5c0-3.2 2.2-5.3 6.5-5.3 0 4.1-2.3 6.1-6.5 5.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}
