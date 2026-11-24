// Тонкая обёртка над Telegram WebApp SDK.
// Вне Telegram (в обычном браузере) все вызовы просто ничего не делают.

interface TgWebApp {
  ready(): void
  expand(): void
  colorScheme?: 'light' | 'dark'
  initData?: string // подписанная Telegram строка — по ней сервер проверяет, кто вы
  initDataUnsafe?: { user?: { id: number; first_name?: string } }
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void }
  HapticFeedback?: { impactOccurred(s: 'light' | 'medium'): void; notificationOccurred(t: 'success' | 'error'): void }
  showConfirm?(text: string, cb: (ok: boolean) => void): void
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
  setBottomBarColor?(color: string): void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

export const tg: TgWebApp | undefined = window.Telegram?.WebApp
// SDK загружен всегда, но initData есть только внутри Telegram
export const insideTelegram = !!tg?.initDataUnsafe?.user

export function initTelegram() {
  tg?.ready()
  tg?.expand()
  // Приложение всегда в тёмной теме Coach Progress — красим шапку и фон Telegram под неё
  try {
    tg?.setHeaderColor?.('#101214')
    tg?.setBackgroundColor?.('#101214')
    tg?.setBottomBarColor?.('#101214')
  } catch {
    /* старые версии Telegram не поддерживают */
  }
}

export function haptic(kind: 'light' | 'success' | 'error' = 'light') {
  if (!insideTelegram) return
  if (kind === 'light') tg?.HapticFeedback?.impactOccurred('light')
  else tg?.HapticFeedback?.notificationOccurred(kind)
}

export function confirmAsk(text: string): Promise<boolean> {
  if (insideTelegram && tg?.showConfirm) return new Promise((r) => tg!.showConfirm!(text, r))
  return Promise.resolve(window.confirm(text))
}

/** Показывает системную кнопку «Назад» Telegram (или прячет, если onBack = null). */
export function setBackButton(onBack: (() => void) | null): () => void {
  if (!insideTelegram || !tg) return () => {}
  if (!onBack) {
    tg.BackButton.hide()
    return () => {}
  }
  tg.BackButton.show()
  tg.BackButton.onClick(onBack)
  return () => tg.BackButton.offClick(onBack)
}
