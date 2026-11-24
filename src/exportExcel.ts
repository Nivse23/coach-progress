// Выгрузка карточки ученика в Excel (.xlsx) — файл создаётся прямо на телефоне
import writeXlsxFile, { type Row, type Sheet } from 'write-excel-file/browser'
import { db } from './db'
import { CATEGORIES } from './exercises'
import { MEASURE_FIELDS, type Client } from './types'
import { doneExercises, exerciseProgress, parseNum } from './workoutStats'

type FileContent = File | Blob | ArrayBuffer

const head = (titles: string[]): Row =>
  titles.map((value) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#B6F34A', textColor: '#101214' }))

const date = (d: string) => new Date(d + 'T00:00')
const catName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? ''
const num = (s: string) => parseNum(s) ?? (s.trim() || null)

export async function buildClientXlsx(client: Client): Promise<{ blob: Blob; fileName: string }> {
  const [weights, measures, workouts] = await Promise.all([
    db.listWeights(client.id),
    db.listMeasurements(client.id),
    db.listWorkouts(client.id),
  ])
  const fullName = `${client.firstName} ${client.lastName}`.trim()
  const current = weights.at(-1)?.weightKg

  // 1. Профиль
  const profile: Row[] = [
    head(['Показатель', 'Значение']),
    ['Ученик', fullName],
    ['Рост, см', client.heightCm ?? null],
    ['Текущий вес, кг', current ?? null],
    ['Стартовый вес, кг', weights[0]?.weightKg ?? null],
    ['Целевой вес, кг', client.targetWeightKg ?? null],
    ['Направление', client.goal ?? null],
    ['Дата рождения', client.birthDate ? date(client.birthDate) : null],
    ['Телефон', client.phone ?? null],
    ['Заметки', client.notes ? { value: client.notes, wrap: true } : null],
    ['Тренировок записано', workouts.length],
    ['Выгружено', new Date()],
  ]

  // 2. Тренировки: каждая строка — один подход
  const training: Row[] = [head(['Дата', 'Группа мышц', 'Упражнение', 'Подход', 'Вес, кг', 'Повторы'])]
  for (const w of [...workouts].reverse())
    for (const e of w.exercises)
      e.sets.forEach((s, i) => {
        if (!s.w.trim() && !s.r.trim()) return
        training.push([date(w.date), catName(e.category), e.name, i + 1, num(s.w), num(s.r)])
      })

  // 3. Прогресс по упражнениям: максимум веса и повторов на каждую тренировку
  const progress: Row[] = [head(['Упражнение', 'Дата', 'Макс. вес, кг', 'Макс. повторов'])]
  for (const ex of doneExercises(workouts))
    for (const p of exerciseProgress(workouts, ex.name)) progress.push([ex.name, date(p.date), p.weight ?? null, p.reps ?? null])

  // 4. Вес
  const weightRows: Row[] = [head(['Дата', 'Вес, кг', 'Изменение, кг'])]
  weights.forEach((w, i) =>
    weightRows.push([date(w.date), w.weightKg, i ? +(w.weightKg - weights[i - 1].weightKg).toFixed(1) : null]),
  )

  // 5. Замеры
  const measureRows: Row[] = [head(['Дата', ...MEASURE_FIELDS.map((f) => `${f.label}, см`)])]
  for (const m of measures) measureRows.push([date(m.date), ...MEASURE_FIELDS.map((f) => m.values[f.key] ?? null)])

  const sheets: Sheet<FileContent>[] = [
    { sheet: 'Профиль', data: profile, columns: [{ width: 22 }, { width: 40 }], dateFormat: 'dd.mm.yyyy' },
    {
      sheet: 'Тренировки',
      data: training,
      columns: [{ width: 12 }, { width: 18 }, { width: 40 }, { width: 8 }, { width: 10 }, { width: 10 }],
      stickyRowsCount: 1,
      dateFormat: 'dd.mm.yyyy',
    },
    {
      sheet: 'Прогресс',
      data: progress,
      columns: [{ width: 40 }, { width: 12 }, { width: 14 }, { width: 15 }],
      stickyRowsCount: 1,
      dateFormat: 'dd.mm.yyyy',
    },
    { sheet: 'Вес', data: weightRows, columns: [{ width: 12 }, { width: 10 }, { width: 15 }], stickyRowsCount: 1, dateFormat: 'dd.mm.yyyy' },
    {
      sheet: 'Замеры',
      data: measureRows,
      columns: [{ width: 12 }, ...MEASURE_FIELDS.map(() => ({ width: 13 }))],
      stickyRowsCount: 1,
      dateFormat: 'dd.mm.yyyy',
    },
  ]

  const blob = await writeXlsxFile(sheets).toBlob()
  const stamp = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')
  const fileName = `${fullName.replace(/[\\/:*?"<>|]/g, '') || 'Ученик'} — Coach Progress ${stamp}.xlsx`
  return { blob, fileName }
}
