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
