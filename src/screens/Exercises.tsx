import { useEffect, useState } from 'react'
import { db, newId } from '../db'
import { CATEGORIES } from '../exercises'
import { IconClose } from '../icons'
import { confirmAsk, haptic } from '../telegram'
import type { CustomExercise } from '../types'

export default function Exercises() {
  const [cat, setCat] = useState<string>('all')
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState<CustomExercise[]>([])
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState(CATEGORIES[0].id)

  const reload = () => db.listCustomExercises().then(setCustom)
  useEffect(() => {
    reload()
  }, [])

  const query = q.trim().toLowerCase()
  const cats = CATEGORIES.filter((c) => cat === 'all' || c.id === cat)
    .map((c) => ({
      ...c,
      list: [
        ...c.items.map((name) => ({ name, custom: undefined as CustomExercise | undefined })),
        ...custom.filter((e) => e.category === c.id).map((e) => ({ name: e.name, custom: e })),
      ].filter((e) => !query || e.name.toLowerCase().includes(query)),
    }))
    .filter((c) => c.list.length > 0)

  async function add() {
    if (!newName.trim()) return
    await db.saveCustomExercise({ id: newId(), category: newCat, name: newName.trim() })
    setNewName('')
    setAdding(false)
    haptic('success')
    reload()
  }

  async function remove(e: CustomExercise) {
    if (!(await confirmAsk(`Удалить упражнение «${e.name}»?`))) return
    await db.deleteCustomExercise(e.id)
    reload()
  }

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Библиотека</div>
          <h1>Упражнения</h1>
        </div>
        <button className="btn primary small" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Отмена' : '+ Своё'}
        </button>
      </header>

      {adding && (
        <div className="card form">
          <label>
            Группа мышц
            <select value={newCat} onChange={(e) => setNewCat(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Название
            <input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          </label>
          <button className="btn primary block" onClick={add}>
            Добавить
          </button>
        </div>
      )}

      <input className="search" placeholder="Поиск упражнения" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="chips">
        <button className={cat === 'all' ? 'chip active' : 'chip'} onClick={() => setCat('all')}>
          Все
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={cat === c.id ? 'chip active' : 'chip'} onClick={() => setCat(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {cats.length === 0 && <p className="muted center">Ничего не найдено</p>}

      {cats.map((c) => (
        <section key={c.id} className="card">
          <div className="cat-title">
            <h2>{c.name}</h2>
            <span className="tag">{c.list.length}</span>
          </div>
          <ul className="ex-list">
            {c.list.map((e) => (
              <li key={e.custom?.id ?? e.name}>
                <span className="grow">{e.name}</span>
                {e.custom && (
                  <>
                    <span className="tag">своё</span>
                    <button className="icon" onClick={() => remove(e.custom!)} aria-label="Удалить">
                      <IconClose />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
