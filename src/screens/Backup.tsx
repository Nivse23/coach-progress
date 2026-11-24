// Резервная копия: все ученики, тренировки, вес, замеры и фото в один файл — и восстановление из него
import { useRef, useState } from 'react'
import { applyBackup, buildBackup, lastBackupDate, markBackupDone, readBackup, type BackupSummary } from '../backup'
import { ago } from '../db'
import { IconRestore, IconShield } from '../icons'
import { deliverFile } from '../share'
import { confirmAsk, haptic } from '../telegram'

type Msg = { ok: boolean; text: string } | null

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  const w = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
  return `${n} ${w}`
}

const describe = (s: BackupSummary) =>
  [
    plural(s.clients, 'ученик', 'ученика', 'учеников'),
    plural(s.workouts, 'тренировка', 'тренировки', 'тренировок'),
    plural(s.photos, 'фото', 'фото', 'фото'),
  ].join(', ')

export default function Backup() {
  const [busy, setBusy] = useState<'save' | 'restore' | null>(null)
  const [saveMsg, setSaveMsg] = useState<Msg>(null)
  const [restoreMsg, setRestoreMsg] = useState<Msg>(null)
  const [last, setLast] = useState(lastBackupDate())
  const input = useRef<HTMLInputElement>(null)

  async function save() {
    setBusy('save')
    setSaveMsg(null)
    try {
      const { blob, fileName, summary } = await buildBackup()
      const date = new Date().toLocaleDateString('ru-RU')
      const how = await deliverFile(blob, fileName, `Coach Progress · резервная копия от ${date}\n${describe(summary)}`)
      if (how === 'cancelled') return
      markBackupDone()
      setLast(lastBackupDate())
      setSaveMsg({
        ok: true,
        text:
          how === 'bot'
            ? `Копия отправлена в чат с ботом (${describe(summary)}). Сохраните файл в телефон — он понадобится для восстановления.`
            : `Копия готова: ${describe(summary)}`,
      })
      haptic('success')
    } catch (e) {
      setSaveMsg({ ok: false, text: `Не получилось: ${(e as Error).message}` })
      haptic('error')
    } finally {
      setBusy(null)
    }
  }

  async function restore(file: File | undefined) {
    if (input.current) input.current.value = ''
    if (!file) return
    setRestoreMsg(null)
    try {
      const { file: backup, summary } = await readBackup(file)
      const date = new Date(backup.createdAt).toLocaleDateString('ru-RU')
      const ok = await confirmAsk(
        `Восстановить копию от ${date}?\n${describe(summary)}.\n\nДанные из копии добавятся к текущим, совпадающие записи заменятся.`,
      )
      if (!ok) return
      setBusy('restore')
      await applyBackup(backup)
      setRestoreMsg({ ok: true, text: `Восстановлено: ${describe(summary)}` })
      haptic('success')
    } catch (e) {
      setRestoreMsg({ ok: false, text: `Не получилось: ${(e as Error).message}` })
      haptic('error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <header className="top">
        <div>
          <div className="eyebrow">Данные</div>
          <h1>Резервная копия</h1>
        </div>
      </header>

      <div className="card">
        <div className="backup-head">
          <div className="feed-ic">
            <IconShield />
          </div>
          <div className="grow">
            <div className="title">Сделать копию</div>
            <div className="muted small">
              {last ? `Последняя копия: ${ago(last)}` : 'Копию ещё не делали'}
            </div>
          </div>
        </div>
        <p className="muted small backup-text">
          Все ученики, тренировки, вес, замеры и фото — в одном файле. Бот пришлёт его вам в чат. Делайте копию раз в неделю.
        </p>
        <button className="btn primary block" disabled={!!busy} onClick={save}>
          {busy === 'save' ? 'Готовлю копию…' : 'Сделать копию'}
        </button>
        {saveMsg && <div className={saveMsg.ok ? 'export-msg' : 'export-msg error'}>{saveMsg.text}</div>}
      </div>

      <div className="card">
        <div className="backup-head">
          <div className="feed-ic">
            <IconRestore />
          </div>
          <div className="grow">
            <div className="title">Восстановить из копии</div>
            <div className="muted small">Новый телефон или пропали данные</div>
          </div>
        </div>
        <ol className="muted small backup-steps">
          <li>
            В чате с ботом откройте файл копии → ⋮ → «Сохранить в загрузки» (на iPhone: «Поделиться» → «Сохранить в
            Файлы»).
          </li>
          <li>Нажмите кнопку ниже и выберите этот файл.</li>
        </ol>
        <button className="btn block" disabled={!!busy} onClick={() => input.current?.click()}>
          {busy === 'restore' ? 'Восстанавливаю…' : 'Выбрать файл копии'}
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => restore(e.target.files?.[0])}
        />
        {restoreMsg && <div className={restoreMsg.ok ? 'export-msg' : 'export-msg error'}>{restoreMsg.text}</div>}
      </div>
    </>
  )
}
