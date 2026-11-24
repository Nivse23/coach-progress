// Совместная тренировка: несколько учеников на одном экране.
// Упражнение добавляется сразу всем; у каждого упражнения — подходы каждого ученика.
import { useEffect, useState } from 'react'
import { db, newId } from '../db'
import { IconClose, IconPlus } from '../icons'
import { confirmAsk, haptic } from '../telegram'
import type { Client, WorkoutExercise } from '../types'
import { fmtSets } from '../workoutStats'
import ExercisePicker from './ExercisePicker'
import ExerciseProgress from './ExerciseProgress'
import { catName, DateBar, emptySet, newSets, prevOf, SetsEditor, useWorkouts } from './workoutParts'

const initials = (c: Client) => (c.firstName[0] ?? '') + (c.lastName[0] ?? '')

export default function GroupWorkout({ ids, date: initialDate }: { ids: string[]; date: string }) {
  const [clients, setClients] = useState<Client[]>([])
  const [date, setDate] = useState(initialDate)
  const [picker, setPicker] = useState(false)
  const [progress, setProgress] = useState<{ clientId: string; name: string } | null>(null)
  const { byClient, commit, exercisesOf } = useWorkouts(ids)

  useEffect(() => {
    Promise.all(ids.map((id) => db.getClient(id))).then((cs) => setClients(cs.filter((c): c is Client => !!c)))
  }, [ids.join(',')])

  // Общий список упражнений: объединение по всем ученикам в порядке появления
  const names: { name: string; category: string }[] = []
  for (const c of clients)
    for (const e of exercisesOf(c.id, date))
      if (!names.some((n) => n.name === e.name)) names.push({ name: e.name, category: e.category })

  const listOf = (cid: string) => byClient[cid] ?? []
  const exOf = (cid: string, name: string) => exercisesOf(cid, date).find((e) => e.name === name)

  function addFor(cid: string, name: string, category: string) {
    const exs = exercisesOf(cid, date)
    if (exs.some((e) => e.name === name)) return
    commit(cid, date, [...exs, { id: newId(), name, category, sets: newSets(prevOf(listOf(cid), date, name)) }])
  }

  const addAll = (name: string, category: string) => clients.forEach((c) => addFor(c.id, name, category))

  const updateSets = (cid: string, ex: WorkoutExercise, sets: WorkoutExercise['sets']) =>
    commit(
      cid,
      date,
      exercisesOf(cid, date).map((e) => (e.id === ex.id ? { ...e, sets } : e)),
    )

  async function removeFor(cid: string, name: string) {
    const ex = exOf(cid, name)
    if (!ex) return
    if (fmtSets(ex.sets) && !(await confirmAsk(`Убрать «${name}» у этого ученика?`))) return
    commit(cid, date, exercisesOf(cid, date).filter((e) => e.id !== ex.id))
  }

  async function removeAll(name: string) {
    const hasData = clients.some((c) => fmtSets(exOf(c.id, name)?.sets ?? []))
    if (hasData && !(await confirmAsk(`Убрать «${name}» у всех?`))) return
    for (const c of clients) commit(c.id, date, exercisesOf(c.id, date).filter((e) => e.name !== name))
  }

  // Если на этот день пусто — повторить у каждого его прошлую тренировку
  const lastOf = (cid: string) => listOf(cid).filter((w) => w.date < date).at(-1)
  const canRepeat = names.length === 0 && clients.some((c) => lastOf(c.id))
  function repeatLast() {
    haptic('success')
    for (const c of clients) {
      const last = lastOf(c.id)
      if (last) commit(c.id, date, last.exercises.map((e) => ({ ...e, id: newId(), sets: e.sets.map(emptySet) })))
    }
  }

  // Упражнение отмечено «добавлено» в каталоге, только если оно есть у всех
  const addedForAll = new Set(names.filter((n) => clients.every((c) => exOf(c.id, n.name))).map((n) => n.name))

  if (progress) {
    const c = clients.find((x) => x.id === progress.clientId)
    return (
      <ExerciseProgress
        name={progress.name}
        subtitle={c ? `${c.firstName} ${c.lastName}` : undefined}
        workouts={listOf(progress.clientId)}
        onClose={() => setProgress(null)}
      />
    )
  }

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Совместная тренировка</div>
          <h1>{clients.map((c) => c.firstName).join(' + ') || '…'}</h1>
        </div>
      </header>

      <DateBar date={date} setDate={setDate} />

      {names.length === 0 && (
        <div className="card center">
          <p className="muted" style={{ marginTop: 0 }}>
            Упражнения добавятся сразу всем ученикам
          </p>
          <div className="form">
            <button className="btn primary block" onClick={() => setPicker(true)}>
              <IconPlus /> Добавить упражнение
            </button>
            {canRepeat && (
              <button className="btn block" onClick={repeatLast}>
                Повторить прошлые тренировки
              </button>
            )}
          </div>
        </div>
      )}

      {names.map(({ name, category }) => (
        <div key={name} className="card ex-card">
          <div className="ex-head">
            <div className="grow">
              <div className="eyebrow">{catName(category)}</div>
              <div className="ex-name">{name}</div>
            </div>
            <button className="icon" onClick={() => removeAll(name)} aria-label="Убрать у всех">
              <IconClose />
            </button>
          </div>

          {clients.map((c) => {
            const ex = exOf(c.id, name)
            const prev = prevOf(listOf(c.id), date, name)
            return (
              <div key={c.id} className="person">
                <div className="person-head">
                  <span className="avatar mini">{initials(c)}</span>
                  <div className="grow">
                    <b>{c.firstName}</b>
                    {prev && <div className="muted small">Прошлый раз: {fmtSets(prev.sets)}</div>}
                  </div>
                  {ex && (
                    <>
                      <button className="btn small" onClick={() => setProgress({ clientId: c.id, name })}>
                        График
                      </button>
                      <button className="icon" onClick={() => removeFor(c.id, name)} aria-label="Убрать у ученика">
                        <IconClose />
                      </button>
                    </>
                  )}
                </div>
                {ex ? (
                  <SetsEditor sets={ex.sets} prev={prev?.sets} onChange={(sets) => updateSets(c.id, ex, sets)} />
                ) : (
                  <button className="btn small block" onClick={() => addFor(c.id, name, category)}>
                    <IconPlus /> Добавить это упражнение
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {names.length > 0 && (
        <button className="btn primary block" onClick={() => setPicker(true)}>
          <IconPlus /> Добавить упражнение всем
        </button>
      )}

      {names.length > 0 && (
        <p className="muted small center">
          {clients
            .map((c) => {
              const exs = exercisesOf(c.id, date)
              const sets = exs.reduce((n, e) => n + e.sets.filter((s) => s.w || s.r).length, 0)
              return `${c.firstName}: ${exs.length} упр., ${sets} подх.`
            })
            .join(' · ')}
        </p>
      )}

      {picker && <ExercisePicker added={addedForAll} onAdd={addAll} onClose={() => setPicker(false)} />}

    </>
  )
}
