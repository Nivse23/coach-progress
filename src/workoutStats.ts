// Расчёты по тренировкам: прогресс упражнения, форматирование подходов
import type { Workout, WorkoutSet } from './types'

export const parseNum = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export const fmtSet = (s: WorkoutSet) => {
  const w = s.w.trim()
  const r = s.r.trim()
  if (w && r) return `${w}×${r}`
  if (w) return `${w} кг`
  if (r) return `${r} повт.`
  return ''
}

export const fmtSets = (sets: WorkoutSet[]) => sets.map(fmtSet).filter(Boolean).join(' · ')

export interface ProgressPoint {
  date: string
  weight?: number // максимальный рабочий вес за тренировку
  reps?: number // максимум повторений в подходе за тренировку
  sets: WorkoutSet[]
}

/** История одного упражнения по датам */
export function exerciseProgress(workouts: Workout[], name: string): ProgressPoint[] {
  return workouts
    .map((w): ProgressPoint | null => {
      const ex = w.exercises.find((e) => e.name === name)
      if (!ex) return null
      const ws = ex.sets.map((s) => parseNum(s.w)).filter((n): n is number => n !== undefined)
      const rs = ex.sets.map((s) => parseNum(s.r)).filter((n): n is number => n !== undefined)
      return {
        date: w.date,
        weight: ws.length ? Math.max(...ws) : undefined,
        reps: rs.length ? Math.max(...rs) : undefined,
        sets: ex.sets,
      }
    })
    .filter((p): p is ProgressPoint => !!p && fmtSets(p.sets) !== '')
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Все упражнения, которые ученик когда-либо делал: сколько раз и когда последний */
export function doneExercises(workouts: Workout[]) {
  const map = new Map<string, { name: string; category: string; count: number; last: string }>()
  for (const w of workouts)
    for (const e of w.exercises) {
      if (!fmtSets(e.sets)) continue
      const x = map.get(e.name) ?? { name: e.name, category: e.category, count: 0, last: w.date }
      x.count++
      if (w.date > x.last) x.last = w.date
      map.set(e.name, x)
    }
  return [...map.values()].sort((a, b) => b.last.localeCompare(a.last))
}
