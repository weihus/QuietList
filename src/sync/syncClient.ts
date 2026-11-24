import { useCallback, useEffect, useRef, useState } from 'react'
import type { Task } from '../types/task'
import { decryptTasks, deriveCredentials, encryptTasks } from './crypto'
import { validatePassphrase, validateTasks } from './passphrase'

type Status = 'local' | 'connecting' | 'syncing' | 'synced' | 'error'
type Credentials = Awaited<ReturnType<typeof deriveCredentials>>
const SESSION_KEY = 'quietlist.sync.passphrase'
const POLL_INTERVAL = 30_000

export function useSyncClient(tasks: Task[], getSnapshot: () => Task[], applyRemote: (tasks: Task[]) => Task[], initialPassphrase: string | null) {
  const [passphrase, setPassphrase] = useState<string | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
    const selected = initialPassphrase !== null && !validatePassphrase(initialPassphrase) ? initialPassphrase : saved
    if (selected) localStorage.setItem(SESSION_KEY, selected)
    sessionStorage.removeItem(SESSION_KEY)
    return selected
  })
  const [status, setStatus] = useState<Status>(initialPassphrase !== null && validatePassphrase(initialPassphrase) ? 'error' : 'local')
  const [error, setError] = useState(initialPassphrase !== null ? validatePassphrase(initialPassphrase) ?? '' : '')
  const [lastSynced, setLastSynced] = useState<number | null>(null)
  const generation = useRef(0)
  const credentials = useRef<Credentials | null>(null)
  const running = useRef(false)
  const dirty = useRef(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runRef = useRef<() => void>(() => {})
  const stop = useCallback(() => {
    generation.current++
    credentials.current = null
    dirty.current = false
    if (timeout.current) clearTimeout(timeout.current)
  }, [])
  runRef.current = () => {
    if (!credentials.current) return
    dirty.current = true
    if (running.current) return
    running.current = true
    const token = generation.current
    const current = credentials.current
    const alive = () => token === generation.current
    void (async () => {
      try {
        while (dirty.current && alive()) {
          dirty.current = false
          setStatus('syncing')
          let success = false
          for (let attempt = 0; attempt < 4; attempt++) {
            const response = await fetch(`/api/sync?id=${current.syncId}`, { cache: 'no-store' })
            if (!alive()) return
            let remote: Task[] = []
            let version = 0
            if (response.ok) {
              const data: unknown = await response.json()
              if (!data || typeof data !== 'object' || !('ciphertext' in data) || typeof data.ciphertext !== 'string' || !('version' in data) || !Number.isSafeInteger(data.version) || (data.version as number) < 1) throw new Error('服务器返回了无效数据')
              version = data.version as number
              remote = validateTasks(await decryptTasks(data.ciphertext, current.key))
            } else if (response.status !== 404) throw new Error(`读取同步数据失败（${response.status}）`)
            if (!alive()) return
            const merged = applyRemote(remote)
            const snapshot = JSON.stringify(merged)
            if (version > 0 && snapshot === JSON.stringify([...remote].sort((a, b) => a.id.localeCompare(b.id)))) {
              success = true
              setLastSynced(Date.now())
              setError('')
              break
            }
            const ciphertext = await encryptTasks(merged, current.key)
            if (!alive()) return
            if (ciphertext.length > 256 * 1024) throw new Error('清单太大，超过同步大小限制')
            const put = await fetch('/api/sync', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sync_id: current.syncId, ciphertext, expectedVersion: version }) })
            if (!alive()) return
            if (put.status === 409) continue
            if (!put.ok) throw new Error(`上传同步数据失败（${put.status}）`)
            if (JSON.stringify(getSnapshot()) !== snapshot) dirty.current = true
            success = true
            setLastSynced(Date.now())
            setError('')
            break
          }
          if (!success) throw new Error('同步冲突，请稍后重试')
        }
        if (alive()) setStatus('synced')
      } catch {
        if (alive()) { setError('同步失败，请检查网络、口令或稍后重试。'); setStatus('error') }
      } finally {
        running.current = false
        if (dirty.current && credentials.current && !alive()) runRef.current()
      }
    })()
  }
  const connect = useCallback((value: string) => {
    const reason = validatePassphrase(value)
    if (reason) return reason
    if (value === passphrase && credentials.current) { runRef.current(); return null }
    stop()
    localStorage.setItem(SESSION_KEY, value)
    sessionStorage.removeItem(SESSION_KEY)
    setPassphrase(value)
    setError('')
    return null
  }, [passphrase, stop])
  const disconnect = useCallback(() => {
    stop()
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    setPassphrase(null)
    setStatus('local')
    setLastSynced(null)
    setError('')
  }, [stop])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== SESSION_KEY || event.newValue === passphrase) return
      stop()
      setPassphrase(event.newValue)
      setLastSynced(null)
      setError('')
      if (!event.newValue) setStatus('local')
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [passphrase, stop])
  useEffect(() => {
    if (!passphrase) return
    const token = ++generation.current
    setStatus('connecting')
    void deriveCredentials(passphrase).then(result => {
      if (generation.current !== token) return
      credentials.current = result
      runRef.current()
    }).catch(() => { if (generation.current === token) { setStatus('error'); setError('无法启用本地加密，请使用安全的 HTTPS 连接。') } })
    return stop
  }, [passphrase, stop])
  useEffect(() => {
    if (!credentials.current) return
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = setTimeout(() => runRef.current(), 800)
    return () => { if (timeout.current) clearTimeout(timeout.current) }
  }, [tasks])
  useEffect(() => {
    const visible = () => { if (document.visibilityState === 'visible') runRef.current() }
    const online = () => runRef.current()
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) runRef.current() }, POLL_INTERVAL)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('online', online)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', online) }
  }, [])
  return { passphrase, status, error, lastSynced, connect, disconnect, syncNow: () => runRef.current() }
}
