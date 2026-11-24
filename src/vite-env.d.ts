/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Адрес сервиса, который присылает файлы в чат с ботом (Cloudflare Worker из папки worker/) */
  readonly VITE_FILE_RELAY_URL?: string
  /** Telegram ID через запятую, кому разрешён вход в приложение */
  readonly VITE_ALLOWED_IDS?: string
}
