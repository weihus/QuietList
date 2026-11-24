import { useCallback, useEffect, useRef, useState } from 'react'
import type { ListType, Task } from '../types/task'
import { localDate } from '../utils/date'
import { loadTasks, saveTasks, TASKS_KEY } from './localStore'
import { validateTasks } from '../sync/passphrase'
import { mergeTasks } from '../sync/merge'

type UndoEntry = { id: string; previous: Partial<Task> }

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const tasksRef = useRef(tasks)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const [pending, setPending] = useState<Set<string>>(new Set())
  const undoStack = useRef<UndoEntry[]>([])
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commit = useCallback((next: Task[]) => {
    tasksRef.current = next
    saveTasks(next)
    setTasks(next)
  }, [])
  const notify = useCallback((text: string) => {
    setNotice(text)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 3000)
  }, [])
  const update = useCallback((id: string, patch: Partial<Task>) => {
    commit(tasksRef.current.map(task => task.id === id ? { ...task, ...patch, updatedAt: Math.max(Date.now(), task.updatedAt + 1) } : task))
  }, [commit])
  const cancelPending = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) clearTimeout(timer)
    timers.current.delete(id)
    setPending(new Set(timers.current.keys()))
  }, [])
  const settle = useCallback((id: string) => {
    if (!timers.current.has(id)) return
    cancelPending(id)
    const task = tasksRef.current.find(item => item.id === id)
    if (!task || task.deletedAt !== null || task.completedAt !== null) return
    undoStack.current.push({ id, previous: { completedAt: task.completedAt } })
    update(id, { completedAt: Date.now() })
    notify('已完成')
  }, [cancelPending, notify, update])
  useEffect(() => {
    const flush = () => {
      const ids = [...timers.current.keys()]
      if (!ids.length) return
      const now = Date.now()
      ids.forEach(id => { const timer = timers.current.get(id); if (timer !== undefined) clearTimeout(timer) })
      timers.current.clear()
      const idSet = new Set(ids)
      const next = tasksRef.current.map(task => idSet.has(task.id) && task.completedAt === null && task.deletedAt === null ? { ...task, completedAt: now, updatedAt: Math.max(now, task.updatedAt + 1) } : task)
      tasksRef.current = next
      saveTasks(next)
    }
    window.addEventListener('beforeunload', flush)
    return () => { window.removeEventListener('beforeunload', flush) }
  }, [])
  const add = useCallback((title: string, list: ListType, date: string | null = null) => {
    const now = Date.now()
    const task: Task = { id: crypto.randomUUID(), title, notes: '', list: date ? 'today' : list, scheduledDate: date ?? (list === 'today' ? localDate() : null), subtasks: [], order: Math.max(now, ...tasksRef.current.map(item => item.order + 1)), completedAt: null, createdAt: now, updatedAt: now, deletedAt: null }
    commit([...tasksRef.current, task])
  }, [commit])
  const toggle = useCallback((id: string) => {
    if (timers.current.has(id)) { cancelPending(id); return }
    const task = tasksRef.current.find(item => item.id === id)
    if (!task || task.deletedAt !== null) return
    if (task.completedAt !== null) {
      undoStack.current.push({ id, previous: { completedAt: task.completedAt } })
      update(id, { completedAt: null })
      return
    }
    timers.current.set(id, setTimeout(() => settle(id), 1500))
    setPending(new Set(timers.current.keys()))
  }, [cancelPending, settle, update])
  const move = useCallback((id: string, list: ListType, scheduledDate: string | null) => {
    const task = tasksRef.current.find(item => item.id === id)
    if (!task || (task.list === list && task.scheduledDate === scheduledDate)) return
    undoStack.current.push({ id, previous: { list: task.list, scheduledDate: task.scheduledDate } })
    update(id, { list, scheduledDate })
    notify('已移动')
  }, [notify, update])
  const remove = useCallback((id: string) => {
    const task = tasksRef.current.find(item => item.id === id)
    if (!task) return
    cancelPending(id)
    undoStack.current.push({ id, previous: { deletedAt: task.deletedAt } })
    update(id, { deletedAt: Date.now() })
    notify('已删除')
  }, [cancelPending, notify, update])
  const reorder = useCallback((ids: string[]) => {
    const selected = tasksRef.current.filter(task => ids.includes(task.id)).sort((a, b) => a.order - b.order)
    const positions = selected.map((task, index) => index === 0 ? task.order : Math.max(task.order, selected[0].order + index))
    const now = Date.now()
    const orderById = new Map(ids.map((id, index) => [id, positions[index]]))
    commit(tasksRef.current.map(task => {
      const order = orderById.get(task.id)
      return order === undefined || order === task.order ? task : { ...task, order, updatedAt: Math.max(now, task.updatedAt + 1) }
    }))
  }, [commit])
  const undo = useCallback(() => {
    const entry = undoStack.current.pop()
    if (!entry) return
    cancelPending(entry.id)
    update(entry.id, entry.previous)
    setNotice('')
  }, [cancelPending, update])
  const getSnapshot = useCallback(() => tasksRef.current, [])
  const applyRemote = useCallback((incoming: Task[]) => {
    const next = mergeTasks(tasksRef.current, incoming)
    const previous = tasksRef.current
    if (JSON.stringify(next) !== JSON.stringify(previous)) {
      for (const id of timers.current.keys()) {
        const task = next.find(item => item.id === id)
        if (!task || task.completedAt !== null || task.deletedAt !== null) cancelPending(id)
      }
      commit(next)
    }
    return next
  }, [cancelPending, commit])
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TASKS_KEY || event.newValue === null) return
      try { applyRemote(validateTasks(JSON.parse(event.newValue))) } catch { /* Ignore malformed writes from another tab. */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [applyRemote])
  return { tasks, pending, notice, add, update, toggle, move, remove, reorder, undo, getSnapshot, applyRemote }
}
