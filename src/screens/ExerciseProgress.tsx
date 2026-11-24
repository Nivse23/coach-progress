// Прогресс по одному упражнению: две кривые (вес и повторения) + история
import { CATEGORIES } from '../exercises'
import { IconBack } from '../icons'
import type { Workout } from '../types'
import { exerciseProgress, fmtSets, type ProgressPoint } from '../workoutStats'

const fmtShort = (d: string) => new Date(d + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

function DualChart({ points }: { points: ProgressPoint[] }) {
  const wPts = points.filter((p) => p.weight !== undefined)
  const rPts = points.filter((p) => p.reps !== undefined)
  if (points.length < 2) return <p className="muted center small">График появится после 2-й тренировки с этим упражнением</p>

  const W = 340
  const H = 190
  const pad = { l: 34, r: 34, t: 14, b: 24 }
  const t0 = +new Date(points[0].date)
  const t1 = +new Date(points[points.length - 1].date)
  const x = (d: string) => pad.l + ((+new Date(d) - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r)

  // У каждой кривой своя шкала: вес — слева, повторения — справа
  const scale = (vals: number[]) => {
    let min = Math.min(...vals)
    let max = Math.max(...vals)
    if (max - min < 2) {
      min = Math.max(0, min - 1)
      max += 1
    }
    return { min, max, y: (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b) }
  }
  const sw = wPts.length ? scale(wPts.map((p) => p.weight!)) : null
  const sr = rPts.length ? scale(rPts.map((p) => p.reps!)) : null
  const line = (pts: ProgressPoint[], y: (v: number) => number, key: 'weight' | 'reps') =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p[key]!).toFixed(1)}`).join(' ')
  const lab = (v: number) => (Number.isInteger(v) ? v : v.toFixed(1))

  return (
    <>
      <div className="legend">
        <span className="lg-w">Вес, кг</span>
        <span className="lg-r">Повторения</span>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Прогресс: вес и повторения">
        {[0, 0.5, 1].map((k) => {
          const yy = pad.t + k * (H - pad.t - pad.b)
          return (
            <g key={k}>
              <line x1={pad.l} x2={W - pad.r} y1={yy} y2={yy} className="grid" />
              {sw && (
                <text x={pad.l - 6} y={yy + 4} textAnchor="end" className="axis axis-w">
                  {lab(sw.max - k * (sw.max - sw.min))}
                </text>
              )}
              {sr && (
                <text x={W - pad.r + 6} y={yy + 4} className="axis">
                  {lab(sr.max - k * (sr.max - sr.min))}
                </text>
              )}
            </g>
          )
        })}
        <text x={pad.l} y={H - 4} className="axis">
          {fmtShort(points[0].date)}
        </text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" className="axis">
          {fmtShort(points[points.length - 1].date)}
        </text>
        {sr && rPts.length > 1 && <path d={line(rPts, sr.y, 'reps')} className="line line-r" />}
        {sr && rPts.map((p) => <circle key={'r' + p.date} cx={x(p.date)} cy={sr.y(p.reps!)} r={3} className="dot-r" />)}
        {sw && wPts.length > 1 && <path d={line(wPts, sw.y, 'weight')} className="line" />}
        {sw && wPts.map((p) => <circle key={'w' + p.date} cx={x(p.date)} cy={sw.y(p.weight!)} r={3.5} className="dot" />)}
      </svg>
    </>
  )
}

export default function ExerciseProgress({
  name,
  subtitle,
  workouts,
  onClose,
}: {
  name: string
  subtitle?: string // имя ученика (в совместной тренировке)
  workouts: Workout[]
  onClose: () => void
}) {
  const points = exerciseProgress(workouts, name)
  const cat = CATEGORIES.find((c) => workouts.some((w) => w.exercises.some((e) => e.name === name && e.category === c.id)))
  const weights = points.map((p) => p.weight).filter((n): n is number => n !== undefined)
  const first = points.find((p) => p.weight !== undefined)?.weight
  const best = weights.length ? Math.max(...weights) : undefined
  const bestReps = Math.max(0, ...points.map((p) => p.reps ?? 0)) || undefined
  const gain = first !== undefined && best !== undefined ? +(best - first).toFixed(1) : undefined

  return (
    <div className="sheet">
      <button className="back" onClick={onClose}>
        <IconBack /> К тренировке
      </button>
      <div className="eyebrow">
        {subtitle ? `${subtitle} · ` : ''}
        {cat?.name ?? 'Упражнение'}
      </div>
      <h1 style={{ fontSize: 22, marginBottom: 14 }}>{name}</h1>

      <div className="kpis">
        <div className="kpi hero">
          <b className="num">{best ?? '—'}</b>
          <span>макс. вес, кг</span>
        </div>
        <div className="kpi">
          <b className="num accent">{gain === undefined ? '—' : gain > 0 ? `+${gain}` : gain}</b>
          <span>прирост, кг</span>
        </div>
        <div className="kpi">
          <b className="num">{bestReps ?? '—'}</b>
          <span>макс. повторов</span>
        </div>
      </div>

      <div className="card">
        <DualChart points={points} />
        <p className="muted small" style={{ margin: 0 }}>
          На графике — максимальный вес и максимум повторений за каждую тренировку.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 6 }}>История · {points.length}</h2>
        <ul className="weights">
          {[...points].reverse().map((p) => (
            <li key={p.date} style={{ gridTemplateColumns: '90px 1fr' }}>
              <span className="muted">{fmtShort(p.date)}</span>
              <span>{fmtSets(p.sets)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
