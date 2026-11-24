// Набор линейных иконок (единый стиль: 24×24, обводка 2px)
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'ic',
}

export const IconUsers = () => (
  <svg {...base}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.4 3.5 5.2" />
  </svg>
)
export const IconDumbbell = () => (
  <svg {...base}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </svg>
)
export const IconPlus = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const IconScale = () => (
  <svg {...base}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M9 9.5a4 4 0 0 1 6 0L12.5 12" />
  </svg>
)
export const IconRuler = () => (
  <svg {...base}>
    <path d="M3 16.5 16.5 3 21 7.5 7.5 21z" />
    <path d="M7.5 12l2 2M10.5 9l2 2M13.5 6l2 2" />
  </svg>
)
export const IconCamera = () => (
  <svg {...base}>
    <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)
export const IconChevron = () => (
  <svg {...base}>
    <path d="m9 6 6 6-6 6" />
  </svg>
)
export const IconBack = () => (
  <svg {...base}>
    <path d="m15 6-6 6 6 6" />
  </svg>
)
export const IconClose = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const IconFile = () => (
  <svg {...base}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13l6 5M15 13l-6 5" />
  </svg>
)
export const IconCompare = () => (
  <svg {...base}>
    <rect x="3" y="4" width="7.5" height="16" rx="2" />
    <rect x="13.5" y="4" width="7.5" height="16" rx="2" />
  </svg>
)
export const IconShield = () => (
  <svg {...base}>
    <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z" />
    <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
  </svg>
)
export const IconRestore = () => (
  <svg {...base}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" />
    <path d="M3.5 4v4.5H8" />
    <path d="M12 8v4.5l3 1.8" />
  </svg>
)
