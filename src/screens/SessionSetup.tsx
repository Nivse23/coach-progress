// Выбор учеников, которые тренируются вместе
import { useEffect, useState } from 'react'
import type { Nav } from '../App'
import { db, today } from '../db'
import { haptic } from '../telegram'
import type { Client } from '../types'

export default function SessionSetup({ nav, preselect, date }: { nav: Nav; preselect?: string; date?: string }) {
  const [clients, setClients] = useState<Client[]>([])
  const [picked, setPicked] = useState<string[]>(preselect ? [preselect] : [])
  const [q, setQ] = useState('')

  useEffect(() => {
    db.listClients().then(setClients)
  }, [])

  const toggle = (id: string) => {
    haptic()
    setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }
  const filtered = clients.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(q.trim().toLowerCase()),
  )

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Совместная тренировка</div>
          <h1>Кто тренируется?</h1>
        </div>
      </header>
      <p className="muted small" style={{ marginTop: -6 }}>
        Отметьте учеников — их подходы будут на одном экране.
      </p>

      {clients.length > 5 && (
        <input className="search" placeholder="Поиск по имени" value={q} onChange={(e) => setQ(e.target.value)} />
      )}

      <ul className="list">
        {filtered.map((c) => {
          const idx = picked.indexOf(c.id)
          return (
            <li key={c.id} className={idx >= 0 ? 'list-item picked' : 'list-item'} onClick={() => toggle(c.id)}>
              <div className="avatar">{(c.firstName[0] ?? '') + (c.lastName[0] ?? '')}</div>
              <div className="grow title">
                {c.firstName} {c.lastName}
              </div>
              <span className={idx >= 0 ? 'check on' : 'check'}>{idx >= 0 ? idx + 1 : ''}</span>
            </li>
          )
        })}
      </ul>

      <div className="sticky-bottom">
        <button
          className="btn primary block"
          disabled={picked.length === 0}
          onClick={() => nav.replace({ name: 'session', ids: picked, date: date ?? today() })}
        >
          Начать тренировку{picked.length ? ` · ${picked.length}` : ''}
        </button>
      </div>
    </>
  )
}
