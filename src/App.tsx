import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SortableTask } from './components/SortableTask'
import { useTheme } from './hooks/useTheme'
import { SyncPopover } from './components/SyncPopover'
import { AboutPopover } from './components/AboutPopover'
import { useSyncClient } from './sync/syncClient'
import { QuickAddInput } from './components/QuickAddInput'
import { TaskItem } from './components/TaskItem'
import { useTaskStore } from './store/useTaskStore'
import type { ListType, Task } from './types/task'
import { localDate, tomorrowDate } from './utils/date'

export default function App({ initialPassphrase = null }: { initialPassphrase?: string | null }) {
  const store = useTaskStore()
  const sync = useSyncClient(store.tasks, store.getSnapshot, store.applyRemote, initialPassphrase)
  const { theme, changeTheme } = useTheme()
  const reduced = useReducedMotion()
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const [view, setView] = useState<ListType>('today')
  const [today, setToday] = useState(localDate)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)
  const [rolloverOpen, setRolloverOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const refresh = () => setToday(localDate())
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const [year, month, day] = today.split('-').map(Number)
  const weekday = new Date(year, month - 1, day).getDay()
  const dateSubtitle = `${month}月${day}日 · 周${'日一二三四五六'[weekday]}`
  const active = store.tasks.filter(task => task.deletedAt === null && task.completedAt === null)
  const overdue = active.filter(task => task.list === 'today' && task.scheduledDate !== null && task.scheduledDate < today)
  const belongs = (task: Task) => view === 'today'
    ? task.list === 'today' && task.scheduledDate === today
    : task.list === 'anytime' || (task.list === 'today' && task.scheduledDate !== null && task.scheduledDate > today)
  const visible = active.filter(belongs).sort((a, b) => a.order - b.order)
  const done = store.tasks.filter(task => task.deletedAt === null && task.completedAt !== null && belongs(task)).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229 || event.defaultPrevented || (event.target as HTMLElement | null)?.closest('.drag-handle, .about-wrap')) return
      const target = event.target as HTMLElement | null
      const editing = !!target?.closest('input, textarea, select, [contenteditable="true"]')
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        if (!editing && !event.shiftKey) { event.preventDefault(); store.undo() }
        return
      }
      if (editing) {
        if (event.key === 'Escape') { if (expanded) setExpanded(null); else target?.blur() }
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'escape') { setExpanded(null); return }
      if (key === 'n' || key === ' ') { event.preventDefault(); inputRef.current?.focus(); return }
      if (key === '1' || key === '2') { setView(key === '1' ? 'today' : 'anytime'); setExpanded(null); setFocusId(null); return }
      if (key === 'arrowdown' || key === 'arrowup') {
        event.preventDefault()
        if (!visible.length) return
        const index = visible.findIndex(task => task.id === focusId)
        const next = index < 0 ? (key === 'arrowdown' ? 0 : visible.length - 1) : Math.max(0, Math.min(visible.length - 1, index + (key === 'arrowdown' ? 1 : -1)))
        setFocusId(visible[next].id)
        return
      }
      const task = visible.find(item => item.id === focusId)
      if (!task) return
      if (key === 'enter' || key === 'e') { event.preventDefault(); setExpanded(task.id) }
      if (key === 'd') { event.preventDefault(); store.toggle(task.id) }
      if (key === 't') { event.preventDefault(); store.move(task.id, view === 'today' ? 'anytime' : 'today', view === 'today' ? null : today) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, focusId, expanded, store, today, view])
  const renderTask = (task: Task) => <TaskItem key={task.id} task={task} pending={store.pending.has(task.id)} expanded={expanded === task.id} focused={focusId === task.id} today={today} tomorrow={tomorrowDate()} onToggle={() => store.toggle(task.id)} onExpand={() => { setExpanded(task.id); setFocusId(task.id) }} onClose={() => setExpanded(null)} onUpdate={patch => store.update(task.id, patch)} onMove={(list, date) => { store.move(task.id, list, date); setExpanded(null) }} onDelete={() => { store.remove(task.id); setExpanded(null) }} />
  return <main className="app">
    <header className="app-header"><div className="brand-group"><span className="brand">QuietList</span><AboutPopover /></div><div className="header-actions"><nav className="view-nav" aria-label="切换视图"><button className={view === 'today' ? 'active' : ''} aria-current={view === 'today' ? 'page' : undefined} onClick={() => { setView('today'); setExpanded(null) }}>今天</button><button className={view === 'anytime' ? 'active' : ''} aria-current={view === 'anytime' ? 'page' : undefined} onClick={() => { setView('anytime'); setExpanded(null) }}>待办池</button></nav><label className="theme-picker"><span className="sr-only">外观主题</span><select aria-label="外观主题" value={theme} onChange={event => changeTheme(event.target.value as 'system' | 'light' | 'dark')}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></label><SyncPopover {...sync} getSnapshot={store.getSnapshot} applyRemote={store.applyRemote} /></div></header>
    <section aria-label={view === 'today' ? '今天' : '待办池'}><div className="view-heading"><h1>{view === 'today' ? '今天' : '待办池'}</h1><p>{view === 'today' ? <><time dateTime={today}>{dateSubtitle}</time>{visible.length > 5 && <span className="focus-hint">慢慢来，一次做一件事。</span>}</> : '想做的事，先放在这里。'}</p></div>
      {view === 'today' && overdue.length > 0 && <div className="rollover"><div className="rollover-heading"><span className="rollover-dot" /><span>之前还有 {overdue.length} 件事未完成</span></div><div className="rollover-actions"><button onClick={() => overdue.forEach(task => store.move(task.id, 'today', today))}>移入今天</button><button onClick={() => overdue.forEach(task => store.move(task.id, 'anytime', null))}>放回待办池</button><button onClick={() => setRolloverOpen(!rolloverOpen)}>{rolloverOpen ? '收起' : '逐条查看'}</button></div>{rolloverOpen && overdue.map(task => <div className="rollover-item" key={task.id}><span>{task.title}</span><span><button onClick={() => store.move(task.id, 'today', today)}>今天</button>{' · '}<button onClick={() => store.move(task.id, 'anytime', null)}>待办池</button></span></div>)}</div>}
      <QuickAddInput inputRef={inputRef} onAdd={(title, date) => store.add(title, view, date)} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active: dragged, over }) => {
        if (!over || dragged.id === over.id) return
        const from = visible.findIndex(task => task.id === dragged.id)
        const to = visible.findIndex(task => task.id === over.id)
        if (from >= 0 && to >= 0) store.reorder(arrayMove(visible, from, to).map(task => task.id))
      }}><SortableContext items={visible.map(task => task.id)} strategy={verticalListSortingStrategy}><div><AnimatePresence initial={false}>{visible.map(task => <motion.div key={task.id} layout={!reduced} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? {} : { opacity: 0, height: 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}><SortableTask id={task.id} disabled={expanded === task.id || store.pending.has(task.id)} onComplete={() => store.toggle(task.id)} onMove={() => store.move(task.id, view === 'today' ? 'anytime' : 'today', view === 'today' ? null : today)}>{renderTask(task)}</SortableTask></motion.div>)}</AnimatePresence>{visible.length === 0 && <p className="empty">{view === 'today' ? '今天还是一片空白。' : '这里暂时空着。'}</p>}</div></SortableContext></DndContext>
      {done.length > 0 && <div className="done-section"><button className="done-toggle" onClick={() => setDoneOpen(!doneOpen)} aria-expanded={doneOpen}>{doneOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}已完成 {done.length} 项</button>{doneOpen && <div>{done.map(renderTask)}</div>}</div>}
    </section>
    {store.notice && <div className="toast" role="status"><span>{store.notice}</span><button onClick={store.undo}>撤销 ⌘Z</button></div>}
  </main>
}
