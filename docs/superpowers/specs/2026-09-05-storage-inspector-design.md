# storage-inspector 설계

작성일: 2026-09-05

## 목적

모바일 웹뷰 안에서 localStorage 와 sessionStorage 값을 조회, 편집, 추가, 삭제할 수 있는 스크립트 삽입형 디버깅 도구. vConsole 의 Storage 패널과 비슷하지만, 개발자가 키/설명/타입 스키마를 미리 등록해 두면 그 정보를 기준으로 보여주고, 스키마에 없는 키도 현재 저장된 값 기준으로 함께 표시한다.

쿠키는 범위 밖이다.

## 기술 선택

- Lit + TypeScript. 웹 컴포넌트로 만들고 Shadow DOM 으로 호스트 앱 CSS 와 격리한다.
- Vite 라이브러리 모드. 산출물은 두 가지.
  - ESM: npm 사용자용. Lit 은 peerDependency 가 아니라 번들에 포함한다 (호스트 앱이 Lit 을 쓰지 않는 경우가 대부분이고, 버전 충돌보다 삽입 편의를 우선).
  - IIFE: `window.StorageInspector` 전역을 노출하는 단일 파일. 웹뷰에 `<script src>` 한 줄로 넣는 용도.
- 테스트는 Vitest. 코어 모듈만 단위 테스트하고 컴포넌트는 데모 페이지로 수동 확인한다.

## 공개 API

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

- `init(options)` 은 `<storage-inspector>` 엘리먼트를 `document.body` 끝에 붙이고 컨트롤러를 반환한다.
- 이미 인스턴스가 있으면 기존 것을 `destroy()` 한 뒤 새로 만든다.
- 옵션은 `schema` 하나만 받는다. 위치, 테마, 단축키 등은 넣지 않는다.
- IIFE 빌드에서는 `window.StorageInspector.init(options)` 으로 같은 함수를 호출한다.

## 데이터 모델 (코어)

```ts
type StorageKind = 'local' | 'session'
type ValueType = 'string' | 'number' | 'boolean' | 'json'

interface SchemaEntry {
  key: string
  storage: StorageKind
  description?: string
  type?: ValueType
}

interface Entry {
  key: string
  storage: StorageKind
  description?: string
  type: ValueType
  raw: string | null
  registered: boolean
}
```

### 목록 생성 (`buildEntries(schema, overrides)`)

1. 스키마 항목을 선언 순서대로 놓는다. 실제 저장소에서 `raw` 를 읽고 없으면 `null`.
2. localStorage, sessionStorage 를 순회해 스키마에 없는 키를 `registered: false` 로 뒤에 붙인다. 키 순서는 `Storage.key(i)` 순서.
3. 각 항목의 `type` 결정 우선순위: 세션 오버라이드 > 스키마 `type` > 추론.
4. 같은 `storage` 에서 같은 `key` 가 스키마에 두 번 나오면 뒤의 것을 무시한다.

### 타입 추론 (`inferType(raw)`)

`raw` 가 `null` 이면 `string`. 그 외에는 순서대로 검사한다.

1. `"true"` 또는 `"false"` 이면 `boolean`
2. 공백 제거 후 비어 있지 않고 `Number(raw)` 가 유한수이면 `number`
3. `JSON.parse` 가 성공하고 결과가 객체 또는 배열이면 `json`
4. 나머지는 `string`

### 타입별 변환

저장소에는 항상 문자열을 쓴다.

| type | 편집 입력 -> raw | raw -> 편집 표시 | 검증 실패 조건 |
|---|---|---|---|
| string | 그대로 | 그대로 | 없음 |
| number | `String(Number(input))` | 그대로 | 공백이거나 `Number()` 가 NaN/Infinity |
| boolean | `"true"` / `"false"` | `raw === "true"` | 없음 (토글) |
| json | `JSON.stringify(JSON.parse(input))` | `JSON.stringify(JSON.parse(raw), null, 2)`, 파싱 실패 시 raw 그대로 | `JSON.parse` 실패 |

`raw -> 편집 표시` 는 시트를 열 때 한 번만 수행한다. 편집 중에는 사용자의 입력을 그대로 둔다.

### 세션 타입 오버라이드

사용자가 시트의 드롭다운으로 타입을 바꾸면 `Map<string, ValueType>` 에 `"local:accessToken"` 형태의 키로 저장한다. 메모리에만 두고 `<storage-inspector>` 엘리먼트가 제거되면 사라진다. 등록 키와 미등록 키 모두 바꿀 수 있다.

### 쓰기 (`writeEntry`, `removeEntry`)

- `writeEntry({ key, storage, raw })`: 대상 storage 에 `setItem`. `setItem` 이 던지는 예외는 그대로 상위로 전달한다.
- `removeEntry({ key, storage })`: `removeItem`.

## 컴포넌트 구조

```
<storage-inspector>          루트. init 이 body 에 붙임. 상태 소유.
  ├─ <si-launcher>           우측 하단 플로팅 버튼
  └─ <si-panel>              전체 화면 오버레이 (열림 상태일 때만 렌더)
       ├─ 상단 바            제목, local/session 탭, 새로고침, 추가, 닫기
       ├─ <si-entry-row> × N 목록 행
       └─ <si-entry-sheet>   하단 시트 (선택 항목이 있거나 추가 모드일 때만 렌더)
```

### `<storage-inspector>` (루트)

- 프로퍼티: `schema: SchemaEntry[]`
- 상태: `open: boolean`, `tab: StorageKind`, `entries: Entry[]`, `overrides: Map<string, ValueType>`, `sheet: { mode: 'edit', entry: Entry } | { mode: 'add' } | null`
- 열릴 때와 새로고침 이벤트마다 `buildEntries` 로 `entries` 를 다시 만든다.
- 하위 컴포넌트의 이벤트를 받아 코어를 호출하고 `entries` 를 다시 빌드한다. 하위 컴포넌트는 storage 를 직접 만지지 않는다.

### `<si-launcher>`

- 고정 위치 원형 버튼. 클릭 시 `toggle` 이벤트.
- `z-index` 는 큰 값으로 고정. 호스트와 충돌하면 사용자가 CSS 변수로 조정하는 기능은 이번 범위에 넣지 않는다.

### `<si-panel>`

- 프로퍼티: `entries`, `tab`
- 현재 탭의 항목만 필터해 `si-entry-row` 로 렌더. 항목이 없으면 빈 상태 문구.
- 상단 바 버튼은 각각 `tab-change`, `refresh`, `add`, `close` 이벤트.

### `<si-entry-row>`

- 프로퍼티: `entry`
- 표시: 키, 설명(있을 때), 타입 뱃지, 미등록 뱃지(`registered === false`), 값 미리보기(`raw` 를 한 줄로, 60자 초과 시 잘라서 `…`), `raw === null` 이면 "값 없음" 흐린 표시.
- 행 클릭 시 `select` 이벤트, 삭제 버튼 클릭 시 `remove` 이벤트 (행 클릭으로 전파되지 않게 `stopPropagation`).

### `<si-entry-sheet>`

- 프로퍼티: `mode: 'edit' | 'add'`, `entry?: Entry`, `tab: StorageKind`
- edit 모드: 키와 저장소는 고정 표시. 타입 드롭다운(string, number, boolean, json), 타입별 입력기, 검증 메시지, 저장과 취소 버튼.
- add 모드: 키 입력, 저장소 선택(기본값은 현재 탭), 타입 드롭다운(기본 string), 입력기, 저장과 취소.
- 타입별 입력기
  - string: 한 줄 `<input>`
  - number: `<input inputmode="decimal">`
  - boolean: 토글 (체크박스)
  - json: `<textarea>` 여러 줄, 고정폭 글꼴
- 타입 드롭다운을 바꾸면 입력기만 바뀌고 현재 입력 텍스트는 유지한다. boolean 으로 바꾸면 `input === "true"` 로 토글 초기값을 정한다.
- 저장 시 `save` 이벤트로 `{ key, storage, type, raw }` 를 올린다. 취소 시 `cancel`.
- 루트는 `save` 를 받으면 `type` 을 오버라이드 Map 에 기록하고 `writeEntry` 를 호출한다.

## 오류 처리

- 검증 실패(json 파싱 실패, number 비정상): 시트 안에 오류 문구를 띄우고 저장 버튼을 비활성화한다. 저장소에는 쓰지 않는다.
- add 모드에서 키가 비어 있거나 같은 저장소에 이미 있는 키: 오류 표시 후 저장 차단.
- `setItem` 예외(QuotaExceededError 등): 루트가 잡아 시트에 `error` 프로퍼티로 넘겨 표시한다. 시트는 닫지 않는다.
- 삭제는 확인 대화 없이 즉시 실행한다. 디버깅 도구이고 값은 재입력 가능하다.
- `localStorage` 접근 자체가 예외를 던지는 환경(일부 프라이빗 모드)은 다루지 않는다.

## 테스트

Vitest 로 코어 모듈만 단위 테스트한다. 저장소는 `Storage` 인터페이스를 흉내 낸 Map 기반 가짜 객체를 주입한다.

- `buildEntries`: 스키마 순서 유지, 미등록 키가 뒤에 붙음, 스키마에 있고 값 없는 키는 `raw: null`, 중복 스키마 키 무시, 오버라이드 > 스키마 type > 추론 우선순위.
- `inferType`: boolean, 정수, 소수, 음수, 공백 문자열(string), `"1e3"`(number), 객체 JSON, 배열 JSON, `"null"`(string), 일반 문자열.
- 타입별 변환: 각 타입의 입력 -> raw -> 표시 왕복. number 검증 실패 케이스(`""`, `"abc"`, `"Infinity"`). json 검증 실패 케이스.
- `writeEntry` / `removeEntry`: 가짜 storage 에 반영되는지, `setItem` 예외가 전달되는지.

컴포넌트는 `demo/index.html` 에서 수동 확인한다. 데모 페이지는 스키마 3개(string, boolean, json)와 미등록 키 2개(number 로 추론될 값, 일반 문자열)를 미리 심는다.

## 빌드와 배포 형태

- `vite build` 로 `dist/storage-inspector.js` (ESM) 와 `dist/storage-inspector.iife.js` (IIFE, 전역 `StorageInspector`) 를 생성한다. 타입 선언은 `vite-plugin-dts` 로 `dist/index.d.ts`.
- `package.json` 의 `exports` 는 ESM 만 가리킨다. IIFE 는 `unpkg` 필드와 파일 경로로만 노출한다.
- 이번 범위에서 npm 배포 자체는 하지 않는다. 빌드 산출물이 나오고 데모가 동작하면 완료.

## 범위 밖

- 쿠키, IndexedDB
- 컴포넌트 자동화 테스트
- 실시간 갱신(폴링, Storage.prototype 패치). 새로고침 버튼으로 대신한다.
- 타입 오버라이드 영구 저장
- enum, date 등 추가 타입
- 위치, 테마, z-index 커스터마이징
