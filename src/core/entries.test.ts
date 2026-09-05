import { describe, expect, it } from 'vitest'
import { buildEntries, overrideKey, removeEntry, writeEntry, type Storages } from './entries'
import type { StorageLike } from './types'

function fakeStorage(init: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(init))
  return {
    get length() {
      return map.size
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

function storages(local: Record<string, string> = {}, session: Record<string, string> = {}): Storages {
  return { local: fakeStorage(local), session: fakeStorage(session) }
}

describe('buildEntries', () => {
  it('스키마 순서를 유지하고 값을 읽는다', () => {
    const s = storages({ b: '2', a: '1' })
    const entries = buildEntries(
      [
        { key: 'a', storage: 'local', type: 'number' },
        { key: 'b', storage: 'local', type: 'string', description: 'B' },
      ],
      new Map(),
      s,
    )
    expect(entries.map((e) => e.key)).toEqual(['a', 'b'])
    expect(entries[0]).toEqual({ key: 'a', storage: 'local', type: 'number', raw: '1', registered: true, description: undefined })
    expect(entries[1]?.description).toBe('B')
  })

  it('스키마에 있지만 값이 없으면 raw null', () => {
    const entries = buildEntries([{ key: 'x', storage: 'session' }], new Map(), storages())
    expect(entries[0]?.raw).toBeNull()
    expect(entries[0]?.type).toBe('string')
  })

  it('미등록 키는 뒤에 registered false 로 붙는다', () => {
    const s = storages({ known: 'v', extra: '{"a":1}' }, { sextra: 'true' })
    const entries = buildEntries([{ key: 'known', storage: 'local' }], new Map(), s)
    expect(entries.map((e) => [e.key, e.storage, e.registered])).toEqual([
      ['known', 'local', true],
      ['extra', 'local', false],
      ['sextra', 'session', false],
    ])
    expect(entries[1]?.type).toBe('json')
    expect(entries[2]?.type).toBe('boolean')
  })

  it('같은 키라도 storage 가 다르면 별개다', () => {
    const s = storages({ k: '1' }, { k: '2' })
    const entries = buildEntries([{ key: 'k', storage: 'local' }], new Map(), s)
    expect(entries).toHaveLength(2)
    expect(entries[1]).toMatchObject({ key: 'k', storage: 'session', registered: false })
  })

  it('중복 스키마 항목은 뒤의 것을 무시한다', () => {
    const entries = buildEntries(
      [
        { key: 'k', storage: 'local', type: 'number' },
        { key: 'k', storage: 'local', type: 'json' },
      ],
      new Map(),
      storages({ k: '1' }),
    )
    expect(entries).toHaveLength(1)
    expect(entries[0]?.type).toBe('number')
  })

  it('타입 우선순위: 오버라이드 > 스키마 > 추론', () => {
    const s = storages({ a: '1', b: '1', c: '1' })
    const overrides = new Map([[overrideKey('local', 'a'), 'json' as const]])
    const entries = buildEntries(
      [
        { key: 'a', storage: 'local', type: 'string' },
        { key: 'b', storage: 'local', type: 'string' },
        { key: 'c', storage: 'local' },
      ],
      overrides,
      s,
    )
    expect(entries.map((e) => e.type)).toEqual(['json', 'string', 'number'])
  })
})

describe('writeEntry / removeEntry', () => {
  it('대상 storage 에 쓰고 지운다', () => {
    const s = storages()
    writeEntry(s, { storage: 'session', key: 'k', raw: 'v' })
    expect(s.session.getItem('k')).toBe('v')
    expect(s.local.getItem('k')).toBeNull()
    removeEntry(s, { storage: 'session', key: 'k' })
    expect(s.session.getItem('k')).toBeNull()
  })

  it('setItem 예외는 그대로 전달한다', () => {
    const s = storages()
    s.local.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(() => writeEntry(s, { storage: 'local', key: 'k', raw: 'v' })).toThrow('QuotaExceededError')
  })
})
