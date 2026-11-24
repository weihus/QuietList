import { useEffect, useRef, useState } from 'react'
import { Cloud, CloudOff } from 'lucide-react'
import QRCode from 'qrcode'
import type { Task } from '../types/task'
import { generatePassphrase, validateTasks } from '../sync/passphrase'

type Props = {
  passphrase: string | null
  status: 'local' | 'connecting' | 'syncing' | 'synced' | 'error'
  error: string
  lastSynced: number | null
  connect: (value: string) => string | null
  disconnect: () => void
  syncNow: () => void
  getSnapshot: () => Task[]
  applyRemote: (tasks: Task[]) => Task[]
}

export function SyncPopover({ passphrase, status, error, lastSynced, connect, disconnect, syncNow, getSnapshot, applyRemote }: Props) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [reveal, setReveal] = useState(false)
  const [message, setMessage] = useState('')
  const [qr, setQr] = useState('')
  const [showQr, setShowQr] = useState(false)
  const [changing, setChanging] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => {
    let active = true
    setQr('')
    if (passphrase && showQr) {
      const link = `${location.origin}${location.pathname}${location.search}#sync=${encodeURIComponent(passphrase)}`
      void QRCode.toDataURL(link, { width: 240, margin: 2 }).then(url => { if (active) setQr(url) }).catch(() => { if (active) setMessage('二维码生成失败，请检查口令长度。') })
    }
    return () => { active = false }
  }, [passphrase, showQr])
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ version: 1, tasks: getSnapshot() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = 'quietlist-backup.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  const importBackup = async (file: File) => {
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('备份文件超过 2 MB。')
      const data: unknown = JSON.parse(await file.text())
      if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('tasks' in data)) throw new Error('无法识别的备份格式。')
      applyRemote(validateTasks(data.tasks))
      setMessage('备份已合并到当前清单。')
    } catch (err) { setMessage(err instanceof Error ? err.message : '无法读取备份。') }
  }
  const connectInput = (input: string) => {
    const trimmed = input.trim()
    if (!/^https?:\/\//i.test(trimmed)) return connect(input)
    try {
      const url = new URL(trimmed)
      const secret = new URLSearchParams(url.hash.slice(1)).get('sync')
      return secret ? connect(secret) : '链接中没有同步口令。'
    } catch { return '无法识别同步链接。' }
  }
  const label = status === 'local' ? '仅保存在本机' : status === 'connecting' ? '正在准备加密' : status === 'syncing' ? '正在同步' : status === 'synced' ? '已同步' : '同步遇到问题'
  const Icon = status === 'error' ? CloudOff : Cloud
  return <div className="sync-wrap" ref={ref} onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing) { setOpen(false); event.stopPropagation() } }}>
    <button type="button" className="sync-trigger" aria-label={`同步设置：${label}`} aria-expanded={open} onClick={() => setOpen(!open)}><Icon size={19} strokeWidth={1.75} /></button>
    {open && <div className="sync-popover" role="region" aria-label="同步设置">
      <div className="sync-heading"><strong>同步与备份</strong><span>{label}</span></div>
      {(!passphrase || changing) ? <form onSubmit={event => { event.preventDefault(); const result = connectInput(value); if (result) setMessage(result); else { setValue(''); setChanging(false); setShowCurrent(false); setShowQr(false); setMessage('') } }}>
        <p>使用口令或粘贴同步链接，在设备之间加密同步。</p>
        <label className="sr-only" htmlFor="sync-user">用户名</label><input className="sr-only" id="sync-user" name="username" autoComplete="username" value="QuietList Sync" readOnly tabIndex={-1} />
        <label htmlFor="sync-password">同步口令</label><input id="sync-password" name="password" type={reveal ? 'text' : 'password'} autoComplete="current-password" value={value} onChange={event => setValue(event.target.value)} placeholder="至少 12 个字符" />
        <div className="sync-actions"><button type="button" onClick={() => setReveal(!reveal)}>{reveal ? '隐藏口令' : '显示口令'}</button><button type="button" onClick={() => { setValue(generatePassphrase()); setReveal(true); setMessage('已生成随机口令，请先保存；连接后可用二维码在另一台设备打开。') }}>生成口令</button><button type="submit" className="sync-primary">{changing ? '更换绑定' : '连接'}</button>{changing && <button type="button" onClick={() => { setChanging(false); setValue(''); setMessage('') }}>取消</button>}</div>
        {changing && <p>更换后此设备将连接新口令；其他设备需分别更换，旧口令不会自动失效。</p>}
        <p>口令不会发送至服务器。请妥善保存；丢失后无法恢复云端数据。</p>
      </form> : <div><p>此设备已绑定，口令保存在本设备浏览器中。</p>{lastSynced && <p>最近同步：{new Date(lastSynced).toLocaleTimeString()}</p>}
        {showCurrent && <><label htmlFor="current-sync-password">当前同步口令</label><input id="current-sync-password" type="text" value={passphrase} readOnly onFocus={event => event.currentTarget.select()} /></>}
        <div className="sync-actions"><button onClick={syncNow}>立即同步</button><button onClick={() => setShowCurrent(!showCurrent)}>{showCurrent ? '隐藏口令' : '显示口令'}</button><button onClick={() => setShowQr(!showQr)}>{showQr ? '隐藏二维码' : '连接其他设备'}</button><button onClick={() => { setChanging(true); setShowQr(false); setShowCurrent(false) }}>更换口令</button><button onClick={() => { disconnect(); setShowQr(false); setShowCurrent(false); setMessage('') }}>断开</button></div>
        {showQr && <div className="sync-qr">{qr && <img src={qr} alt="扫码连接同步的二维码" />}<p>二维码包含同步口令，请勿分享给他人。</p></div>}
      </div>}
      {error && <p role="alert" className="sync-error">{error}</p>}{message && <p role="status">{message}</p>}
      <div className="sync-backup"><strong>本地备份</strong><p>备份文件包含未加密的任务内容，请妥善保存。</p><div className="sync-actions"><button onClick={exportBackup}>导出 JSON</button><button onClick={() => fileRef.current?.click()}>导入 JSON</button></div><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.target.value = '' }} /></div>
    </div>}
  </div>
}
