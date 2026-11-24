// Защита входа: приложение работает только внутри Telegram и только для разрешённых аккаунтов.
// Список ID задаётся при сборке (переменная ALLOWED_IDS в настройках GitHub).
// Данные хранятся на устройстве — у постороннего, открывшего ссылку, их всё равно нет,
// а этот экран не даёт ему пользоваться приложением.
import type { ReactNode } from 'react'
import { insideTelegram, tg } from './telegram'

const ALLOWED = (import.meta.env.VITE_ALLOWED_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function Lock({ title, text, id }: { title: string; text: string; id?: number }) {
  return (
    <div className="gate">
      <div className="gate-ic">🔒</div>
      <div className="eyebrow">Coach Progress</div>
      <h1>{title}</h1>
      <p className="muted">{text}</p>
      {id !== undefined && (
        <p className="gate-id">
          Ваш Telegram ID: <b className="num">{id}</b>
        </p>
      )}
    </div>
  )
}

export default function Gate({ children }: { children: ReactNode }) {
  // При разработке на компьютере проверку не включаем
  if (import.meta.env.DEV) return <>{children}</>

  if (!insideTelegram) return <Lock title="Только через Telegram" text="Откройте приложение кнопкой в чате с ботом." />

  const id = tg!.initDataUnsafe!.user!.id
  if (!ALLOWED.length)
    return <Lock title="Доступ не настроен" text="Добавьте этот ID в настройки публикации (ALLOWED_IDS)." id={id} />
  if (!ALLOWED.includes(String(id))) return <Lock title="Нет доступа" text="Это приложение личное." id={id} />

  return <>{children}</>
}
