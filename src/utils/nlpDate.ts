import { localDate } from './date'

export interface ParsedDate {
  text: string
  index: number
  date: string
}

const expression = /下(?:周|星期)[一二三四五六日天]|(?:周|星期)[一二三四五六日天]|明天早上|明早|明天|今天|\b(?:tomorrow\s+morning|tomorrow|today|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/iu
const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export function parseDate(input: string, now = new Date()): ParsedDate | null {
  const match = expression.exec(input)
  if (!match || match.index === undefined) return null
  const text = match[0]
  const lower = text.toLowerCase()
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (lower === '明天' || lower === '明早' || lower === '明天早上' || lower.startsWith('tomorrow')) {
    date.setDate(date.getDate() + 1)
  } else if (lower !== '今天' && lower !== 'today') {
    const isNext = lower.startsWith('下') || lower.startsWith('next ')
    const chineseDay = '日一二三四五六'.indexOf(text.slice(-1) === '天' ? '日' : text.slice(-1))
    const englishDay = weekdays.indexOf(lower.replace(/^next\s+/, ''))
    const target = chineseDay >= 0 ? chineseDay : englishDay
    const current = (date.getDay() + 6) % 7
    const targetMonday = (target + 6) % 7
    const offset = isNext ? 7 - current + targetMonday : (target - date.getDay() + 7) % 7
    date.setDate(date.getDate() + offset)
  }
  return { text, index: match.index, date: localDate(date) }
}
