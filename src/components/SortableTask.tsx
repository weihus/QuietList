import { useRef, type ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

type Props = {
  id: string
  disabled: boolean
  children: ReactNode
  onComplete: () => void
  onMove: () => void
}

export function SortableTask({ id, disabled, children, onComplete, onMove }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })
  const touch = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  return <div ref={setNodeRef} className={`sortable-task ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}
    onTouchStart={event => {
      if (disabled || event.touches.length !== 1 || (event.target as HTMLElement).closest('button.checkbox, input, textarea, .drag-handle')) return
      touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }}
    onTouchEnd={event => {
      if (!touch.current || disabled) return
      const dx = event.changedTouches[0].clientX - touch.current.x
      const dy = event.changedTouches[0].clientY - touch.current.y
      touch.current = null
      if (Math.abs(dx) <= 64 || Math.abs(dx) <= Math.abs(dy)) return
      suppressClick.current = true
      window.setTimeout(() => { suppressClick.current = false }, 500)
      if (dx > 0) { navigator.vibrate?.(10); onComplete() } else onMove()
    }}
    onTouchCancel={() => { touch.current = null }}
    onClickCapture={event => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation() } }}>
    {children}
    <button ref={setActivatorNodeRef} className="drag-handle" type="button" aria-label="拖动排序" {...attributes} {...listeners}><GripVertical size={16} strokeWidth={1.75} /></button>
  </div>
}
