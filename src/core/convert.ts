import type { ValueType } from './types'

export type ConvertResult = { ok: true; raw: string } | { ok: false; error: string }

export function toRaw(type: ValueType, input: string): ConvertResult {
  switch (type) {
    case 'string':
      return { ok: true, raw: input }
    case 'number': {
      if (input.trim() === '') return { ok: false, error: '숫자를 입력하세요' }
      const n = Number(input)
      if (!Number.isFinite(n)) return { ok: false, error: '유효한 숫자가 아닙니다' }
      return { ok: true, raw: String(n) }
    }
    case 'boolean':
      return { ok: true, raw: input === 'true' ? 'true' : 'false' }
    case 'json':
      try {
        return { ok: true, raw: JSON.stringify(JSON.parse(input)) }
      } catch (e) {
        return { ok: false, error: `JSON 파싱 실패: ${(e as Error).message}` }
      }
  }
}

export function toDisplay(type: ValueType, raw: string | null): string {
  if (raw === null) return ''
  switch (type) {
    case 'string':
    case 'number':
      return raw
    case 'boolean':
      return raw === 'true' ? 'true' : 'false'
    case 'json':
      try {
        return JSON.stringify(JSON.parse(raw), null, 2)
      } catch {
        return raw
      }
  }
}
