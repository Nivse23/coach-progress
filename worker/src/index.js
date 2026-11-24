// Coach Progress — отправка файлов в чат с ботом (Cloudflare Worker, бесплатный тариф).
//
// Приложение присылает сюда файл + initData (подпись Telegram).
// Сервис проверяет подпись токеном бота — значит, запрос точно от вашего Telegram-аккаунта,
// проверяет, что ваш ID в списке разрешённых, и отправляет файл вам в чат с ботом.
//
// Секреты (задаются командой `npx wrangler secret put ...`, в коде их нет):
//   BOT_TOKEN    — токен бота от @BotFather
//   ALLOWED_IDS  — ваш Telegram ID (несколько — через запятую)
// Переменная (wrangler.toml):
//   ALLOWED_ORIGIN — адрес приложения, например https://<логин>.github.io

const MAX_BYTES = 45 * 1024 * 1024 // 45 МБ (лимит Telegram для ботов — 50 МБ; резервная копия с фото бывает большой)
const MAX_AGE_SEC = 24 * 60 * 60 // initData старше суток не принимаем
const enc = new TextEncoder()

async function hmac(key, data) {
  const k = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? enc.encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)))
}

const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Проверка initData по документации Telegram: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
async function verifyInitData(initData, botToken) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')
  const checkString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secret = await hmac('WebAppData', botToken)
  if (!safeEqual(hex(await hmac(secret, checkString)), hash)) return null

  const authDate = Number(params.get('auth_date'))
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SEC) return null

  try {
    return JSON.parse(params.get('user') ?? 'null')
  } catch {
    return null
  }
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*'
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
    const reply = (text, status = 200) => new Response(text, { status, headers: cors })

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (request.method !== 'POST') return reply('Method not allowed', 405)
    if (!env.BOT_TOKEN) return reply('Сервис не настроен', 500)

    const len = Number(request.headers.get('content-length') || 0)
    if (len > MAX_BYTES) return reply('Файл слишком большой', 413)

    let form
    try {
      form = await request.formData()
    } catch {
      return reply('Неверный запрос', 400)
    }

    const initData = String(form.get('initData') || '')
    if (!initData) return reply('Нет доступа: нет подписи Telegram', 403)
    const user = await verifyInitData(initData, env.BOT_TOKEN)
    if (!user?.id) {
      // Подпись не сошлась — проверяем, рабочий ли вообще сохранённый токен
      const me = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`)
        .then((r) => r.json())
        .catch(() => ({}))
      if (!me.ok) return reply('Нет доступа: токен бота в Cloudflare недействителен — вставьте его заново', 403)
      return reply(`Нет доступа: подпись не совпала. Токен в Cloudflare от бота @${me.result.username} — откройте приложение именно через него`, 403)
    }

    const allowed = String(env.ALLOWED_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (!allowed.includes(String(user.id))) return reply(`Нет доступа: ID ${user.id} не в списке`, 403)

    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) return reply('Нет файла', 400)
    // Только выгрузки Excel и резервные копии приложения
    if (!/\.(xlsx|json)$/i.test(file.name)) return reply('Разрешены только Excel и резервные копии', 400)

    const tg = new FormData()
    tg.append('chat_id', String(user.id))
    tg.append('document', file, file.name)
    const caption = String(form.get('caption') || '').slice(0, 900)
    if (caption) tg.append('caption', caption)

    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, { method: 'POST', body: tg })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      // Частая причина: бот ещё не запущен — нужно открыть чат с ботом и нажать «Старт»
      return reply(err.description ? `Telegram: ${err.description}` : 'Не удалось отправить файл', 502)
    }
    return reply('ok')
  },
}
