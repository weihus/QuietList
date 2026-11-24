export type ListType = 'today' | 'anytime'

export interface Subtask {
  id: string
  title: string
  completed: boolean
  order: number
}

export interface Task {
  id: string
  title: string
  notes: string
  list: ListType
  scheduledDate: string | null
  subtasks: Subtask[]
  order: number
  completedAt: number | null
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
