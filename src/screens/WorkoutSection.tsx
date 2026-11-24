// Дневник тренировок одного ученика: дата → упражнения → подходы (вес × повторы)
import { useState } from 'react'
import { newId, today } from '../db'
import { IconChevron, IconClose, IconPlus, IconUsers } from '../icons'
import { confirmAsk, haptic } from '../telegram'
import type { WorkoutExercise } from '../types'
import { doneExercises, fmtSets } from '../workoutStats'
import ExercisePicker from './ExercisePicker'
import ExerciseProgress from './ExerciseProgress'
import { catName, DateBar, emptySet, fmtShort, newSets, prevOf, SetsEditor, useWorkouts } from './workoutParts'

export default function WorkoutSection({
  clientId,
  onGroup,
}: {
  clientId: string
  /** Открыть совместную тренировку с этим учеником на выбранную дату */
  onGroup?: (date: string) => void
}) {
  const { byClient, commit: commitFor, exercisesOf } = useWorkouts([clientId])
  const all = byClient[clientId] ?? []
  const [date, setDate] = useState(today())
  const [picker, setPicker] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  const exercises = exercisesOf(clientId, date)
  const lastWorkout = all.filter((w) => w.date < date).at(-1)
  const commit = (exs: WorkoutExercise[]) => commitFor(clientId, date, exs)
  const updateEx = (id: string, patch: Partial<WorkoutExercise>) =>
    commit(exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  function addExercise(name: string, category: string) {
    commit([...exercises, { id: newId(), name, category, sets: newSets(prevOf(all, date, name)) }])
  }

  function repeatLast() {
    if (!lastWorkout) return
    haptic('success')
    commit(lastWorkout.exercises.map((e) => ({ ...e, id: newId(), sets: e.sets.map(emptySet) })))
  }

  async function removeEx(e: WorkoutExercise) {
    if (fmtSets(e.sets) && !(await confirmAsk(`Убрать «${e.name}» из тренировки?`))) return
    commit(exercises.filter((x) => x.id !== e.id))
  }

  const totalSets = exercises.reduce((n, e) => n + e.sets.filter((s) => s.w || s.r).length, 0)
  const history = doneExercises(all)
  const recentDates = [...all].reverse().slice(0, 12)

  if (progress) return <ExerciseProgress name={progress} workouts={all} onClose={() => setProgress(null)} />

  return (
    <>
      <DateBar date={date} setDate={setDate} />

      {recentDates.length > 0 && (
        <div className="chips">
          {date !== today() && (
            <button className="chip" onClick={() => setDate(today())}>
              Сегодня
            </button>
          )}
          {recentDates.map((w) => (
            <button key={w.id} className={w.date === date ? 'chip active' : 'chip'} onClick={() => setDate(w.date)}>
              {fmtShort(w.date)}
            </button>
          ))}
        </div>
      )}

      {exercises.length === 0 && (
        <div className="card center">
          <p className="muted" style={{ marginTop: 0 }}>
            На этот день тренировки нет
          </p>
          <div className="form">
            <button className="btn primary block" onClick={() => setPicker(true)}>
              <IconPlus /> Добавить упражнение
            </button>
            {lastWorkout && (
              <button className="btn block" onClick={repeatLast}>
                Повторить тренировку от {fmtShort(lastWorkout.date)}
              </button>
            )}
          </div>
        </div>
      )}

      {onGroup && (
        <button className="btn block" style={{ marginBottom: 12 }} onClick={() => onGroup(date)}>
          <IconUsers /> Тренируется вместе с другим учеником
        </button>
      )}

      {exercises.length > 0 && (
        <div className="section-head" style={{ marginTop: 4 }}>
          <h2>Тренировка</h2>
          <span className="muted small">
            {exercises.length} упр. · {totalSets} подх.
          </span>
        </div>
      )}

      {exercises.map((e) => {
        const prev = prevOf(all, date, e.name)
        return (
          <div key={e.id} className="card ex-card">
            <div className="ex-head">
              <div className="grow" onClick={() => setProgress(e.name)} style={{ cursor: 'pointer' }}>
                <div className="eyebrow">{catName(e.category)}</div>
                <div className="ex-name">{e.name}</div>
                {prev && <div className="muted small">Прошлый раз: {fmtSets(prev.sets)}</div>}
              </div>
              <button className="btn small" onClick={() => setProgress(e.name)}>
                График
              </button>
              <button className="icon" onClick={() => removeEx(e)} aria-label="Убрать упражнение">
                <IconClose />
              </button>
            </div>
            <SetsEditor sets={e.sets} prev={prev?.sets} onChange={(sets) => updateEx(e.id, { sets })} />
          </div>
        )
      })}

      {exercises.length > 0 && (
        <button className="btn primary block" onClick={() => setPicker(true)}>
          <IconPlus /> Добавить упражнение
        </button>
      )}

      {/* Прогресс по всем упражнениям ученика */}
      {history.length > 0 && (
        <>
          <div className="section-head">
            <h2>Прогресс по упражнениям</h2>
            <span className="muted small">{history.length}</span>
          </div>
          <ul className="list">
            {history.map((h) => (
              <li key={h.name} className="list-item" onClick={() => setProgress(h.name)}>
                <div className="grow">
                  <div className="title">{h.name}</div>
                  <div className="muted small">
                    {catName(h.category)} · {h.count} трен. · последняя {fmtShort(h.last)}
                  </div>
                </div>
                <span className="chev">
                  <IconChevron />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {picker && (
        <ExercisePicker
          added={new Set(exercises.map((e) => e.name))}
          onAdd={addExercise}
          onClose={() => setPicker(false)}
        />
      )}
    </>
  )
}
