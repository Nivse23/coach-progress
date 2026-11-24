// Резервная копия всех данных приложения в один файл (.json) и восстановление из него.
// Фото кладутся внутрь файла (base64), поэтому копия полная.
import { ALL_STORES, dumpAll, restoreAll, today } from './db'

const APP = 'coach-progress'
const VERSION = 1
const LAST_KEY = 'coach-progress:lastBackup'

interface BackupFile {
  app: typeof APP
  version: number
  createdAt: string
  data: Record<string, unknown[]>
}

export interface BackupSummary {
  clients: number
  workouts: number
  photos: number
  records: number
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

async function dataUrlToBlob(url: string): Promise<Blob> {
  const [head, body] = url.split(',', 2)
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

function summarize(data: Record<string, unknown[] | undefined>): BackupSummary {
  const n = (k: string) => data[k]?.length ?? 0
  return {
    clients: n('clients'),
    workouts: n('workouts'),
    photos: n('photos'),
    records: ALL_STORES.reduce((s, k) => s + n(k), 0),
  }
}

export async function buildBackup(): Promise<{ blob: Blob; fileName: string; summary: BackupSummary }> {
  const data = (await dumpAll()) as Record<string, unknown[]>
  data.photos = await Promise.all(
    (data.photos as { blob: Blob }[]).map(async (p) => ({ ...p, blob: await blobToDataUrl(p.blob) })),
  )
  const file: BackupFile = { app: APP, version: VERSION, createdAt: new Date().toISOString(), data }
  return {
    blob: new Blob([JSON.stringify(file)], { type: 'application/json' }),
    fileName: `coach-progress-backup-${today()}.json`,
    summary: summarize(data),
  }
}

/** Читает файл копии и проверяет, что это действительно копия Coach Progress */
export async function readBackup(file: File): Promise<{ file: BackupFile; summary: BackupSummary }> {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('Это не файл резервной копии')
  }
  if (parsed?.app !== APP || typeof parsed.data !== 'object' || !parsed.data) {
    throw new Error('Это не резервная копия Coach Progress')
  }
  if (parsed.version > VERSION) throw new Error('Копия сделана в более новой версии приложения')
  for (const k of ALL_STORES) {
    const list = parsed.data[k]
    if (list !== undefined && !Array.isArray(list)) throw new Error('Файл копии повреждён')
    if (list?.some((x) => !x || typeof (x as { id?: unknown }).id !== 'string')) throw new Error('Файл копии повреждён')
  }
  return { file: parsed, summary: summarize(parsed.data) }
}

export async function applyBackup(file: BackupFile) {
  const data = { ...file.data }
  data.photos = await Promise.all(
    ((data.photos ?? []) as { blob: unknown }[]).map(async (p) => ({
      ...p,
      blob: typeof p.blob === 'string' ? await dataUrlToBlob(p.blob) : p.blob,
    })),
  )
  await restoreAll(data)
}

export function markBackupDone() {
  try {
    localStorage.setItem(LAST_KEY, today())
  } catch {
    /* нет доступа к хранилищу — не страшно */
  }
}

export function lastBackupDate(): string | null {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}
