// Доставка файла пользователю с телефона.
// 1) Через бота: файл приходит в чат с ботом (оттуда — сохранить в телефон или переслать).
// 2) Системное меню «Поделиться» (Файлы, Telegram, мессенджеры).
// 3) Обычное скачивание (компьютер, браузер).
import { insideTelegram, tg } from './telegram'

export type DeliveryResult = 'bot' | 'shared' | 'downloaded' | 'cancelled'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const RELAY = import.meta.env.VITE_FILE_RELAY_URL

const mimeOf = (fileName: string) => (/\.json$/i.test(fileName) ? 'application/json' : XLSX)

export const botDeliveryAvailable = () => !!RELAY && insideTelegram && !!tg?.initData

async function sendViaBot(blob: Blob, fileName: string, caption: string) {
  const fd = new FormData()
  fd.append('initData', tg!.initData!)
  fd.append('caption', caption)
  fd.append('file', new File([blob], fileName, { type: mimeOf(fileName) }))
  const res = await fetch(RELAY!, { method: 'POST', body: fd })
  if (!res.ok) throw new Error((await res.text()) || `Ошибка ${res.status}`)
}

export async function deliverFile(blob: Blob, fileName: string, caption = ''): Promise<DeliveryResult> {
  if (botDeliveryAvailable()) {
    await sendViaBot(blob, fileName, caption)
    return 'bot'
  }

  const file = new File([blob], fileName, { type: mimeOf(fileName) })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled'
      // иначе — пробуем скачать
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
