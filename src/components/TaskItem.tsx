import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FileText, Plus, Trash2 } from 'lucide-react'
import type { Subtask, Task } from '../types/task'

type Props = {
  task: Task
  pending: boolean
  expanded: boolean
  focused: boolean
  today: string
  tomorrow: string
  onToggle: () => void
  onExpand: () => void
  onClose: () => void
  onUpdate: (patch: Partial<Task>) => void
  onMove: (list: 'today' | 'anytime', date: string | null) => void
  onDelete: () => void
}

export function TaskItem({ task, pending, expanded, focused, today, tomorrow, onToggle, onExpand, onClose, onUpdate, onMove, onDelete }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [subtask, setSubtask] = useState('')
  const reduced = useReducedMotion()
  useEffect(() => {
    if (!expanded) return
    const handle = (event: PointerEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) onClose() }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }, [expanded, onClose])
  const changeSubtask = (id: string, patch: Partial<Subtask>) => onUpdate({ subtasks: task.subtasks.map(item => item.id === id ? { ...item, ...patch } : item) })
  const keyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
    if (event.key === 'Escape' || (event.key === 'Enter' && (event.metaKey || event.ctrlKey))) { event.preventDefault(); onClose() }
  }
  const done = pending || task.completedAt !== null
  return <motion.div ref={ref} layout={!reduced} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }} className={`task ${expanded ? 'task-expanded' : ''} ${focused ? 'task-focused' : ''} ${done ? 'task-done' : ''}`}>
    <div className="task-main">
      <button className={`checkbox ${done ? 'checked' : ''}`} onClick={onToggle} aria-label={done ? '撤销完成' : '完成任务'}><motion.svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" initial={false} animate={{ scale: done ? 1 : 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}><motion.path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" pathLength={1} initial={false} animate={{ strokeDashoffset: done ? 0 : 1 }} transition={reduced ? { duration: 0 } : { duration: 0.2 }} /></motion.svg></button>
      {expanded ? <input className="task-title-input" value={task.title} aria-label="任务标题" onChange={event => onUpdate({ title: event.target.value })} onKeyDown={keyDown} /> : <button className="task-title" onClick={onExpand}><span>{task.title || '未命名任务'}</span></button>}
      {!expanded && <span className="task-meta">{task.notes && <FileText size={14} strokeWidth={1.75} />}{task.scheduledDate && task.scheduledDate > today && <time>{Number(task.scheduledDate.slice(5, 7))}月{Number(task.scheduledDate.slice(8, 10))}日</time>}</span>}
    </div>
    <AnimatePresence initial={false}>{expanded && <motion.div className="task-details" initial={reduced ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}>
      <textarea aria-label="备注" placeholder="添加备注…" value={task.notes} rows={Math.max(2, task.notes.split('\n').length)} onChange={event => onUpdate({ notes: event.target.value })} onKeyDown={keyDown} />
      <div className="subtasks">{task.subtasks.map(item => <div className="subtask" key={item.id}><input type="checkbox" checked={item.completed} aria-label="完成子项" onChange={event => changeSubtask(item.id, { completed: event.target.checked })} /><input aria-label="子项标题" value={item.title} onChange={event => changeSubtask(item.id, { title: event.target.value })} onKeyDown={keyDown} /><button aria-label="删除子项" onClick={() => onUpdate({ subtasks: task.subtasks.filter(sub => sub.id !== item.id) })}>×</button></div>)}
        <div className="subtask add-subtask"><Plus size={15} /><input aria-label="添加子项" value={subtask} placeholder="添加子项…" onChange={event => setSubtask(event.target.value)} onKeyDown={event => { if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return; if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) { event.preventDefault(); if (subtask.trim()) { onUpdate({ subtasks: [...task.subtasks, { id: crypto.randomUUID(), title: subtask.trim(), completed: false, order: task.subtasks.length }] }); setSubtask('') } } else keyDown(event) }} /></div>
      </div>
      <div className="task-toolbar"><button onClick={() => onMove('today', today)}>今天</button><button onClick={() => onMove('today', tomorrow)}>明天</button><button onClick={() => onMove('anytime', null)}>待办池</button><label className="date-label">选日期<input type="date" aria-label="选择日期" value={task.scheduledDate ?? ''} onChange={event => { if (event.target.value) onMove('today', event.target.value) }} onKeyDown={keyDown} /></label><button className="delete" onClick={onDelete} aria-label="删除任务"><Trash2 size={16} strokeWidth={1.75} /></button></div>
    </motion.div>}</AnimatePresence>
  </motion.div>
}
