import { useEffect, useState } from 'react'
import type { Nav } from '../App'
import { db, newId, today } from '../db'
import { haptic } from '../telegram'
import type { Client } from '../types'

export default function ClientForm({ id, nav }: { id?: string; nav: Nav }) {
  const isNew = !id
  const [existing, setExisting] = useState<Client>()
  const [f, setF] = useState({
    firstName: '',
    lastName: '',
    heightCm: '',
    weightKg: '', // только при создании — станет первой записью веса
    targetWeightKg: '',
    birthDate: '',
    phone: '',
    goal: '',
    notes: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    db.getClient(id).then((c) => {
      if (!c) return
      setExisting(c)
      setF((s) => ({
        ...s,
        firstName: c.firstName,
        lastName: c.lastName,
        heightCm: c.heightCm?.toString() ?? '',
        targetWeightKg: c.targetWeightKg?.toString() ?? '',
        birthDate: c.birthDate ?? '',
        phone: c.phone ?? '',
        goal: c.goal ?? '',
        notes: c.notes ?? '',
      }))
    })
  }, [id])

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }))

  const num = (s: string) => {
    const n = parseFloat(s.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : undefined
  }

  async function save() {
    if (!f.firstName.trim()) {
      setError('Укажите имя')
      haptic('error')
      return
    }
    const client: Client = {
      id: existing?.id ?? newId(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      heightCm: num(f.heightCm),
      targetWeightKg: num(f.targetWeightKg),
      birthDate: f.birthDate || undefined,
      phone: f.phone.trim() || undefined,
      goal: f.goal.trim() || undefined,
      notes: f.notes.trim() || undefined,
    }
    await db.saveClient(client)
    const w = num(f.weightKg)
    if (isNew && w) await db.saveWeight({ id: newId(), clientId: client.id, date: today(), weightKg: w })
    haptic('success')
    if (isNew) nav.replace({ name: 'client', id: client.id })
    else nav.back()
  }

  return (
    <>
      <header className="top">
        <h1>{isNew ? 'Новый ученик' : 'Редактировать'}</h1>
      </header>
      <div className="form">
        <label>
          Имя *
          <input value={f.firstName} onChange={set('firstName')} autoFocus={isNew} />
        </label>
        <label>
          Фамилия
          <input value={f.lastName} onChange={set('lastName')} />
        </label>
        <div className={isNew ? 'row3' : 'row2'}>
          <label>
            Рост, см
            <input inputMode="decimal" value={f.heightCm} onChange={set('heightCm')} />
          </label>
          {isNew && (
            <label>
              Вес, кг
              <input inputMode="decimal" value={f.weightKg} onChange={set('weightKg')} />
            </label>
          )}
          <label>
            Целевой вес, кг
            <input inputMode="decimal" value={f.targetWeightKg} onChange={set('targetWeightKg')} />
          </label>
        </div>
        <label>
          Дата рождения
          <input type="date" value={f.birthDate} onChange={set('birthDate')} />
        </label>
        <label>
          Телефон
          <input type="tel" value={f.phone} onChange={set('phone')} />
        </label>
        <label>
          Направление
          <input placeholder="Похудение, масса, рельеф…" value={f.goal} onChange={set('goal')} />
        </label>
        <label>
          Заметки
          <textarea rows={3} placeholder="Травмы, ограничения, пожелания" value={f.notes} onChange={set('notes')} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" onClick={save}>
          Сохранить
        </button>
      </div>
    </>
  )
}
