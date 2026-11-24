import type { Task } from '../types/task'

export function mergeTasks(local: Task[], remote: Task[], now = Date.now()): Task[] {
  const merged = new Map(local.map(task => [task.id, task]))
  for (const task of remote) {
    const existing = merged.get(task.id)
    if (!existing || task.updatedAt >= existing.updatedAt) merged.set(task.id, task)
  }
  const cutoff = now - 30 * 24 * 60 * 60 * 1000
  return [...merged.values()].filter(task => (task.completedAt === null || task.completedAt >= cutoff) && (task.deletedAt === null || task.deletedAt >= cutoff)).sort((a, b) => a.id.localeCompare(b.id))
}
