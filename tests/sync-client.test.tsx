import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { JSDOM } from 'jsdom'
import type { Task } from '../src/types/task'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage })
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
const { renderHook, waitFor, cleanup, act } = await import('@testing-library/react')
const { useSyncClient } = await import('../src/sync/syncClient')
const pass = 'amber-river-birch-cloud-8f1263b4ad562710'
const key = 'quietlist.sync.passphrase'
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear() })

test('migrates session binding and polls without idle writes', async () => {
  sessionStorage.setItem(key, pass)
  let vault: { ciphertext: string; version: number } | null = null
  let reads = 0
  let writes = 0
  let poll: (() => void) | undefined
  const originalInterval = window.setInterval
  const originalClear = window.clearInterval
  const originalFetch = globalThis.fetch
  window.setInterval = ((callback: TimerHandler) => { poll = callback as () => void; return 1 }) as typeof window.setInterval
  window.clearInterval = (() => {}) as typeof window.clearInterval
  globalThis.fetch = (async (_url: string | URL | Request, options?: RequestInit) => {
    if (options?.method === 'PUT') {
      const body = JSON.parse(options.body as string)
      if (body.expectedVersion !== (vault?.version ?? 0)) return new Response(null, { status: 409 })
      vault = { ciphertext: body.ciphertext, version: body.expectedVersion + 1 }
      writes++
      return Response.json({ version: vault.version })
    }
    reads++
    return vault ? Response.json(vault) : new Response(null, { status: 404 })
  }) as typeof fetch
  try {
    const tasks: Task[] = []
    const getSnapshot = () => tasks
    const applyRemote = () => tasks
    const hook = renderHook(() => useSyncClient(tasks, getSnapshot, applyRemote, null))
    await waitFor(() => assert.equal(hook.result.current.status, 'synced'))
    assert.equal(localStorage.getItem(key), pass)
    assert.equal(sessionStorage.getItem(key), null)
    assert.equal(writes, 1)
    const beforeReads = reads
    act(() => poll!())
    await waitFor(() => assert.ok(reads > beforeReads))
    await waitFor(() => assert.equal(hook.result.current.status, 'synced'))
    assert.equal(writes, 1)
    act(() => hook.result.current.disconnect())
    assert.equal(localStorage.getItem(key), null)
  } finally {
    window.setInterval = originalInterval
    window.clearInterval = originalClear
    globalThis.fetch = originalFetch
  }
})
