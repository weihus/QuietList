import type { Task } from '../types/task'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const encode64 = (bytes: Uint8Array) => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
const decode64 = (text: string) => Uint8Array.from(atob(text), char => char.charCodeAt(0))

export async function deriveCredentials(passphrase: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${passphrase}:quietlist:id:v1`))
  const syncId = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(syncId), iterations: 100000 }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  return { syncId, key }
}

export async function encryptTasks(tasks: Task[], key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(tasks))))
  return encode64(encoder.encode(JSON.stringify({ v: 1, iv: encode64(iv), ct: encode64(ciphertext) })))
}

export async function decryptTasks(payload: string, key: CryptoKey): Promise<unknown> {
  const envelope = JSON.parse(decoder.decode(decode64(payload))) as { v: number; iv: string; ct: string }
  if (envelope.v !== 1 || typeof envelope.iv !== 'string' || typeof envelope.ct !== 'string') throw new Error('无法识别的加密数据')
  const iv = decode64(envelope.iv)
  if (iv.length !== 12) throw new Error('无法识别的加密数据')
  return JSON.parse(decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, decode64(envelope.ct))))
}
