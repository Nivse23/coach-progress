// Выбор упражнений из каталога (по группам мышц) для тренировки
import { useEffect, useState } from 'react'
import { db } from '../db'
import { CATEGORIES } from '../exercises'
import { IconClose } from '../icons'
import { haptic } from '../telegram'
import type { CustomExercise } from '../types'

export default function ExercisePicker({
  added,
  onAdd,
  onClose,
}: {
  added: Set<string>
  onAdd: (name: string, category: string) => void
  onClose: () => void
}) {
  const [cat, setCat] = useState(CATEGORIES[0].id)
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState<CustomExercise[]>([])

  useEffect(() => {
    db.listCustomExercises().then(setCustom)
  }, [])

  const query = q.trim().toLowerCase()
  // При поиске ищем по всем группам, иначе показываем выбранную
  const groups = CATEGORIES.filter((c) => query || c.id === cat)
    .map((c) => ({
      ...c,
      list: [...c.items, ...custom.filter((e) => e.category === c.id).map((e) => e.name)].filter(
        (n) => !query || n.toLowerCase().includes(query),
      ),
    }))
    .filter((c) => c.list.length)

  return (
    <div className="sheet">
      <div className="sheet-head">
        <h2>Добавить упражнение</h2>
        <button className="btn primary small" onClick={onClose}>
          Готово
        </button>
      </div>
      <input className="search" placeholder="Поиск упражнения" value={q} onChange={(e) => setQ(e.target.value)} />
      {!query && (
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={cat === c.id ? 'chip active' : 'chip'} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {groups.length === 0 && <p className="muted center">Ничего не найдено</p>}
      {groups.map((c) => (
        <section key={c.id} className="card">
          {query && <div className="eyebrow" style={{ marginBottom: 4 }}>{c.name}</div>}
          <ul className="ex-list">
            {c.list.map((name) => {
              const isAdded = added.has(name)
              return (
                <li
                  key={name}
                  className="pick"
                  onClick={() => {
                    if (isAdded) return
                    haptic()
                    onAdd(name, c.id)
                  }}
                >
                  <span className="grow">{name}</span>
                  {isAdded ? <span className="tag">добавлено</span> : <span className="plus">+</span>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <button className="icon sheet-close" onClick={onClose} aria-label="Закрыть">
        <IconClose />
      </button>
    </div>
  )
}
