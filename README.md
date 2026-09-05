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
pnpm exec playwright install chromium   # 처음 한 번, Storybook 테스트와 E2E 가 사용
pnpm dev              # 데모 페이지
pnpm storybook        # Storybook (localhost:6006)
pnpm test             # 코어 단위 테스트 (Vitest)
pnpm test:storybook   # 스토리 상호작용 테스트 (Vitest 브라우저 모드, headless Chromium)
pnpm test:e2e         # Playwright E2E (데모 페이지와 IIFE head 삽입 페이지)
pnpm test:all         # 위 세 가지 전부
pnpm typecheck
pnpm build
```

테스트 구성:

- `src/core/*.test.ts`: 목록 병합, 타입 추론, 변환, 쓰기의 순수 로직.
- `src/components/*.stories.ts`: 컴포넌트마다 스토리와 `play` 함수. 이벤트 발생, 검증 메시지, 저장 버튼 상태를 검사하고 `StorageInspector/FullFlow` 는 실제 localStorage 를 대상으로 열기, 편집, 타입 유지, 삭제, 추가를 한 번에 훑는다.
- `e2e/*.spec.ts`: Vite dev 서버 위의 데모 페이지와 IIFE 번들을 `<head>` 에 넣은 페이지를 Playwright 로 검증한다.
