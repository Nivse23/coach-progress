import { useEffect, useState } from 'react'
import { insideTelegram, setBackButton } from './telegram'
import { IconBack, IconDumbbell, IconShield, IconUsers } from './icons'
import ClientList from './screens/ClientList'
import ClientCard from './screens/ClientCard'
import ClientForm from './screens/ClientForm'
import Exercises from './screens/Exercises'
import SessionSetup from './screens/SessionSetup'
import GroupWorkout from './screens/GroupWorkout'
import Backup from './screens/Backup'

export type Route =
  | { name: 'clients' }
  | { name: 'client'; id: string }
  | { name: 'clientForm'; id?: string }
  | { name: 'exercises' }
  | { name: 'backup' }
  | { name: 'sessionSetup'; preselect?: string; date?: string }
  | { name: 'session'; ids: string[]; date: string }

export interface Nav {
  push(r: Route): void
  back(): void
  replace(r: Route): void
  tab(r: Route): void
}

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ name: 'clients' }])
  const route = stack[stack.length - 1]

  const nav: Nav = {
    push: (r) => setStack((s) => [...s, r]),
    back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
    tab: (r) => setStack([r]),
  }

  // Системная кнопка «Назад» в Telegram
  useEffect(() => {
    return setBackButton(stack.length > 1 ? nav.back : null)
  }, [stack.length])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  const isRoot = stack.length === 1

  return (
    <div className="app">
      <main className="screen">
        {/* В Telegram «Назад» — системная кнопка; в обычном браузере показываем свою */}
        {!isRoot && !insideTelegram && (
          <button className="back" onClick={nav.back}>
            <IconBack /> Назад
          </button>
        )}
        {route.name === 'clients' && <ClientList nav={nav} />}
        {route.name === 'client' && <ClientCard key={route.id} id={route.id} nav={nav} />}
        {route.name === 'clientForm' && <ClientForm id={route.id} nav={nav} />}
        {route.name === 'exercises' && <Exercises />}
        {route.name === 'backup' && <Backup />}
        {route.name === 'sessionSetup' && <SessionSetup nav={nav} preselect={route.preselect} date={route.date} />}
        {route.name === 'session' && <GroupWorkout key={route.ids.join()} ids={route.ids} date={route.date} />}
      </main>
      {isRoot && (
        <nav className="tabbar">
          <button className={route.name === 'clients' ? 'active' : ''} onClick={() => nav.tab({ name: 'clients' })}>
            <IconUsers /> Ученики
          </button>
          <button className={route.name === 'exercises' ? 'active' : ''} onClick={() => nav.tab({ name: 'exercises' })}>
            <IconDumbbell /> Упражнения
          </button>
          <button className={route.name === 'backup' ? 'active' : ''} onClick={() => nav.tab({ name: 'backup' })}>
            <IconShield /> Копия
          </button>
        </nav>
      )}
    </div>
  )
}
