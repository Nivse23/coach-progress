// Слой хранения данных.
// Сейчас: IndexedDB (данные лежат на устройстве, где открыт Telegram).
// Позже этот же интерфейс можно реализовать через Supabase — экраны менять не придётся.
import type { Client, CustomExercise, Measurement, Photo, WeightEntry, Workout } from './types'

const DB_NAME = 'fit-trainer'
const DB_VERSION = 3

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = req.result
      // Миграции по версиям: старые данные сохраняются
      if (e.oldVersion < 1) {
        db.createObjectStore('clients', { keyPath: 'id' })
        db.createObjectStore('weights', { keyPath: 'id' }).createIndex('clientId', 'clientId')
        db.createObjectStore('photos', { keyPath: 'id' }).createIndex('clientId', 'clientId')
        db.createObjectStore('exercises', { keyPath: 'id' })
      }
      if (e.oldVersion < 2) {
        db.createObjectStore('measurements', { keyPath: 'id' }).createIndex('clientId', 'clientId')
      }
      if (e.oldVersion < 3) {
        db.createObjectStore('workouts', { keyPath: 'id' }).createIndex('clientId', 'clientId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  // Просим браузер не удалять данные при нехватке места
  navigator.storage?.persist?.().catch(() => {})
  return dbPromise
}

type StoreName = 'clients' | 'weights' | 'photos' | 'exercises' | 'measurements' | 'workouts'
type ClientStore = 'weights' | 'photos' | 'measurements' | 'workouts'

/** Событие в ленте активности ученика */
export interface ActivityEvent {
  clientId: string
  kind: 'weight' | 'measure' | 'photo' | 'workout'
  date: string
  text: string
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function store(name: StoreName, mode: IDBTransactionMode = 'readonly') {
  const db = await openDb()
  return db.transaction(name, mode).objectStore(name)
}

async function all<T>(name: StoreName): Promise<T[]> {
  return wrap((await store(name)).getAll()) as Promise<T[]>
}
async function byClient<T>(name: ClientStore, clientId: string): Promise<T[]> {
  return wrap((await store(name)).index('clientId').getAll(clientId)) as Promise<T[]>
}
async function put<T>(name: StoreName, value: T): Promise<T> {
  await wrap((await store(name, 'readwrite')).put(value))
  return value
}
async function del(name: StoreName, id: string) {
  await wrap((await store(name, 'readwrite')).delete(id))
}

export const newId = () =>
  (crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2))

/** Сегодняшняя дата в местном часовом поясе (YYYY-MM-DD) */
export const today = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Сдвиг даты YYYY-MM-DD на n дней */
export const addDays = (date: string, n: number) => {
  const d = new Date(date + 'T12:00')
  d.setDate(d.getDate() + n)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Сколько дней прошло с даты YYYY-MM-DD */
export const daysSince = (date: string) =>
  Math.round((+new Date(today() + 'T00:00') - +new Date(date + 'T00:00')) / 86400000)

export const ago = (date: string) => {
  const d = daysSince(date)
  if (d <= 0) return 'сегодня'
  if (d === 1) return 'вчера'
  if (d < 7) return `${d} дн. назад`
  if (d < 30) return `${Math.floor(d / 7)} нед. назад`
  return new Date(date + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date)

export const db = {
  // Ученики
  listClients: async () =>
    (await all<Client>('clients')).sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'ru'),
    ),
  getClient: async (id: string) => wrap((await store('clients')).get(id)) as Promise<Client | undefined>,
  saveClient: (c: Client) => put('clients', c),
  deleteClient: async (id: string) => {
    for (const w of await byClient<WeightEntry>('weights', id)) await del('weights', w.id)
    for (const p of await byClient<Photo>('photos', id)) await del('photos', p.id)
    for (const m of await byClient<Measurement>('measurements', id)) await del('measurements', m.id)
    for (const w of await byClient<Workout>('workouts', id)) await del('workouts', w.id)
    await del('clients', id)
  },

  // Тренировки
  listWorkouts: async (clientId: string) => (await byClient<Workout>('workouts', clientId)).sort(byDate),
  saveWorkout: (w: Workout) => put('workouts', w),
  deleteWorkout: (id: string) => del('workouts', id),

  // Замеры тела
  listMeasurements: async (clientId: string) => (await byClient<Measurement>('measurements', clientId)).sort(byDate),
  saveMeasurement: (m: Measurement) => put('measurements', m),
  deleteMeasurement: (id: string) => del('measurements', id),

  /** Все события всех учеников (вес, замеры, фото), новые сверху — для панели тренера */
  activity: async (): Promise<ActivityEvent[]> => {
    const [w, m, p, t] = await Promise.all([
      all<WeightEntry>('weights'),
      all<Measurement>('measurements'),
      all<Photo>('photos'),
      all<Workout>('workouts'),
    ])
    const photoDays = new Map<string, { clientId: string; date: string; n: number }>()
    for (const x of p) {
      const k = x.clientId + x.date
      const g = photoDays.get(k) ?? { clientId: x.clientId, date: x.date, n: 0 }
      g.n++
      photoDays.set(k, g)
    }
    return [
      ...t.map((x) => ({
        clientId: x.clientId,
        kind: 'workout' as const,
        date: x.date,
        text: `Тренировка · ${x.exercises.length} упр.`,
      })),
      ...w.map((x) => ({ clientId: x.clientId, kind: 'weight' as const, date: x.date, text: `Вес ${x.weightKg} кг` })),
      ...m.map((x) => ({ clientId: x.clientId, kind: 'measure' as const, date: x.date, text: 'Новые замеры тела' })),
      ...[...photoDays.values()].map((g) => ({
        clientId: g.clientId,
        kind: 'photo' as const,
        date: g.date,
        text: `Фото прогресса · ${g.n} шт.`,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date))
  },

  // Вес
  listWeights: async (clientId: string) => (await byClient<WeightEntry>('weights', clientId)).sort(byDate),
  saveWeight: (w: WeightEntry) => put('weights', w),
  deleteWeight: (id: string) => del('weights', id),

  // Фото
  listPhotos: async (clientId: string) => (await byClient<Photo>('photos', clientId)).sort(byDate).reverse(),
  savePhoto: (p: Photo) => put('photos', p),
  deletePhoto: (id: string) => del('photos', id),

  // Свои упражнения
  listCustomExercises: () => all<CustomExercise>('exercises'),
  saveCustomExercise: (e: CustomExercise) => put('exercises', e),
  deleteCustomExercise: (id: string) => del('exercises', id),
}

/** Сжимает фото до 1280px по длинной стороне (JPEG), чтобы экономить место. */
export async function compressImage(file: File, maxSide = 1280, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось сжать фото'))), 'image/jpeg', quality),
  )
}
