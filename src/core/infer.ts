import type { ValueType } from './types'

export function inferType(raw: string | null): ValueType {
  if (raw === null) return 'string'
  if (raw === 'true' || raw === 'false') return 'boolean'
  if (raw.trim() !== '' && Number.isFinite(Number(raw))) return 'number'
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) return 'json'
  } catch {
    // JSON 이 아니면 string
  }
  return 'string'
}
