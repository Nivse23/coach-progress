import { useState } from 'react'
import { daysSince, db, newId, today } from '../db'
import { IconClose, IconPlus } from '../icons'
import { confirmAsk, haptic } from '../telegram'
import type { WeightEntry } from '../types'

const fmtDate = (d: string) => new Date(d + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

const PERIODS = [
  { key: '1m', label: '1 мес', days: 31 },
  { key: '3m', label: '3 мес', days: 92 },
  { key: '6m', label: '6 мес', days: 183 },
  { key: 'all', label: 'Всё', days: Infinity },
] as const

function WeightChart({ data }: { data: WeightEntry[] }) {
  if (data.length < 2) return <p className="muted center small">Нужно минимум 2 замера за период, чтобы построить график</p>
  const W = 340
  const H = 170
  const pad = { l: 34, r: 12, t: 12, b: 22 }
  const ws = data.map((d) => d.weightKg)
  let min = Math.min(...ws)
  let max = Math.max(...ws)
  if (max - min < 2) {
    min -= 1
    max += 1
  }
  const t0 = +new Date(data[0].date)
  const t1 = +new Date(data[data.length - 1].date)
  const x = (d: string) => pad.l + ((+new Date(d) - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r)
  const y = (w: number) => pad.t + (1 - (w - min) / (max - min)) * (H - pad.t - pad.b)
  const pts = data.map((d) => [x(d.date), y(d.weightKg)] as const)
  const path = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const area = `${path} L${pts.at(-1)![0].toFixed(1)},${H - pad.b} L${pts[0][0].toFixed(1)},${H - pad.b} Z`
  const ticks = [min, (min + max) / 2, max]

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="График веса">
      <defs>
        <linearGradient id="wfill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b6f34a" stopOpacity="0.28" />
          <stop offset="1" stopColor="#b6f34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </text>
        </g>
      ))}
      <text x={pad.l} y={H - 4} className="axis">
        {fmtDate(data[0].date)}
      </text>
      <text x={W - pad.r} y={H - 4} textAnchor="end" className="axis">
        {fmtDate(data[data.length - 1].date)}
      </text>
      <path d={area} fill="url(#wfill)" />
      <path d={path} className="line" />
      {pts.map(([px, py], i) => (
        <circle key={data[i].id} cx={px} cy={py} r={i === pts.length - 1 ? 5 : 3.5} className={i === pts.length - 1 ? 'last' : 'dot'} />
      ))}
    </svg>
  )
}

export default function WeightSection({
  clientId,
  weights,
  onChange,
}: {
  clientId: string
  weights: WeightEntry[]
  onChange: () => void
}) {
  const [date, setDate] = useState(today())
  const [kg, setKg] = useState('')
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('3m')

  const days = PERIODS.find((p) => p.key === period)!.days
  const inPeriod = weights.filter((w) => daysSince(w.date) <= days)
  const change = inPeriod.length > 1 ? +(inPeriod.at(-1)!.weightKg - inPeriod[0].weightKg).toFixed(1) : undefined

  async function add() {
    const w = parseFloat(kg.replace(',', '.'))
    if (!Number.isFinite(w) || w <= 0) {
      haptic('error')
      return
    }
    await db.saveWeight({ id: newId(), clientId, date, weightKg: w })
    setKg('')
    haptic('success')
    onChange()
  }

  async function remove(e: WeightEntry) {
    if (!(await confirmAsk(`Удалить замер ${e.weightKg} кг от ${fmtDate(e.date)}?`))) return
    await db.deleteWeight(e.id)
    onChange()
  }

  return (
    <>
      <div className="card">
        <div className="chips">
          {PERIODS.map((p) => (
            <button key={p.key} className={period === p.key ? 'chip active' : 'chip'} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="period-sum">
          <span className={'num ' + (change ? (change < 0 ? 'down' : 'up') : '')}>
            {change === undefined ? '—' : `${change > 0 ? '+' : ''}${change} кг`}
          </span>
          <span className="muted small">изменение за период</span>
        </div>
        <WeightChart data={inPeriod} />
      </div>

      <div className="card">
        <div className="add-row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input inputMode="decimal" placeholder="Вес, кг" value={kg} onChange={(e) => setKg(e.target.value)} />
          <button className="btn primary" onClick={add} aria-label="Добавить замер">
            <IconPlus />
          </button>
        </div>
        <ul className="weights">
          {[...weights].reverse().map((w, i, arr) => {
            const prev = arr[i + 1]
            const d = prev ? +(w.weightKg - prev.weightKg).toFixed(1) : undefined
            return (
              <li key={w.id}>
                <span>{new Date(w.date + 'T00:00').toLocaleDateString('ru-RU')}</span>
                <b className="num">{w.weightKg} кг</b>
                <span className={d ? (d < 0 ? 'down' : 'up') : 'muted'}>{d ? (d > 0 ? `+${d}` : d) : ''}</span>
                <button className="icon" onClick={() => remove(w)} aria-label="Удалить">
                  <IconClose />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
