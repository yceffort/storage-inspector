import { describe, expect, it } from 'vitest'
import { inferType } from './infer'

describe('inferType', () => {
  it('null 은 string', () => {
    expect(inferType(null)).toBe('string')
  })

  it('"true"/"false" 는 boolean', () => {
    expect(inferType('true')).toBe('boolean')
    expect(inferType('false')).toBe('boolean')
  })

  it('숫자 문자열은 number', () => {
    expect(inferType('0')).toBe('number')
    expect(inferType('42')).toBe('number')
    expect(inferType('-3.5')).toBe('number')
    expect(inferType('1e3')).toBe('number')
  })

  it('공백만 있으면 string', () => {
    expect(inferType('')).toBe('string')
    expect(inferType('   ')).toBe('string')
  })

  it('객체/배열 JSON 은 json', () => {
    expect(inferType('{"a":1}')).toBe('json')
    expect(inferType('[1,2]')).toBe('json')
  })

  it('"null" 이나 따옴표 문자열 JSON 은 string', () => {
    expect(inferType('null')).toBe('string')
    expect(inferType('"hi"')).toBe('string')
  })

  it('일반 문자열은 string', () => {
    expect(inferType('hello')).toBe('string')
    expect(inferType('abc123')).toBe('string')
  })
})
