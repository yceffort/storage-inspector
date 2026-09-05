import { describe, expect, it } from 'vitest'
import type { StandardSchemaV1 } from './types'
import { checkOptions, parseRaw, validateWithSchema } from './validate'

function schema(fn: (v: unknown) => string[] | Promise<string[]>, paths: (PropertyKey | { key: PropertyKey })[][] = []): StandardSchemaV1 {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: async (value) => {
        const messages = await fn(value)
        if (messages.length === 0) return { value }
        return { issues: messages.map((message, i) => ({ message, path: paths[i] })) }
      },
    },
  }
}

describe('parseRaw', () => {
  it('타입별로 JS 값으로 바꾼다', () => {
    expect(parseRaw('string', 'a')).toBe('a')
    expect(parseRaw('number', '1.5')).toBe(1.5)
    expect(parseRaw('boolean', 'true')).toBe(true)
    expect(parseRaw('boolean', 'false')).toBe(false)
    expect(parseRaw('json', '{"a":[1]}')).toEqual({ a: [1] })
  })
})

describe('checkOptions', () => {
  it('옵션이 없으면 항상 통과', () => {
    expect(checkOptions(undefined, 'x')).toBe('')
  })
  it('옵션에 없는 값은 오류', () => {
    expect(checkOptions(['a', 'b'], 'a')).toBe('')
    expect(checkOptions(['a', 'b'], 'c')).toBe('허용된 값이 아닙니다: a, b')
  })
})

describe('validateWithSchema', () => {
  it('검증기가 없으면 통과', async () => {
    expect(await validateWithSchema(undefined, 'json', '{}')).toBe('')
  })

  it('파싱된 값을 넘기고 성공하면 빈 문자열', async () => {
    let received: unknown
    const s = schema((v) => {
      received = v
      return []
    })
    expect(await validateWithSchema(s, 'json', '{"title":"x"}')).toBe('')
    expect(received).toEqual({ title: 'x' })
  })

  it('이슈를 경로와 함께 줄바꿈으로 합친다', async () => {
    const s = schema(() => ['필수', '문자열이어야 함'], [['title'], ['tags', 0]])
    expect(await validateWithSchema(s, 'json', '{}')).toBe('title: 필수\ntags.0: 문자열이어야 함')
  })

  it('경로가 { key } 객체 형태여도 처리한다', async () => {
    const s = schema(() => ['오류'], [[{ key: 'a' }, { key: 'b' }]])
    expect(await validateWithSchema(s, 'json', '{}')).toBe('a.b: 오류')
  })

  it('동기 검증기도 받는다', async () => {
    const sync: StandardSchemaV1 = {
      '~standard': { version: 1, vendor: 'test', validate: (v) => (typeof v === 'number' && v > 0 ? { value: v } : { issues: [{ message: '양수여야 함' }] }) },
    }
    expect(await validateWithSchema(sync, 'number', '3')).toBe('')
    expect(await validateWithSchema(sync, 'number', '-1')).toBe('양수여야 함')
  })
})
