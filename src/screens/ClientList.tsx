// Главный экран тренера: обзор команды, активность, быстрые действия, список учеников
import { useEffect, useState } from 'react'
import type { Nav } from '../App'
import { ago, daysSince, db, type ActivityEvent } from '../db'
import { IconCamera, IconChevron, IconDumbbell, IconPlus, IconRuler, IconScale, IconUsers } from '../icons'
import { tg } from '../telegram'
import type { Client } from '../types'

const ACTIVE_DAYS = 7

interface Row extends Client {
  lastWeight?: number
  lastActivity?: string
}

const feedIcon = { weight: <IconScale />, measure: <IconRuler />, photo: <IconCamera />, workout: <IconDumbbell /> }

export default function ClientList({ nav }: { nav: Nav }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    ;(async () => {
      const [clients, act] = await Promise.all([db.listClients(), db.activity()])
      const withData = await Promise.all(
        clients.map(async (c) => {
          const w = await db.listWeights(c.id)
          return {
            ...c,
            lastWeight: w.at(-1)?.weightKg,
            lastActivity: act.find((e) => e.clientId === c.id)?.date,
          }
        }),
      )
      setRows(withData)
      setEvents(act)
    })()
  }, [])

  const names = new Map((rows ?? []).map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]))
  const isActive = (c: Row) => !!c.lastActivity && daysSince(c.lastActivity) <= ACTIVE_DAYS
  const activeCount = (rows ?? []).filter(isActive).length
  const weekUpdates = events.filter((e) => daysSince(e.date) <= ACTIVE_DAYS).length
  const coachName = tg?.initDataUnsafe?.user?.first_name

  const filtered = (rows ?? []).filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(q.trim().toLowerCase()),
  )

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Coach Progress</div>
          <h1>{coachName ? `Привет, ${coachName}` : 'Кабинет тренера'}</h1>
        </div>
      </header>

      <div className="kpis">
        <div className="kpi hero">
          <b className="num">{rows?.length ?? '—'}</b>
          <span>учеников</span>
        </div>
        <div className="kpi">
          <b className="num">{rows ? activeCount : '—'}</b>
          <span>активны за 7 дн.</span>
        </div>
        <div className="kpi">
          <b className="num accent">{rows ? weekUpdates : '—'}</b>
          <span>обновлений</span>
        </div>
      </div>

      <div className="quick">
        <button className="btn primary" onClick={() => nav.push({ name: 'clientForm' })}>
          <IconPlus /> Ученик
        </button>
        <button className="btn" onClick={() => nav.push({ name: 'sessionSetup' })}>
          <IconDumbbell /> Тренировка
        </button>
      </div>

      {events.length > 0 && (
        <>
          <div className="section-head">
            <h2>Последние обновления</h2>
          </div>
          <div className="card">
            <ul className="feed">
              {events.slice(0, 5).map((e, i) => (
                <li key={i} onClick={() => nav.push({ name: 'client', id: e.clientId })}>
                  <div className="feed-ic">{feedIcon[e.kind]}</div>
                  <div className="grow">
                    <div>{names.get(e.clientId) ?? 'Ученик'}</div>
                    <div className="muted small">{e.text}</div>
                  </div>
                  <span className="muted small">{ago(e.date)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="section-head">
        <h2>Ученики</h2>
        {rows && rows.length > 0 && <span className="muted small">{rows.length}</span>}
      </div>

      {rows && rows.length > 3 && (
        <input className="search" placeholder="Поиск по имени" value={q} onChange={(e) => setQ(e.target.value)} />
      )}

      {rows === null && <p className="muted center">Загрузка…</p>}

      {rows?.length === 0 && (
        <div className="empty">
          <div className="empty-ic">
            <IconUsers />
          </div>
          <p className="muted">Пока нет учеников</p>
          <button className="btn primary" onClick={() => nav.push({ name: 'clientForm' })}>
            Добавить первого ученика
          </button>
        </div>
      )}

      <ul className="list">
        {filtered.map((c) => (
          <li key={c.id} className="list-item" onClick={() => nav.push({ name: 'client', id: c.id })}>
            <div className="avatar">{(c.firstName[0] ?? '') + (c.lastName[0] ?? '')}</div>
            <div className="grow">
              <div className="title">
                {c.firstName} {c.lastName}
              </div>
              <span className={isActive(c) ? 'status on' : 'status'}>
                {c.lastActivity ? `обновлено ${ago(c.lastActivity)}` : 'нет данных'}
              </span>
            </div>
            {c.lastWeight && (
              <div className="right">
                <div className="num">{c.lastWeight}</div>
                <div className="muted small">кг</div>
              </div>
            )}
            <span className="chev">
              <IconChevron />
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
