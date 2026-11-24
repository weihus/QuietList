import type { Task } from '../types/task'

export const TASKS_KEY = 'quietlist.tasks.v1'
const RETENTION = 30 * 24 * 60 * 60 * 1000

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function loadTasks(): Task[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(TASKS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const cutoff = Date.now() - RETENTION
    const tasks = (parsed as Task[]).filter(task => task && (task.completedAt == null || task.completedAt >= cutoff) && (task.deletedAt == null || task.deletedAt >= cutoff))
    saveTasks(tasks)
    return tasks
  } catch {
    return []
  }
}
