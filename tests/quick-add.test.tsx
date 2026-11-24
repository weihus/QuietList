import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { parseDate } from '../src/utils/nlpDate'

const friday = new Date(2026, 10, 20, 12)
for (const [input, token, expected] of [
  ['明早9点 寄快递', '明早', '2026-11-21'],
  ['周五 团队复盘', '周五', '2026-11-20'],
  ['下周一 交月报', '下周一', '2026-11-23'],
  ['tomorrow buy milk', 'tomorrow', '2026-11-21'],
  ['总结今天的工作', '今天', '2026-11-20'],
] as const) {
  test(`parse ${input}`, () => {
    const result = parseDate(input, friday)
    assert.equal(result?.text, token)
    assert.equal(result?.date, expected)
    assert.equal(input.slice(result!.index, result!.index + token.length), token)
  })
}

test('week boundaries and English word boundaries', () => {
  assert.equal(parseDate('下周一', new Date(2026, 10, 22))?.date, '2026-11-23')
  assert.equal(parseDate('tomorrowland', friday), null)
})

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, requestAnimationFrame: (fn: FrameRequestCallback) => setTimeout(fn, 0) })
const React = await import('react')
const { render, fireEvent, cleanup } = await import('@testing-library/react')
const { QuickAddInput } = await import('../src/components/QuickAddInput')
afterEach(cleanup)

test('Backspace restores date inside original text', async () => {
  const view = render(<QuickAddInput inputRef={React.createRef()} onAdd={() => {}} />)
  const input = view.getByLabelText('添加任务') as HTMLInputElement
  fireEvent.change(input, { target: { value: '总结今天的工作' } })
  assert.ok(view.getByRole('button', { name: '取消日期 今天' }))
  input.setSelectionRange(input.value.length, input.value.length)
  fireEvent.keyDown(input, { key: 'Backspace' })
  assert.equal(input.value, '总结今天的工作')
  assert.equal(view.queryByRole('button', { name: '取消日期 今天' }), null)
})

test('date alone never creates an empty task', () => {
  let count = 0
  const view = render(<QuickAddInput inputRef={React.createRef()} onAdd={() => { count++ }} />)
  const input = view.getByLabelText('添加任务') as HTMLInputElement
  fireEvent.change(input, { target: { value: '明天' } })
  assert.ok(view.getByRole('button', { name: '取消日期 明天' }))
  fireEvent.submit(input.closest('form')!)
  assert.equal(count, 0)
})

test('IME composition postpones parsing and submission', () => {
  let count = 0
  const view = render(<QuickAddInput inputRef={React.createRef()} onAdd={() => { count++ }} />)
  const input = view.getByLabelText('添加任务') as HTMLInputElement
  fireEvent.compositionStart(input)
  fireEvent.change(input, { target: { value: '明天 寄快递' } })
  assert.equal(view.queryByRole('button', { name: '取消日期 明天' }), null)
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 })
  fireEvent.submit(input.closest('form')!)
  assert.equal(count, 0)
  fireEvent.compositionEnd(input, { data: '明天 寄快递' })
  assert.ok(view.getByRole('button', { name: '取消日期 明天' }))
})
