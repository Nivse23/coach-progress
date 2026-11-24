import { useEffect, useState } from 'react'
import { db, newId, today } from '../db'
import { IconClose } from '../icons'
import { confirmAsk, haptic } from '../telegram'
import { MEASURE_FIELDS, type MeasureKey, type Measurement } from '../types'

const fmt = (d: string) => new Date(d + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })

export default function MeasureSection({ clientId }: { clientId: string }) {
  const [list, setList] = useState<Measurement[]>([])
  const [adding, setAdding] = useState(false)
  const [date, setDate] = useState(today())
  const [vals, setVals] = useState<Partial<Record<MeasureKey, string>>>({})

  const reload = () => db.listMeasurements(clientId).then(setList)
  useEffect(() => {
    reload()
  }, [clientId])

  async function save() {
    const values: Measurement['values'] = {}
    for (const f of MEASURE_FIELDS) {
      const n = parseFloat((vals[f.key] ?? '').replace(',', '.'))
      if (Number.isFinite(n) && n > 0) values[f.key] = n
    }
    if (!Object.keys(values).length) {
      haptic('error')
      return
    }
    await db.saveMeasurement({ id: newId(), clientId, date, values })
    setVals({})
    setAdding(false)
    haptic('success')
    reload()
  }

  async function remove(m: Measurement) {
    if (!(await confirmAsk(`Удалить замеры от ${fmt(m.date)}?`))) return
    await db.deleteMeasurement(m.id)
    reload()
  }

  const first = list[0]
  const last = list.at(-1)
  // Для каждого показателя — первое и последнее известное значение
  const firstOf = (k: MeasureKey) => list.find((m) => m.values[k] !== undefined)?.values[k]
  const lastOf = (k: MeasureKey) => [...list].reverse().find((m) => m.values[k] !== undefined)?.values[k]
  const rows = MEASURE_FIELDS.filter((f) => lastOf(f.key) !== undefined)

  return (
    <>
      {!adding && (
        <button className="btn primary block" style={{ marginBottom: 12 }} onClick={() => setAdding(true)}>
          Внести замеры
        </button>
      )}

      {adding && (
        <div className="card form">
          <div className="row2">
            <h2 style={{ alignSelf: 'center' }}>Новые замеры</h2>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="row3">
            {MEASURE_FIELDS.map((f) => (
              <label key={f.key}>
                {f.label}, см
                <input
                  inputMode="decimal"
                  value={vals[f.key] ?? ''}
                  onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="actions">
            <button className="btn" onClick={() => setAdding(false)}>
              Отмена
            </button>
            <button className="btn primary" onClick={save}>
              Сохранить
            </button>
          </div>
        </div>
      )}

      {list.length === 0 && !adding && <p className="muted center small">Замеров пока нет</p>}

      {rows.length > 0 && first && last && (
        <div className="card">
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>Динамика</h2>
            <span className="muted small">
              {list.length > 1 ? `${fmt(first.date)} → ${fmt(last.date)}` : fmt(last.date)}
            </span>
          </div>
          <table className="mtable">
            <thead>
              <tr>
                <th>Показатель</th>
                {list.length > 1 && <th>Было</th>}
                <th>Сейчас</th>
                {list.length > 1 && <th>Δ</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const a = firstOf(f.key)
                const b = lastOf(f.key)!
                const d = a !== undefined ? +(b - a).toFixed(1) : undefined
                return (
                  <tr key={f.key}>
                    <td>{f.label}</td>
                    {list.length > 1 && <td className="muted">{a ?? '—'}</td>}
                    <td className="num">{b}</td>
                    {list.length > 1 && (
                      <td className={d ? (d < 0 ? 'down' : 'up') : 'muted'}>{d ? (d > 0 ? `+${d}` : d) : '0'}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {list.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 6 }}>История</h2>
          <ul className="weights">
            {[...list].reverse().map((m) => (
              <li key={m.id} style={{ gridTemplateColumns: '1fr auto' }}>
                <span>
                  {fmt(m.date)}
                  <div className="muted small">
                    {MEASURE_FIELDS.filter((f) => m.values[f.key] !== undefined)
                      .map((f) => `${f.label} ${m.values[f.key]}`)
                      .join(' · ')}
                  </div>
                </span>
                <button className="icon" onClick={() => remove(m)} aria-label="Удалить">
                  <IconClose />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
