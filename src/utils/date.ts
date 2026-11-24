export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function tomorrowDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return localDate(date)
}
