# storage-inspector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹뷰에 스크립트 한 줄로 넣어 localStorage/sessionStorage 를 스키마 기반으로 조회, 편집, 추가, 삭제하는 Lit 웹 컴포넌트 도구를 만든다.

**Architecture:** 순수 TS 코어(스키마와 저장소 병합, 타입 추론, 타입별 변환, 쓰기)와 Lit 컴포넌트(루트, 런처, 패널, 행, 시트)를 분리한다. 모든 저장소 쓰기는 루트 컴포넌트가 코어를 호출해 수행하고 하위 컴포넌트는 이벤트만 올린다. Vite 라이브러리 모드로 ESM 과 IIFE 를 빌드한다.

**Tech Stack:** Lit 3, TypeScript 5, Vite 8 (라이브러리 모드), Vitest 5, vite-plugin-dts 5, pnpm

**Spec:** `docs/superpowers/specs/2026-09-05-storage-inspector-design.md`

## Global Constraints

- 지원 타입은 `'string' | 'number' | 'boolean' | 'json'` 네 가지만.
- 저장소 종류는 `'local' | 'session'` 두 가지만. 쿠키 없음.
- 저장소에는 항상 문자열을 쓴다.
- Lit 은 데코레이터 없이 `static properties` 로 선언한다 (tsconfig 데코레이터 설정 의존을 없애기 위해).
- 하위 컴포넌트는 `localStorage` / `sessionStorage` 를 직접 읽거나 쓰지 않는다. 루트만 코어를 호출한다.
- 타입 오버라이드는 메모리(`Map`)에만 둔다.
- 커밋 메시지 끝에 `Claude-Session: https://claude.ai/code/session_011JccfkbZP2oCRuzvYxBv5z` 를 붙인다.
- 커밋은 `git -c user.name="yceffort" -c user.email="root@yceffort.kr" commit ...` 형태로 한다 (저장소에 사용자 설정이 없음).

---

## 파일 구조

```
storage-inspector/
├── package.json
├── tsconfig.json
├── vite.config.ts              ESM + IIFE 빌드, vitest 설정
├── index.html                  데모 페이지 (vite dev 루트)
├── src/
│   ├── index.ts                init() 공개 진입점
│   ├── core/
│   │   ├── types.ts            StorageKind, ValueType, SchemaEntry, Entry, StorageLike
│   │   ├── infer.ts            inferType(raw)
│   │   ├── convert.ts          toRaw(type, input), toDisplay(type, raw)
│   │   ├── entries.ts          buildEntries, writeEntry, removeEntry
│   │   ├── infer.test.ts
│   │   ├── convert.test.ts
│   │   └── entries.test.ts
│   └── components/
│       ├── storage-inspector.ts   루트 <storage-inspector>
│       ├── si-launcher.ts
│       ├── si-panel.ts
│       ├── si-entry-row.ts
│       └── si-entry-sheet.ts
└── docs/superpowers/...
```

---

### Task 1: 프로젝트 스캐폴딩과 코어 타입, `inferType`

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`
- Create: `src/core/types.ts`, `src/core/infer.ts`
- Test: `src/core/infer.test.ts`

**Interfaces:**
- Produces:
  - `type StorageKind = 'local' | 'session'`
  - `type ValueType = 'string' | 'number' | 'boolean' | 'json'`
  - `const VALUE_TYPES: readonly ValueType[]`
  - `interface SchemaEntry { key: string; storage: StorageKind; description?: string; type?: ValueType }`
  - `interface Entry { key: string; storage: StorageKind; description?: string; type: ValueType; raw: string | null; registered: boolean }`
  - `interface StorageLike { readonly length: number; key(i: number): string | null; getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }`
  - `function inferType(raw: string | null): ValueType`

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "storage-inspector",
  "version": "0.1.0",
  "description": "Schema-aware localStorage/sessionStorage inspector for webviews",
  "type": "module",
  "files": ["dist"],
  "main": "./dist/storage-inspector.js",
  "module": "./dist/storage-inspector.js",
  "types": "./dist/index.d.ts",
  "unpkg": "./dist/storage-inspector.iife.js",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/storage-inspector.js"
    }
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "lit": "^3.3.3"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vite": "^8.2.2",
    "vite-plugin-dts": "^5.1.0",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "useDefineForClassFields": false,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

`useDefineForClassFields: false` 는 Lit 의 `static properties` 방식에서 클래스 필드가 리액티브 접근자를 덮어쓰지 않게 하기 위해 필요하다.

- [ ] **Step 3: vite.config.ts 작성**

```ts
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'StorageInspector',
      formats: ['es', 'iife'],
      fileName: (format) => (format === 'es' ? 'storage-inspector.js' : 'storage-inspector.iife.js'),
    },
  },
  plugins: [dts({ rollupTypes: true })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: .gitignore 작성**

```
node_modules
dist
```

- [ ] **Step 5: 의존성 설치**

Run: `pnpm install`
Expected: `node_modules` 생성, 오류 없음. `pnpm-lock.yaml` 이 생긴다.

- [ ] **Step 6: src/core/types.ts 작성**

```ts
export type StorageKind = 'local' | 'session'
export type ValueType = 'string' | 'number' | 'boolean' | 'json'

export const VALUE_TYPES: readonly ValueType[] = ['string', 'number', 'boolean', 'json']

export interface SchemaEntry {
  key: string
  storage: StorageKind
  description?: string
  type?: ValueType
}

export interface Entry {
  key: string
  storage: StorageKind
  description?: string
  type: ValueType
  raw: string | null
  registered: boolean
}

export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
```

- [ ] **Step 7: 실패하는 테스트 작성**

`src/core/infer.test.ts`:

```ts
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
```

- [ ] **Step 8: 테스트 실패 확인**

Run: `pnpm test`
Expected: FAIL. `./infer` 모듈을 찾을 수 없다는 오류.

- [ ] **Step 9: src/core/infer.ts 구현**

```ts
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
```

- [ ] **Step 10: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS, 7 tests.

- [ ] **Step 11: 타입체크**

Run: `pnpm typecheck`
Expected: 오류 없음.

- [ ] **Step 12: 커밋**

```bash
git add package.json pnpm-lock.yaml tsconfig.json vite.config.ts .gitignore src/core/types.ts src/core/infer.ts src/core/infer.test.ts
git -c user.name="yceffort" -c user.email="root@yceffort.kr" commit -m "feat: 프로젝트 스캐폴딩과 코어 타입, inferType 추가

Claude-Session: https://claude.ai/code/session_011JccfkbZP2oCRuzvYxBv5z"
```

---

### Task 2: 타입별 변환 `toRaw` / `toDisplay`

**Files:**
- Create: `src/core/convert.ts`
- Test: `src/core/convert.test.ts`

**Interfaces:**
- Consumes: `ValueType` (Task 1)
- Produces:
  - `type ConvertResult = { ok: true; raw: string } | { ok: false; error: string }`
  - `function toRaw(type: ValueType, input: string): ConvertResult`
  - `function toDisplay(type: ValueType, raw: string | null): string`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/core/convert.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test`
Expected: FAIL. `./convert` 모듈 없음.

- [ ] **Step 3: src/core/convert.ts 구현**

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS. infer 7개 + convert 11개.

- [ ] **Step 5: 커밋**

```bash
git add src/core/convert.ts src/core/convert.test.ts
git -c user.name="yceffort" -c user.email="root@yceffort.kr" commit -m "feat: 타입별 변환 toRaw/toDisplay 추가

Claude-Session: https://claude.ai/code/session_011JccfkbZP2oCRuzvYxBv5z"
```

---

### Task 3: `buildEntries`, `writeEntry`, `removeEntry`

**Files:**
- Create: `src/core/entries.ts`, `src/core/index.ts`
- Test: `src/core/entries.test.ts`

**Interfaces:**
- Consumes: `SchemaEntry`, `Entry`, `StorageLike`, `StorageKind`, `ValueType`, `inferType`
- Produces:
  - `type Storages = Record<StorageKind, StorageLike>`
  - `type Overrides = Map<string, ValueType>` (키 형식은 `overrideKey(storage, key)` 가 만드는 `"local:accessToken"`)
  - `function overrideKey(storage: StorageKind, key: string): string`
  - `function buildEntries(schema: SchemaEntry[], overrides: Overrides, storages: Storages): Entry[]`
  - `function writeEntry(storages: Storages, target: { storage: StorageKind; key: string; raw: string }): void`
  - `function removeEntry(storages: Storages, target: { storage: StorageKind; key: string }): void`
  - `function browserStorages(): Storages` (window 의 localStorage/sessionStorage 를 감싼다)
  - `src/core/index.ts` 가 위 전부와 Task 1, 2 의 심볼을 재수출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`src/core/entries.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test`
Expected: FAIL. `./entries` 모듈 없음.

- [ ] **Step 3: src/core/entries.ts 구현**

```ts
import { inferType } from './infer'
import type { Entry, SchemaEntry, StorageKind, StorageLike, ValueType } from './types'

export type Storages = Record<StorageKind, StorageLike>
export type Overrides = Map<string, ValueType>

const KINDS: readonly StorageKind[] = ['local', 'session']

export function overrideKey(storage: StorageKind, key: string): string {
  return `${storage}:${key}`
}

export function buildEntries(schema: SchemaEntry[], overrides: Overrides, storages: Storages): Entry[] {
  const entries: Entry[] = []
  const seen = new Set<string>()

  for (const item of schema) {
    const id = overrideKey(item.storage, item.key)
    if (seen.has(id)) continue
    seen.add(id)
    const raw = storages[item.storage].getItem(item.key)
    entries.push({
      key: item.key,
      storage: item.storage,
      description: item.description,
      type: overrides.get(id) ?? item.type ?? inferType(raw),
      raw,
      registered: true,
    })
  }

  for (const kind of KINDS) {
    const storage = storages[kind]
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key === null) continue
      const id = overrideKey(kind, key)
      if (seen.has(id)) continue
      seen.add(id)
      const raw = storage.getItem(key)
      entries.push({
        key,
        storage: kind,
        type: overrides.get(id) ?? inferType(raw),
        raw,
        registered: false,
      })
    }
  }

  return entries
}

export function writeEntry(storages: Storages, target: { storage: StorageKind; key: string; raw: string }): void {
  storages[target.storage].setItem(target.key, target.raw)
}

export function removeEntry(storages: Storages, target: { storage: StorageKind; key: string }): void {
  storages[target.storage].removeItem(target.key)
}

export function browserStorages(): Storages {
  return { local: window.localStorage, session: window.sessionStorage }
}
```

- [ ] **Step 4: src/core/index.ts 작성**

```ts
export * from './types'
export { inferType } from './infer'
export { toRaw, toDisplay, type ConvertResult } from './convert'
export {
  buildEntries,
  writeEntry,
  removeEntry,
  overrideKey,
  browserStorages,
  type Storages,
  type Overrides,
} from './entries'
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `pnpm test`
Expected: PASS. 총 26 tests.

- [ ] **Step 6: 타입체크**

Run: `pnpm typecheck`
Expected: 오류 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/core/entries.ts src/core/entries.test.ts src/core/index.ts
git -c user.name="yceffort" -c user.email="root@yceffort.kr" commit -m "feat: buildEntries/writeEntry/removeEntry 코어 추가

Claude-Session: https://claude.ai/code/session_011JccfkbZP2oCRuzvYxBv5z"
```

---

### Task 4: 루트 컴포넌트, 런처, `init()`, 데모 페이지

이 태스크가 끝나면 데모 페이지에서 플로팅 버튼이 뜨고, 누르면 빈 오버레이가 열리고 닫힌다. 목록과 시트는 다음 태스크에서 채운다.

**Files:**
- Create: `src/components/si-launcher.ts`, `src/components/storage-inspector.ts`, `src/index.ts`, `index.html`

**Interfaces:**
- Consumes: `SchemaEntry`, `Entry`, `Overrides`, `Storages`, `buildEntries`, `browserStorages`
- Produces:
  - `<si-launcher>`: 클릭 시 `toggle` CustomEvent (bubbles, composed)
  - `<storage-inspector>`: 프로퍼티 `schema: SchemaEntry[]`, 메서드 `open()`, `close()`. 내부 상태 `isOpen`, `tab`, `entries`, `overrides`, `sheet`. 이후 태스크에서 `si-panel` 과 `si-entry-sheet` 렌더를 여기에 추가한다.
  - `init(options: { schema?: SchemaEntry[] }): { open(): void; close(): void; destroy(): void }`
  - `SheetState = { mode: 'edit'; entry: Entry } | { mode: 'add' } | null`

- [ ] **Step 1: src/components/si-launcher.ts 작성**

```ts
import { LitElement, css, html } from 'lit'

export class SiLauncher extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483000;
    }
    button {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: #1f6feb;
      color: #fff;
      font: 600 14px/1 system-ui, sans-serif;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: pointer;
    }
  `

  render() {
    return html`<button type="button" aria-label="Storage inspector" @click=${this.onClick}>SI</button>`
  }

  private onClick = () => {
    this.dispatchEvent(new CustomEvent('toggle', { bubbles: true, composed: true }))
  }
}

customElements.define('si-launcher', SiLauncher)
```

- [ ] **Step 2: src/components/storage-inspector.ts 작성**

```ts
import { LitElement, css, html } from 'lit'
import {
  browserStorages,
  buildEntries,
  type Entry,
  type Overrides,
  type SchemaEntry,
  type StorageKind,
  type Storages,
} from '../core'
import './si-launcher'

export type SheetState = { mode: 'edit'; entry: Entry } | { mode: 'add' } | null

export class StorageInspector extends LitElement {
  static properties = {
    schema: { attribute: false },
    isOpen: { state: true },
    tab: { state: true },
    entries: { state: true },
    sheet: { state: true },
    sheetError: { state: true },
  }

  static styles = css`
    :host {
      all: initial;
      font: 14px/1.4 system-ui, -apple-system, sans-serif;
      color: #111;
    }
  `

  schema: SchemaEntry[] = []
  isOpen = false
  tab: StorageKind = 'local'
  entries: Entry[] = []
  sheet: SheetState = null
  sheetError = ''

  protected overrides: Overrides = new Map()
  protected storages: Storages = browserStorages()

  open() {
    this.refresh()
    this.isOpen = true
  }

  close() {
    this.sheet = null
    this.isOpen = false
  }

  protected refresh() {
    this.entries = buildEntries(this.schema, this.overrides, this.storages)
  }

  render() {
    return html`
      <si-launcher @toggle=${this.onToggle}></si-launcher>
      ${this.isOpen ? this.renderPanel() : null}
    `
  }

  protected renderPanel() {
    return html`<div style="position:fixed;inset:0;background:#fff;z-index:2147483001" @click=${this.close}>panel</div>`
  }

  private onToggle = () => {
    this.isOpen ? this.close() : this.open()
  }
}

customElements.define('storage-inspector', StorageInspector)
```

`renderPanel` 의 임시 div 는 Task 5 에서 `<si-panel>` 로 교체한다.

- [ ] **Step 3: src/index.ts 작성**

```ts
import { StorageInspector } from './components/storage-inspector'
import type { SchemaEntry } from './core'

export type { SchemaEntry, Entry, StorageKind, ValueType } from './core'

export interface InitOptions {
  schema?: SchemaEntry[]
}

export interface Inspector {
  open(): void
  close(): void
  destroy(): void
}

let current: StorageInspector | null = null

export function init(options: InitOptions = {}): Inspector {
  current?.remove()
  const el = new StorageInspector()
  el.schema = options.schema ?? []
  document.body.appendChild(el)
  current = el
  return {
    open: () => el.open(),
    close: () => el.close(),
    destroy: () => {
      el.remove()
      if (current === el) current = null
    },
  }
}
```

- [ ] **Step 4: index.html (데모) 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>storage-inspector demo</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 16px; }
      pre { background: #f4f4f4; padding: 8px; }
    </style>
  </head>
  <body>
    <h1>storage-inspector demo</h1>
    <p>우측 하단 버튼을 눌러 패널을 엽니다. 아래는 현재 localStorage 스냅샷입니다.</p>
    <button id="dump">localStorage 덤프</button>
    <pre id="out"></pre>
    <script type="module">
      import { init } from '/src/index.ts'

      localStorage.setItem('accessToken', 'eyJhbGciOi.example.token')
      localStorage.setItem('darkMode', 'true')
      localStorage.setItem('retryCount', '3')
      localStorage.setItem('lastVisited', '/home')
      sessionStorage.setItem('draft', JSON.stringify({ title: '초안', tags: ['a', 'b'] }))

      init({
        schema: [
          { key: 'accessToken', description: '인증 토큰', type: 'string', storage: 'local' },
          { key: 'darkMode', description: '다크모드', type: 'boolean', storage: 'local' },
          { key: 'draft', description: '작성 중 글', type: 'json', storage: 'session' },
          { key: 'neverSet', description: '아직 값 없는 키', type: 'number', storage: 'local' },
        ],
      })

      document.getElementById('dump').onclick = () => {
        document.getElementById('out').textContent = JSON.stringify({ ...localStorage }, null, 2)
      }
    </script>
  </body>
</html>
```

- [ ] **Step 5: 타입체크와 dev 서버 확인**

Run: `pnpm typecheck`
Expected: 오류 없음.

Run: `pnpm dev` 를 백그라운드로 띄우고 브라우저에서 표시된 주소를 연다.
Expected: 우측 하단에 "SI" 원형 버튼. 클릭하면 흰 전체 화면이 뜨고, 다시 클릭하면 닫힌다. 콘솔 오류 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/components/si-launcher.ts src/components/storage-inspector.ts src/index.ts index.html
git -c user.name="yceffort" -c user.email="root@yceffort.kr" commit -m "feat: 루트 컴포넌트, 런처, init() 진입점과 데모 페이지 추가

Claude-Session: https://claude.ai/code/session_011JccfkbZP2oCRuzvYxBv5z"
```

---

### Task 5: 패널과 목록 행 (탭, 새로고침, 삭제)

**Files:**
- Create: `src/components/si-panel.ts`, `src/components/si-entry-row.ts`
- Modify: `src/components/storage-inspector.ts` (`renderPanel` 교체, 이벤트 핸들러 추가)

**Interfaces:**
- Consumes: `Entry`, `StorageKind`, `removeEntry`, `SheetState`
- Produces:
  - `<si-entry-row>`: 프로퍼티 `entry: Entry`. 이벤트 `select` (detail: `Entry`), `remove` (detail: `Entry`)
  - `<si-panel>`: 프로퍼티 `entries: Entry[]`, `tab: StorageKind`. 이벤트 `tab-change` (detail: `StorageKind`), `refresh`, `add`, `close`. `select` 와 `remove` 는 행에서 올라온 것을 그대로 통과시킨다 (bubbles, composed).

- [ ] **Step 1: src/components/si-entry-row.ts 작성**

```ts
import { LitElement, css, html } from 'lit'
import type { Entry } from '../core'

const PREVIEW_MAX = 60

export class SiEntryRow extends LitElement {
  static properties = {
    entry: { attribute: false },
  }

  static styles = css`
    :host {
      display: block;
      border-bottom: 1px solid #e5e5e5;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      cursor: pointer;
    }
    .row:active {
      background: #f5f5f5;
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .key {
      font-weight: 600;
      word-break: break-all;
    }
    .desc {
      color: #666;
      font-size: 12px;
    }
    .preview {
      color: #333;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview.empty {
      color: #999;
      font-style: italic;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #eef2ff;
      color: #3b4fbf;
      margin-right: 4px;
    }
    .badge.unregistered {
      background: #fff4e5;
      color: #9a5b00;
    }
    button {
      border: 1px solid #ddd;
      background: #fff;
      color: #c00;
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 12px;
      cursor: pointer;
    }
  `

  entry!: Entry

  render() {
    const e = this.entry
    const preview = e.raw === null ? '값 없음' : e.raw.length > PREVIEW_MAX ? `${e.raw.slice(0, PREVIEW_MAX)}…` : e.raw
    return html`
      <div class="row" @click=${this.onSelect}>
        <div class="main">
          <div>
            <span class="badge">${e.type}</span>
            ${e.registered ? null : html`<span class="badge unregistered">미등록</span>`}
            <span class="key">${e.key}</span>
          </div>
          ${e.description ? html`<div class="desc">${e.description}</div>` : null}
          <div class="preview ${e.raw === null ? 'empty' : ''}">${preview}</div>
        </div>
        <button type="button" @click=${this.onRemove}>삭제</button>
      </div>
    `
  }

  private onSelect = () => {
    this.dispatchEvent(new CustomEvent('select', { detail: this.entry, bubbles: true, composed: true }))
  }

  private onRemove = (ev: Event) => {
    ev.stopPropagation()
    this.dispatchEvent(new CustomEvent('remove', { detail: this.entry, bubbles: true, composed: true }))
  }
}

customElements.define('si-entry-row', SiEntryRow)
```

- [ ] **Step 2: src/components/si-panel.ts 작성**

```ts
import { LitElement, css, html } from 'lit'
import type { Entry, StorageKind } from '../core'
import './si-entry-row'

const TABS: readonly StorageKind[] = ['local', 'session']

export class SiPanel extends LitElement {
  static properties = {
    entries: { attribute: false },
    tab: { attribute: false },
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 2147483001;
      display: flex;
      flex-direction: column;
      background: #fff;
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid #ddd;
    }
    h1 {
      font-size: 15px;
      margin: 0;
      flex: 1;
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
    }
    .tabs button {
      flex: 1;
      padding: 10px;
      border: none;
      background: none;
      font-size: 14px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tabs button.active {
      border-bottom-color: #1f6feb;
      font-weight: 600;
    }
    header button {
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
    }
    .list {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .empty {
      padding: 32px;
      text-align: center;
      color: #999;
    }
  `

  entries: Entry[] = []
  tab: StorageKind = 'local'

  render() {
    const visible = this.entries.filter((e) => e.storage === this.tab)
    return html`
      <header>
        <h1>Storage</h1>
        <button type="button" @click=${() => this.emit('refresh')}>새로고침</button>
        <button type="button" @click=${() => this.emit('add')}>추가</button>
        <button type="button" @click=${() => this.emit('close')}>닫기</button>
      </header>
      <div class="tabs">
        ${TABS.map(
          (t) => html`
            <button type="button" class=${t === this.tab ? 'active' : ''} @click=${() => this.emit('tab-change', t)}>
              ${t}Storage
            </button>
          `,
        )}
      </div>
      <div class="list">
        ${visible.length === 0
          ? html`<div class="empty">항목이 없습니다</div>`
          : visible.map((e) => html`<si-entry-row .entry=${e}></si-entry-row>`)}
      </div>
    `
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }))
  }
}

customElements.define('si-panel', SiPanel)
```

- [ ] **Step 3: storage-inspector.ts 의 `renderPanel` 교체와 핸들러 추가**

`import './si-launcher'` 아래에 `import './si-panel'` 를 추가하고, `removeEntry` 를 `../core` import 에 추가한다. `renderPanel` 을 아래로 교체하고 핸들러를 클래스에 추가한다.

```ts
  protected renderPanel() {
    return html`
      <si-panel
        .entries=${this.entries}
        .tab=${this.tab}
        @tab-change=${this.onTabChange}
        @refresh=${this.refresh}
        @add=${this.onAdd}
        @close=${this.close}
        @select=${this.onSelect}
        @remove=${this.onRemove}
      ></si-panel>
    `
  }

  private onTabChange = (ev: CustomEvent<StorageKind>) => {
    this.tab = ev.detail
  }

  private onAdd = () => {
    this.sheet = { mode: 'add' }
    this.sheetError = ''
  }

  private onSelect = (ev: CustomEvent<Entry>) => {
    this.sheet = { mode: 'edit', entry: ev.detail }
    this.sheetError = ''
  }

  private onRemove = (ev: CustomEvent<Entry>) => {
    removeEntry(this.storages, ev.detail)
    this.refresh()
  }
```

`refresh` 는 이벤트 핸들러로 쓰이므로 화살표 함수 프로퍼티로 바꾼다.

```ts
  protected refresh = () => {
    this.entries = buildEntries(this.schema, this.overrides, this.storages)
  }
```

`close` 도 같은 이유로 화살표 함수 프로퍼티로 바꾼다.

```ts
  close = () => {
    this.sheet = null
    this.isOpen = false
  }
```

- [ ] **Step 4: 타입체크와 수동 확인**

Run: `pnpm typecheck`
Expected: 오류 없음.

브라우저 데모에서 확인:
- 패널을 열면 localStorage 탭에 `accessToken`, `darkMode`, `neverSet`(값 없음, 흐린 글씨), 그 아래 미등록 뱃지가 붙은 `retryCount`(number 뱃지), `lastVisited`(string 뱃지) 가 보인다.
- sessionStorage 탭에 `draft` 가 json 뱃지로 보인다.
- `lastVisited` 의 삭제를 누르면 행이 사라지고, 데모의 "localStorage 덤프" 로도 사라진 것이 보인다.
- 새로고침을 누르면 목록이 다시 읽힌다 (데모 페이지 콘솔에서 `localStorage.setItem('zzz','1')` 후 새로고침 시 `zzz` 가 나타난다).

- [ ] **Step 5: 커밋**

```bash
git add src/components/si-panel.ts src/components/si-entry-row.ts src/components/storage-inspector.ts
git -c user.name="yceffort" -c user.email="root@yceffort.kr" commit -m "feat: 패널과 목록 행, 탭/새로고침/삭제 연결

Claude-Session: https://claude.ai/code/session_011JccfkbZP2oCRuzvYxBv5z"
```

---

### Task 6: 편집/추가 시트

**Files:**
- Create: `src/components/si-entry-sheet.ts`
- Modify: `src/components/storage-inspector.ts` (시트 렌더와 `save`/`cancel` 처리)

**Interfaces:**
- Consumes: `Entry`, `StorageKind`, `ValueType`, `VALUE_TYPES`, `toRaw`, `toDisplay`, `writeEntry`, `overrideKey`, `SheetState`
- Produces:
  - `<si-entry-sheet>`: 프로퍼티 `mode: 'edit' | 'add'`, `entry?: Entry`, `tab: StorageKind`, `existingKeys: string[]` (두 저장소의 값 있는 키를 `"local:key"` 형식으로, add 모드 중복 검사용), `error: string` (루트가 setItem 실패를 넘기는 용도).
  - 이벤트 `save` (detail: `{ key: string; storage: StorageKind; type: ValueType; raw: string }`), `cancel`.

- [ ] **Step 1: src/components/si-entry-sheet.ts 작성**

```ts
import { LitElement, css, html } from 'lit'
import { VALUE_TYPES, overrideKey, toDisplay, toRaw, type Entry, type StorageKind, type ValueType } from '../core'

export interface SaveDetail {
  key: string
  storage: StorageKind
  type: ValueType
  raw: string
}

export class SiEntrySheet extends LitElement {
  static properties = {
    mode: { attribute: false },
    entry: { attribute: false },
    tab: { attribute: false },
    existingKeys: { attribute: false },
    error: { attribute: false },
    key: { state: true },
    storage: { state: true },
    type: { state: true },
    input: { state: true },
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 2147483002;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      background: rgba(0, 0, 0, 0.4);
    }
    .sheet {
      background: #fff;
      border-radius: 12px 12px 0 0;
      padding: 16px;
      max-height: 85vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #555;
    }
    input,
    select,
    textarea {
      font: 14px/1.4 system-ui, sans-serif;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 6px;
    }
    textarea {
      font-family: ui-monospace, monospace;
      min-height: 140px;
    }
    .fixed {
      font-size: 14px;
      color: #111;
      word-break: break-all;
    }
    .error {
      color: #c00;
      font-size: 12px;
    }
    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .actions button {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #ccc;
      background: #fff;
      font-size: 14px;
      cursor: pointer;
    }
    .actions button.primary {
      background: #1f6feb;
      color: #fff;
      border-color: #1f6feb;
    }
    .actions button:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `

  mode: 'edit' | 'add' = 'edit'
  entry?: Entry
  tab: StorageKind = 'local'
  existingKeys: string[] = []
  error = ''

  key = ''
  storage: StorageKind = 'local'
  type: ValueType = 'string'
  input = ''

  connectedCallback() {
    super.connectedCallback()
    if (this.mode === 'edit' && this.entry) {
      this.key = this.entry.key
      this.storage = this.entry.storage
      this.type = this.entry.type
      this.input = toDisplay(this.entry.type, this.entry.raw)
    } else {
      this.key = ''
      this.storage = this.tab
      this.type = 'string'
      this.input = ''
    }
  }

  private validate(): string {
    if (this.mode === 'add') {
      if (this.key.trim() === '') return '키를 입력하세요'
      if (this.existingKeys.includes(overrideKey(this.storage, this.key))) return '이미 있는 키입니다'
    }
    const result = toRaw(this.type, this.input)
    return result.ok ? '' : result.error
  }

  render() {
    const validation = this.validate()
    const message = validation || this.error
    return html`
      <div class="sheet" @click=${(e: Event) => e.stopPropagation()}>
        ${this.mode === 'add'
          ? html`
              <label>키 <input .value=${this.key} @input=${this.onKey} autocapitalize="off" autocomplete="off" /></label>
              <label>
                저장소
                <select .value=${this.storage} @change=${this.onStorage}>
                  <option value="local">localStorage</option>
                  <option value="session">sessionStorage</option>
                </select>
              </label>
            `
          : html`
              <div class="fixed">${this.storage}Storage / <strong>${this.key}</strong></div>
              ${this.entry?.description ? html`<div class="fixed" style="color:#666">${this.entry.description}</div>` : null}
            `}
        <label>
          타입
          <select .value=${this.type} @change=${this.onType}>
            ${VALUE_TYPES.map((t) => html`<option value=${t} ?selected=${t === this.type}>${t}</option>`)}
          </select>
        </label>
        <label>값 ${this.renderInput()}</label>
        ${message ? html`<div class="error">${message}</div>` : null}
        <div class="actions">
          <button type="button" @click=${this.onCancel}>취소</button>
          <button type="button" class="primary" ?disabled=${validation !== ''} @click=${this.onSave}>저장</button>
        </div>
      </div>
    `
  }

  private renderInput() {
    switch (this.type) {
      case 'boolean':
        return html`
          <span>
            <input type="checkbox" .checked=${this.input === 'true'} @change=${this.onToggle} />
            ${this.input === 'true' ? 'true' : 'false'}
          </span>
        `
      case 'number':
        return html`<input inputmode="decimal" .value=${this.input} @input=${this.onInput} />`
      case 'json':
        return html`<textarea .value=${this.input} @input=${this.onInput} spellcheck="false"></textarea>`
      case 'string':
        return html`<input .value=${this.input} @input=${this.onInput} autocapitalize="off" autocomplete="off" />`
    }
  }

  private onKey = (e: Event) => {
    this.key = (e.target as HTMLInputElement).value
  }

  private onStorage = (e: Event) => {
    this.storage = (e.target as HTMLSelectElement).value as StorageKind
  }

  private onType = (e: Event) => {
    this.type = (e.target as HTMLSelectElement).value as ValueType
  }

  private onInput = (e: Event) => {
    this.input = (e.target as HTMLInputElement | HTMLTextAreaElement).value
  }

  private onToggle = (e: Event) => {
    this.input = (e.target as HTMLInputElement).checked ? 'true' : 'false'
  }

  private onCancel = () => {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))
  }

  private onSave = () => {
    const result = toRaw(this.type, this.input)
    if (!result.ok) return
    const detail: SaveDetail = { key: this.key, storage: this.storage, type: this.type, raw: result.raw }
    this.dispatchEvent(new CustomEvent<SaveDetail>('save', { detail, bubbles: true, composed: true }))
  }
}

customElements.define('si-entry-sheet', SiEntrySheet)
```

`existingKeys` 는 add 모드에서 사용자가 고른 `storage` 기준으로 검사해야 하므로, 루트가 두 저장소의 키를 모두 `"local:key"` 형식으로 넘기고 시트는 `overrideKey(this.storage, this.key)` 로 비교한다.

- [ ] **Step 2: storage-inspector.ts 에 시트 렌더와 저장 처리 추가**

import 에 `./si-entry-sheet` 와 `SaveDetail` 타입, `overrideKey`, `writeEntry` 를 추가한다.

```ts
import './si-entry-sheet'
import type { SaveDetail } from './si-entry-sheet'
```

`../core` import 에 `overrideKey`, `writeEntry` 를 추가한다.

`render()` 를 아래로 교체한다.

```ts
  render() {
    return html`
      <si-launcher @toggle=${this.onToggle}></si-launcher>
      ${this.isOpen ? this.renderPanel() : null}
      ${this.isOpen && this.sheet ? this.renderSheet() : null}
    `
  }

  protected renderSheet() {
    const s = this.sheet!
    const existingKeys = this.entries.filter((e) => e.raw !== null).map((e) => overrideKey(e.storage, e.key))
    return html`
      <si-entry-sheet
        .mode=${s.mode}
        .entry=${s.mode === 'edit' ? s.entry : undefined}
        .tab=${this.tab}
        .existingKeys=${existingKeys}
        .error=${this.sheetError}
        @save=${this.onSave}
        @cancel=${this.onCancel}
        @click=${this.onCancel}
      ></si-entry-sheet>
    `
  }

  private onSave = (ev: CustomEvent<SaveDetail>) => {
    const { key, storage, type, raw } = ev.detail
    this.overrides.set(overrideKey(storage, key), type)
    try {
      writeEntry(this.storages, { key, storage, raw })
    } catch (e) {
      this.sheetError = (e as Error).message
      return
    }
    this.sheet = null
    this.sheetError = ''
    this.refresh()
  }

  private onCancel = () => {
    this.sheet = null
    this.sheetError = ''
  }
```

`@click=${this.onCancel}` 은 시트 바깥(반투명 배경)을 눌렀을 때 닫기 위한 것이다. 시트 내부는 `stopPropagation` 으로 막혀 있다.

- [ ] **Step 3: 타입체크와 수동 확인**

Run: `pnpm typecheck`
Expected: 오류 없음.

브라우저 데모에서 확인:
- `darkMode` 행을 누르면 시트가 열리고 타입 boolean, 토글이 켜져 있다. 토글을 끄고 저장하면 목록 미리보기가 `false` 로 바뀐다.
- `draft` (session 탭) 를 누르면 json 이 들여쓰기된 textarea 로 보인다. 중괄호 하나를 지우면 오류 문구가 뜨고 저장이 비활성화된다. 되돌리면 저장 가능.
- `retryCount` 를 눌러 타입을 string 으로 바꾸고 저장하면 목록 뱃지가 string 이 된다. 패널을 닫았다 열어도 string 이 유지된다 (세션 오버라이드).
- `neverSet` 을 눌러 `7` 을 입력 저장하면 값 없음이 `7` 로 바뀐다.
- 추가 버튼으로 키 `accessToken`, 저장소 local 을 넣으면 "이미 있는 키입니다". 키를 `newKey` 로 바꾸고 저장하면 미등록 뱃지로 목록에 추가된다.
- 시트 바깥 어두운 영역을 누르면 시트가 닫힌다.

- [ ] **Step 4: 커밋**

```bash
git add src/components/si-entry-sheet.ts src/components/storage-inspector.ts
git -c user.name="yceffort" -c user.email="root@yceffort.kr" commit -m "feat: 편집/추가 시트와 저장 흐름 추가

Claude-Session: https://claude.ai/code/session_011JccfkbZP2oCRuzvYxBv5z"
```

---

### Task 7: 빌드 산출물 확인과 README

**Files:**
- Create: `README.md`
- Verify: `dist/storage-inspector.js`, `dist/storage-inspector.iife.js`, `dist/index.d.ts`

**Interfaces:**
- Consumes: 전체
- Produces: 배포 가능한 dist 와 사용 문서

- [ ] **Step 1: 전체 검증 실행**

Run: `pnpm test && pnpm typecheck && pnpm build`
Expected: 테스트 26개 통과, 타입 오류 없음, `dist/` 에 `storage-inspector.js`, `storage-inspector.iife.js`, `index.d.ts` 생성.

- [ ] **Step 2: IIFE 전역 노출 확인**

Run:
```bash
node -e "
const fs=require('fs');
const src=fs.readFileSync('dist/storage-inspector.iife.js','utf8');
console.log(/var StorageInspector\s*=/.test(src) || /StorageInspector\s*=/.test(src));
console.log(src.includes('customElements.define'));
"
```
Expected: `true` 두 줄. 전역 이름과 컴포넌트 등록 코드가 번들에 포함되어 있다.

- [ ] **Step 3: IIFE 를 스크립트 태그로 넣은 정적 페이지 수동 확인**

스크래치 디렉터리에 아래 HTML 을 만들어 `dist/storage-inspector.iife.js` 옆에 두고 브라우저로 연다 (`file://` 로 열어도 된다).

```html
<!doctype html>
<meta charset="utf-8" />
<script src="./storage-inspector.iife.js"></script>
<script>
  localStorage.setItem('foo', '1')
  StorageInspector.init({ schema: [{ key: 'foo', storage: 'local', type: 'number', description: '푸' }] })
</script>
```

Expected: 런처 버튼이 뜨고 패널에서 `foo` 를 편집할 수 있다.

- [ ] **Step 4: README.md 작성**

````markdown
# storage-inspector

웹뷰 안에서 localStorage 와 sessionStorage 를 조회, 편집, 추가, 삭제하는 디버깅 도구. 개발자가 키/설명/타입 스키마를 등록하면 그 기준으로 보여주고, 스키마에 없는 키도 현재 저장된 값 기준으로 함께 표시한다.

## 설치

```bash
pnpm add storage-inspector
```

## 사용

```ts
import { init } from 'storage-inspector'

const inspector = init({
  schema: [
    { key: 'accessToken', description: '인증 토큰', type: 'string', storage: 'local' },
    { key: 'darkMode', description: '다크모드', type: 'boolean', storage: 'local' },
    { key: 'draft', description: '작성 중 글', type: 'json', storage: 'session' },
  ],
})

inspector.open()
inspector.close()
inspector.destroy()
```

스크립트 태그로 쓸 때:

```html
<script src="https://unpkg.com/storage-inspector/dist/storage-inspector.iife.js"></script>
<script>
  StorageInspector.init({ schema: [/* ... */] })
</script>
```

## 스키마

| 필드 | 필수 | 설명 |
|---|---|---|
| `key` | 예 | 저장소 키 |
| `storage` | 예 | `'local'` 또는 `'session'` |
| `description` | 아니오 | 목록과 시트에 표시되는 설명 |
| `type` | 아니오 | `'string' | 'number' | 'boolean' | 'json'`. 없으면 값을 보고 추론 |

## 동작

- 패널을 열 때와 새로고침 버튼을 누를 때 저장소를 읽는다. 앱이 값을 바꿔도 자동 갱신은 하지 않는다.
- 시트에서 바꾼 타입은 패널이 살아 있는 동안만 기억한다. 저장소에는 도구 전용 키를 만들지 않는다.
- 삭제는 확인 없이 즉시 실행된다.

## 개발

```bash
pnpm install
pnpm dev        # 데모 페이지
pnpm test
pnpm typecheck
pnpm build
```
````

- [ ] **Step 5: 커밋**

```bash
git add README.md
git -c user.name="yceffort" -c user.email="root@yceffort.kr" commit -m "docs: README 추가

Claude-Session: https://claude.ai/code/session_011JccfkbZP2oCRuzvYxBv5z"
```

---

## Self-Review 결과

- 스펙 커버리지: 공개 API (Task 4), 데이터 모델과 목록 생성/추론/변환/오버라이드/쓰기 (Task 1~3), 컴포넌트 5종 (Task 4~6), 오류 처리 (Task 6 의 validate 와 onSave try/catch), 테스트 (Task 1~3), 빌드 (Task 1 설정, Task 7 확인). 범위 밖 항목은 어느 태스크에도 없음.
- 플레이스홀더 없음.
- 타입 일관성: `SaveDetail`, `SheetState`, `Overrides`, `Storages`, `overrideKey` 의 이름과 시그니처가 Task 3, 4, 6 에서 동일하게 쓰인다. `refresh` 와 `close` 는 Task 5 에서 화살표 프로퍼티로 바뀌며 Task 4 의 `init()` 은 `el.close()` 호출이라 영향 없다.
