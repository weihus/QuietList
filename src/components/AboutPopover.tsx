import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

export function AboutPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <div className="about-wrap" ref={ref} onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) { setOpen(false); triggerRef.current?.focus(); event.stopPropagation() }
  }}>
    <button ref={triggerRef} className="about-trigger" type="button" aria-label="关于 QuietList" aria-expanded={open} aria-controls="about-quietlist" onClick={() => setOpen(!open)}><Info size={16} strokeWidth={1.75} /></button>
    {open && <div id="about-quietlist" className="about-popover" role="region" aria-label="关于 QuietList">
      <strong>关于 QuietList</strong>
      <p>记下想做的事，温柔地安排今天。</p>
      <p><b>今天</b>，放下想要完成的事。没做完也没关系，可以留到明天。</p>
      <p><b>待办池</b>，收留暂时不想安排日期的事。</p>
      <p><b>同步</b>，用同一口令在设备间加密同步；请妥善保管口令，并定期导出备份。</p>
    </div>}
  </div>
}
