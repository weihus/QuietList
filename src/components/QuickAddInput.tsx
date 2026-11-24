import { Plus } from 'lucide-react'
import { useRef, useState, type RefObject } from 'react'
import { parseDate, type ParsedDate } from '../utils/nlpDate'

type QuickAddInputProps = {
  inputRef: RefObject<HTMLInputElement | null>
  onAdd: (title: string, date: string | null) => void
}

export function QuickAddInput({ inputRef, onAdd }: QuickAddInputProps) {
  const [title, setTitle] = useState('')
  const [parsed, setParsed] = useState<ParsedDate | null>(null)
  const composing = useRef(false)
  const suppressed = useRef<string | null>(null)
  const updateTitle = (value: string, allowParsing = true) => {
    if (suppressed.current && !value.includes(suppressed.current)) suppressed.current = null
    if (!allowParsing || composing.current || parsed || suppressed.current) { setTitle(value); return }
    const result = parseDate(value)
    if (!result) { setTitle(value); return }
    setParsed(result)
    setTitle(value.slice(0, result.index) + value.slice(result.index + result.text.length))
  }
  const restoreDate = () => {
    if (!parsed) return
    const index = Math.min(parsed.index, title.length)
    setTitle(title.slice(0, index) + parsed.text + title.slice(index))
    setParsed(null)
    suppressed.current = parsed.text
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(index + parsed.text.length, index + parsed.text.length) })
  }
  return (
    <form className="quick-add" onSubmit={(event) => {
      event.preventDefault()
      if (composing.current) return
      const trimmed = title.trim()
      if (trimmed) { onAdd(trimmed, parsed?.date ?? null); setTitle(''); setParsed(null); suppressed.current = null }
    }}>
      <Plus className="quick-add-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
      <input ref={inputRef} value={title} onChange={(event) => updateTitle(event.target.value)}
        onCompositionStart={() => { composing.current = true }} onCompositionEnd={event => { composing.current = false; updateTitle(event.currentTarget.value) }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || composing.current) return
          if (event.key === 'Backspace' && parsed && event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length) { event.preventDefault(); restoreDate(); return }
          if (event.key === 'Escape') event.currentTarget.blur()
          if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
        }}
        placeholder="记下想做的事…" aria-label="添加任务" />
      {parsed && <button type="button" className="date-chip" onClick={restoreDate} aria-label={`取消日期 ${parsed.text}`}>{parsed.text}</button>}
      <button className="quick-add-submit" type="submit" disabled={!title.trim()}>添加</button>
    </form>
  )
}
