import type { Task } from '../types/task'

const words = ['amber', 'apple', 'ash', 'bamboo', 'bay', 'birch', 'bloom', 'brook', 'cedar', 'cloud', 'coral', 'dawn', 'deer', 'dew', 'dune', 'fern', 'field', 'fir', 'flame', 'flower', 'forest', 'frost', 'garden', 'glade', 'grain', 'grove', 'harbor', 'hazel', 'heath', 'honey', 'lake', 'leaf', 'lily', 'lotus', 'maple', 'meadow', 'mist', 'moon', 'moss', 'night', 'ocean', 'olive', 'orchid', 'pearl', 'pine', 'plum', 'pond', 'rain', 'reed', 'river', 'rose', 'sage', 'shore', 'sky', 'snow', 'stone', 'sun', 'thistle', 'valley', 'violet', 'willow', 'wind', 'winter', 'wood']

export function generatePassphrase(): string {
  const random = crypto.getRandomValues(new Uint8Array(12))
  const selected = Array.from(random.slice(0, 4), n => words[n & 63])
  const suffix = Array.from(random.slice(4), n => n.toString(16).padStart(2, '0')).join('')
  return [...selected, suffix].join('-')
}

export function validatePassphrase(value: string): string | null {
  if (value.length < 12) return '口令至少需要 12 个字符。'
  if (value.length > 512) return '口令过长。'
  if (/(password|qwerty|quietlist|123456|abcdef|iloveyou|letmein|admin)/i.test(value) || /^(.{1,6})\1+$/i.test(value) || new Set(value.toLowerCase()).size < 8) return '口令太容易猜到，请换一个更独特的口令。'
  return null
}

export function validateTasks(input: unknown): Task[] {
  if (!Array.isArray(input) || input.length > 10000) throw new Error('备份数据格式不正确')
  const ids = new Set<string>()
  for (const task of input) {
    const timestamp = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0
    const optionalTimestamp = (value: unknown) => value === null || timestamp(value)
    if (!task || typeof task !== 'object' || typeof task.id !== 'string' || !task.id || ids.has(task.id) || typeof task.title !== 'string' || typeof task.notes !== 'string' || !['today', 'anytime'].includes(task.list) || !(task.scheduledDate === null || (typeof task.scheduledDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(task.scheduledDate))) || !Array.isArray(task.subtasks) || !Number.isFinite(task.order) || !timestamp(task.createdAt) || !timestamp(task.updatedAt) || !optionalTimestamp(task.completedAt) || !optionalTimestamp(task.deletedAt)) throw new Error('备份数据格式不正确')
    ids.add(task.id)
    const subIds = new Set<string>()
    for (const sub of task.subtasks) {
      if (!sub || typeof sub.id !== 'string' || !sub.id || subIds.has(sub.id) || typeof sub.title !== 'string' || typeof sub.completed !== 'boolean' || !Number.isFinite(sub.order)) throw new Error('备份数据格式不正确')
      subIds.add(sub.id)
    }
  }
  return input as Task[]
}
