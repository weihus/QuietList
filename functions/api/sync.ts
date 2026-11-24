interface Statement {
  bind(...values: (string | number)[]): Statement
  first<T>(): Promise<T | null>
  run(): Promise<{ meta: { changes: number } }>
}
interface Env { DB: { prepare(sql: string): Statement } }
interface Context { request: Request; env: Env }

const MAX_CIPHERTEXT = 256 * 1024
const MAX_BODY = MAX_CIPHERTEXT + 1024
const idPattern = /^[0-9a-f]{64}$/
const headers = { 'Cache-Control': 'no-store' }

export async function onRequestGet({ request, env }: Context): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!idPattern.test(id)) return new Response('Invalid id', { status: 400, headers })
  const row = await env.DB.prepare('SELECT ciphertext, version FROM vaults WHERE sync_id = ?').bind(id).first<{ ciphertext: string; version: number }>()
  return row ? Response.json(row, { headers }) : new Response(null, { status: 404, headers })
}

export async function onRequestPut({ request, env }: Context): Promise<Response> {
  if (Number(request.headers.get('content-length')) > MAX_BODY) return new Response('Payload too large', { status: 413, headers })
  const reader = request.body?.getReader()
  if (!reader) return new Response('Invalid body', { status: 400, headers })
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY) { await reader.cancel(); return new Response('Payload too large', { status: 413, headers }) }
    chunks.push(value)
  }
  let payload: { sync_id?: unknown; ciphertext?: unknown; expectedVersion?: unknown }
  try {
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch { return new Response('Invalid JSON', { status: 400, headers }) }
  if (!payload || typeof payload !== 'object' || typeof payload.sync_id !== 'string' || !idPattern.test(payload.sync_id) || typeof payload.ciphertext !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.ciphertext) || !Number.isSafeInteger(payload.expectedVersion) || (payload.expectedVersion as number) < 0) return new Response('Invalid payload', { status: 400, headers })
  if (payload.ciphertext.length > MAX_CIPHERTEXT) return new Response('Payload too large', { status: 413, headers })
  const version = payload.expectedVersion as number
  const now = Date.now()
  const result = version === 0
    ? await env.DB.prepare('INSERT OR IGNORE INTO vaults (sync_id, ciphertext, version, updated_at) VALUES (?, ?, 1, ?)').bind(payload.sync_id, payload.ciphertext, now).run()
    : await env.DB.prepare('UPDATE vaults SET ciphertext = ?, version = version + 1, updated_at = ? WHERE sync_id = ? AND version = ?').bind(payload.ciphertext, now, payload.sync_id, version).run()
  if (result.meta.changes !== 1) return new Response('Version conflict', { status: 409, headers })
  return Response.json({ version: version + 1 }, { headers })
}
