export interface Client {
  id: string
  firstName: string
  lastName: string
  heightCm?: number
  targetWeightKg?: number // целевой вес
  birthDate?: string // YYYY-MM-DD
  phone?: string
  goal?: string
  notes?: string
  createdAt: string
}

export interface WeightEntry {
  id: string
  clientId: string
  date: string // YYYY-MM-DD
  weightKg: number
  note?: string
}

export interface Photo {
  id: string
  clientId: string
  date: string // YYYY-MM-DD
  blob: Blob
  note?: string
}

export const MEASURE_FIELDS = [
  { key: 'chest', label: 'Грудь' },
  { key: 'waist', label: 'Талия' },
  { key: 'hips', label: 'Ягодицы' },
  { key: 'thigh', label: 'Бедро' },
  { key: 'arm', label: 'Бицепс' },
] as const // все замеры в сантиметрах

export type MeasureKey = (typeof MEASURE_FIELDS)[number]['key']

export interface Measurement {
  id: string
  clientId: string
  date: string // YYYY-MM-DD
  values: Partial<Record<MeasureKey, number>> // см (или % для жира)
}

/** Подход: вес и повторы храним как введённый текст (чтобы «72,5» не ломалось при вводе) */
export interface WorkoutSet {
  w: string // вес, кг
  r: string // повторения
}

export interface WorkoutExercise {
  id: string
  name: string
  category: string
  sets: WorkoutSet[]
}

/** Тренировка ученика за один день */
export interface Workout {
  id: string // `${clientId}_${date}`
  clientId: string
  date: string // YYYY-MM-DD
  exercises: WorkoutExercise[]
}

export interface CustomExercise {
  id: string
  category: string
  name: string
}
