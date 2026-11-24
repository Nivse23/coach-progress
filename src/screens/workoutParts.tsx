// Общие части дневника тренировок: выбор даты, редактор подходов, загрузка/сохранение
import { useEffect, useState } from 'react'
import { addDays, db, today } from '../db'
import { CATEGORIES } from '../exercises'
import { IconBack, IconChevron, IconClose, IconPlus } from '../icons'
import type { Workout, WorkoutExercise, WorkoutSet } from '../types'
import { fmtSets } from '../workoutStats'

export const catName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? ''
export const fmtShort = (d: string) =>
  new Date(d + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
export const emptySet = (): WorkoutSet => ({ w: '', r: '' })

const dayLabel = (d: string) => {
  const s = new Date(d + 'T00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  return s[0].toUpperCase() + s.slice(1)
}

/** Последний раз, когда упражнение делали до даты */
export const prevOf = (list: Workout[], date: string, name: string) =>
  [...list]
    .filter((w) => w.date < date)
    .reverse()
    .map((w) => w.exercises.find((e) => e.name === name))
    .find((e) => e && fmtSets(e.sets))

/** Тренировки нескольких учеников с автосохранением */
export function useWorkouts(ids: string[]) {
  const [byClient, setBy] = useState<Record<string, Workout[]>>({})
  const key = ids.join(',')

  useEffect(() => {
    Promise.all(ids.map((id) => db.listWorkouts(id))).then((ls) =>
      setBy(Object.fromEntries(ids.map((id, i) => [id, ls[i]]))),
    )
  }, [key])

  // Сохраняем при каждом изменении; пустую тренировку удаляем
  function commit(clientId: string, date: string, exs: WorkoutExercise[]) {
    const w: Workout = { id: `${clientId}_${date}`, clientId, date, exercises: exs }
    setBy((s) => {
      const rest = (s[clientId] ?? []).filter((x) => x.date !== date)
      return { ...s, [clientId]: exs.length ? [...rest, w].sort((a, b) => a.date.localeCompare(b.date)) : rest }
    })
    if (exs.length) db.saveWorkout(w)
    else db.deleteWorkout(w.id)
  }

  const exercisesOf = (clientId: string, date: string) =>
    byClient[clientId]?.find((w) => w.date === date)?.exercises ?? []

  return { byClient, commit, exercisesOf }
}

export function DateBar({ date, setDate }: { date: string; setDate: (d: string) => void }) {
  return (
    <div className="card date-bar">
      <button className="icon" onClick={() => setDate(addDays(date, -1))} aria-label="Предыдущий день">
        <IconBack />
      </button>
      <label className="date-pick">
        <b>{dayLabel(date)}</b>
        <span className="muted small">{date === today() ? 'сегодня' : 'нажмите, чтобы выбрать дату'}</span>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <button className="icon" onClick={() => setDate(addDays(date, 1))} aria-label="Следующий день">
        <IconChevron />
      </button>
    </div>
  )
}

/** Строки подходов «вес × повторы»; серым — подсказка из прошлой тренировки */
export function SetsEditor({
  sets,
  prev,
  onChange,
}: {
  sets: WorkoutSet[]
  prev?: WorkoutSet[]
  onChange: (sets: WorkoutSet[]) => void
}) {
  const setVal = (i: number, key: 'w' | 'r', v: string) =>
    onChange(sets.map((s, j) => (j === i ? { ...s, [key]: v } : s)))

  return (
    <>
      <div className="sets">
        <div className="set-row set-head">
          <span>#</span>
          <span>Вес, кг</span>
          <span>Повторы</span>
          <span />
        </div>
        {sets.map((s, i) => (
          <div key={i} className="set-row">
            <span className="set-n">{i + 1}</span>
            <input
              inputMode="decimal"
              placeholder={prev?.[i]?.w || '—'}
              value={s.w}
              onChange={(ev) => setVal(i, 'w', ev.target.value)}
            />
            <input
              inputMode="numeric"
              placeholder={prev?.[i]?.r || '—'}
              value={s.r}
              onChange={(ev) => setVal(i, 'r', ev.target.value)}
            />
            <button className="icon" onClick={() => onChange(sets.filter((_, j) => j !== i))} aria-label="Удалить подход">
              <IconClose />
            </button>
          </div>
        ))}
      </div>
      <button className="btn small block" onClick={() => onChange([...sets, { ...(sets.at(-1) ?? emptySet()) }])}>
        <IconPlus /> Подход
      </button>
    </>
  )
}

/** Новое упражнение: столько же подходов, сколько было в прошлый раз */
export const newSets = (prev?: WorkoutExercise) =>
  Array.from({ length: Math.max(1, prev?.sets.length ?? 1) }, emptySet)
