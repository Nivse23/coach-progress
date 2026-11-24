import { useEffect, useMemo, useRef, useState } from 'react'
import { compressImage, db, newId, today } from '../db'
import { IconCamera, IconCompare } from '../icons'
import { confirmAsk, haptic } from '../telegram'
import type { Photo } from '../types'

const fmt = (d: string) => new Date(d + 'T00:00').toLocaleDateString('ru-RU')

export default function PhotoSection({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [open, setOpen] = useState<Photo | null>(null)
  const [busy, setBusy] = useState(false)
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  // Режим сравнения: выбираем 2 фото и смотрим их рядом
  const [comparing, setComparing] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = () => db.listPhotos(clientId).then(setPhotos)
  useEffect(() => {
    reload()
  }, [clientId])

  // Ссылки на Blob для <img>; освобождаем при смене списка
  const urls = useMemo(() => new Map(photos.map((p) => [p.id, URL.createObjectURL(p.blob)])), [photos])
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const blob = await compressImage(file)
        await db.savePhoto({ id: newId(), clientId, date, blob, note: note.trim() || undefined })
      }
      setNote('')
      haptic('success')
      await reload()
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function remove(p: Photo) {
    if (!(await confirmAsk('Удалить это фото?'))) return
    await db.deletePhoto(p.id)
    setOpen(null)
    setPicked((s) => s.filter((x) => x !== p.id))
    reload()
  }

  function startCompare() {
    // По умолчанию — самое первое и самое последнее фото
    setPicked(photos.length >= 2 ? [photos.at(-1)!.id, photos[0].id] : [])
    setComparing(true)
  }

  function tap(p: Photo) {
    if (!comparing) return setOpen(p)
    haptic()
    setPicked((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id].slice(-2)))
  }

  const pair = picked
    .map((id) => photos.find((p) => p.id === id)!)
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))

  // Группируем по дате
  const groups = photos.reduce<Record<string, Photo[]>>((acc, p) => {
    ;(acc[p.date] ??= []).push(p)
    return acc
  }, {})

  return (
    <>
      {comparing && (
        <div className="card">
          <div className="section-head" style={{ marginTop: 0 }}>
            <h2>До / после</h2>
            <button className="btn small" onClick={() => setComparing(false)}>
              Готово
            </button>
          </div>
          {pair.length === 2 ? (
            <div className="compare">
              {pair.map((p, i) => (
                <figure key={p.id}>
                  <img src={urls.get(p.id)} alt="" />
                  <figcaption>
                    {i === 0 ? 'До' : 'После'} · {fmt(p.date)}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="muted small center">Выберите 2 фото ниже</p>
          )}
        </div>
      )}

      {!comparing && (
        <div className="card">
          <div className="add-row">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input placeholder="Подпись" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="actions">
            <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
              <IconCamera /> {busy ? 'Сохраняю…' : 'Добавить'}
            </button>
            <button className="btn" disabled={photos.length < 2} onClick={startCompare}>
              <IconCompare /> Сравнить
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
      )}

      {photos.length === 0 && <p className="muted center small">Фото пока нет</p>}

      {Object.entries(groups).map(([d, list]) => (
        <section key={d}>
          <h3 className="group-title">{fmt(d)}</h3>
          <div className="grid">
            {list.map((p) => {
              const idx = picked.indexOf(p.id)
              return (
                <div key={p.id} className={comparing && idx >= 0 ? 'thumb sel' : 'thumb'} onClick={() => tap(p)}>
                  <img src={urls.get(p.id)} alt={p.note ?? ''} />
                  {comparing && idx >= 0 && <span className="badge">{idx + 1}</span>}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {open && (
        <div className="lightbox" onClick={() => setOpen(null)}>
          <img src={urls.get(open.id)} alt="" />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            <span>
              {fmt(open.date)}
              {open.note ? ` · ${open.note}` : ''}
            </span>
            <button className="btn danger small" onClick={() => remove(open)}>
              Удалить
            </button>
          </div>
        </div>
      )}
    </>
  )
}
