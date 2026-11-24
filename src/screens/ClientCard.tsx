import { useCallback, useEffect, useState } from 'react'
import type { Nav } from '../App'
import { db } from '../db'
import { confirmAsk, haptic } from '../telegram'
import { deliverFile } from '../share'
import { IconFile } from '../icons'
import type { Client, WeightEntry } from '../types'
import WeightSection from './WeightSection'
import PhotoSection from './PhotoSection'
import MeasureSection from './MeasureSection'
import WorkoutSection from './WorkoutSection'

type Tab = 'workouts' | 'info' | 'weight' | 'measures' | 'photos'

function age(birth?: string) {
  if (!birth) return undefined
  const b = new Date(birth)
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--
  return a
}

export default function ClientCard({ id, nav }: { id: string; nav: Nav }) {
  const [client, setClient] = useState<Client | null>()
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [tab, setTab] = useState<Tab>('workouts')
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const reloadWeights = useCallback(() => db.listWeights(id).then(setWeights), [id])

  useEffect(() => {
    db.getClient(id).then((c) => setClient(c ?? null))
    reloadWeights()
  }, [id, reloadWeights])

  if (client === undefined) return <p className="muted center">Загрузка…</p>
  if (client === null) return <p className="muted center">Ученик не найден</p>

  const current = weights.at(-1)?.weightKg
  const start = weights[0]?.weightKg
  const diff = current !== undefined && start !== undefined ? +(current - start).toFixed(1) : undefined
  const target = client.targetWeightKg
  // Сколько осталось до целевого веса (по модулю: цель может быть и сбросить, и набрать)
  const toGo = current !== undefined && target !== undefined ? +Math.abs(target - current).toFixed(1) : undefined
  const years = age(client.birthDate)

  async function exportXlsx() {
    setExporting(true)
    setExportMsg(null)
    try {
      // Библиотека Excel грузится только при выгрузке — приложение открывается быстрее
      const { buildClientXlsx } = await import('../exportExcel')
      const { blob, fileName } = await buildClientXlsx(client!)
      const how = await deliverFile(blob, fileName, `Coach Progress · ${client!.firstName} ${client!.lastName}`)
      const text = {
        bot: 'Файл отправлен вам в чат с ботом — оттуда его можно сохранить или переслать',
        shared: 'Готово',
        downloaded: 'Файл сохранён в «Загрузки»',
        cancelled: '',
      }[how]
      if (text) setExportMsg({ ok: true, text })
      haptic('success')
    } catch (e) {
      setExportMsg({ ok: false, text: `Не получилось: ${(e as Error).message}` })
      haptic('error')
    } finally {
      setExporting(false)
    }
  }

  async function remove() {
    if (!(await confirmAsk(`Удалить ${client!.firstName} ${client!.lastName} со всеми данными и фото?`))) return
    await db.deleteClient(id)
    haptic('success')
    nav.back()
  }

  return (
    <>
      <header className="profile">
        <div className="avatar big">{(client.firstName[0] ?? '') + (client.lastName[0] ?? '')}</div>
        <h1>
          {client.firstName} {client.lastName}
        </h1>
        {client.goal && <div className="muted">{client.goal}</div>}
        <button className="btn small export-btn" disabled={exporting} onClick={exportXlsx}>
          <IconFile /> {exporting ? 'Готовлю файл…' : 'Выгрузить в Excel'}
        </button>
        {exportMsg && <div className={exportMsg.ok ? 'export-msg' : 'export-msg error'}>{exportMsg.text}</div>}
      </header>

      <div className="stats">
        <div className="stat">
          <b className="num accent">{current ?? '—'}</b>
          <span>вес, кг</span>
        </div>
        <div className="stat">
          <b className={'num ' + (diff ? (diff < 0 ? 'down' : 'up') : '')}>
            {diff === undefined ? '—' : diff > 0 ? `+${diff}` : diff}
          </b>
          <span>с начала</span>
        </div>
        <div className="stat">
          <b className="num">{client.heightCm ?? '—'}</b>
          <span>рост, см</span>
        </div>
        <div className="stat">
          <b className="num">{target ?? '—'}</b>
          <span>{toGo === undefined ? 'цель, кг' : toGo === 0 ? 'цель достигнута' : `цель · ещё ${toGo}`}</span>
        </div>
      </div>

      <div className="segmented">
        {(
          [
            ['workouts', 'Трен.'],
            ['weight', 'Вес'],
            ['measures', 'Замеры'],
            ['photos', 'Фото'],
            ['info', 'Профиль'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="card">
          <dl className="info">
            <dt>Возраст</dt>
            <dd>{years !== undefined ? `${years} лет` : '—'}</dd>
            <dt>Телефон</dt>
            <dd>{client.phone ? <a href={`tel:${client.phone}`}>{client.phone}</a> : '—'}</dd>
            <dt>Направление</dt>
            <dd>{client.goal ?? '—'}</dd>
            <dt>Целевой вес</dt>
            <dd>{target ? `${target} кг` : '—'}</dd>
            <dt>Заметки</dt>
            <dd className="pre">{client.notes ?? '—'}</dd>
            <dt>Добавлен</dt>
            <dd>{new Date(client.createdAt).toLocaleDateString('ru-RU')}</dd>
          </dl>
          <div className="actions">
            <button className="btn" onClick={() => nav.push({ name: 'clientForm', id })}>
              Редактировать
            </button>
            <button className="btn danger" onClick={remove}>
              Удалить
            </button>
          </div>
        </div>
      )}

      {tab === 'weight' && <WeightSection clientId={id} weights={weights} onChange={reloadWeights} />}
      {tab === 'workouts' && (
        <WorkoutSection
          clientId={id}
          onGroup={(date) => nav.push({ name: 'sessionSetup', preselect: id, date })}
        />
      )}
      {tab === 'measures' &&<MeasureSection clientId={id} />}
      {tab === 'photos' && <PhotoSection clientId={id} />}
    </>
  )
}
