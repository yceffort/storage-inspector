import { describe, expect, it } from 'vitest'
import { toDisplay, toRaw } from './convert'

describe('toRaw', () => {
  it('string 은 그대로', () => {
    expect(toRaw('string', ' hi ')).toEqual({ ok: true, raw: ' hi ' })
  })

  it('number 는 정규화된 숫자 문자열', () => {
    expect(toRaw('number', '42')).toEqual({ ok: true, raw: '42' })
    expect(toRaw('number', ' 3.50 ')).toEqual({ ok: true, raw: '3.5' })
    expect(toRaw('number', '1e3')).toEqual({ ok: true, raw: '1000' })
  })

  it('number 검증 실패', () => {
    expect(toRaw('number', '').ok).toBe(false)
    expect(toRaw('number', 'abc').ok).toBe(false)
    expect(toRaw('number', 'Infinity').ok).toBe(false)
  })

  it('boolean 은 "true" 일 때만 true', () => {
    expect(toRaw('boolean', 'true')).toEqual({ ok: true, raw: 'true' })
    expect(toRaw('boolean', 'false')).toEqual({ ok: true, raw: 'false' })
    expect(toRaw('boolean', 'yes')).toEqual({ ok: true, raw: 'false' })
  })

  it('json 은 압축 직렬화', () => {
    expect(toRaw('json', '{ "a": 1,\n "b": [1, 2] }')).toEqual({ ok: true, raw: '{"a":1,"b":[1,2]}' })
  })

  it('json 검증 실패', () => {
    const result = toRaw('json', '{a:1}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('JSON')
  })
})

describe('toDisplay', () => {
  it('null 은 빈 문자열', () => {
    expect(toDisplay('string', null)).toBe('')
    expect(toDisplay('json', null)).toBe('')
  })

  it('string/number 는 그대로', () => {
    expect(toDisplay('string', 'x')).toBe('x')
    expect(toDisplay('number', '42')).toBe('42')
  })

  it('boolean 은 "true"/"false" 로 정규화', () => {
    expect(toDisplay('boolean', 'true')).toBe('true')
    expect(toDisplay('boolean', 'anything')).toBe('false')
  })

  it('json 은 들여쓰기 2', () => {
    expect(toDisplay('json', '{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('json 파싱 실패 시 raw 그대로', () => {
    expect(toDisplay('json', '{broken')).toBe('{broken')
  })
})
