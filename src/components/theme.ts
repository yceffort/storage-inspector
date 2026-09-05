import { css, unsafeCSS } from 'lit'

const light = `
  --si-bg: #ffffff;
  --si-fg: #111111;
  --si-muted: #666666;
  --si-border: #e5e5e5;
  --si-surface: #f5f5f5;
  --si-accent: #1f6feb;
  --si-accent-fg: #ffffff;
  --si-danger: #cc0000;
  --si-badge-bg: #eef2ff;
  --si-badge-fg: #3b4fbf;
  --si-warn-bg: #fff4e5;
  --si-warn-fg: #9a5b00;
  --si-input-bg: #ffffff;
  --si-input-border: #cccccc;
  --si-backdrop: rgba(0, 0, 0, 0.4);
  --si-shadow: rgba(0, 0, 0, 0.3);
  color-scheme: light;
`

const dark = `
  --si-bg: #1c1c1e;
  --si-fg: #f2f2f7;
  --si-muted: #9a9aa0;
  --si-border: #3a3a3c;
  --si-surface: #2c2c2e;
  --si-accent: #4c8dff;
  --si-accent-fg: #ffffff;
  --si-danger: #ff6b6b;
  --si-badge-bg: #2a2f4a;
  --si-badge-fg: #9fb3ff;
  --si-warn-bg: #4a3a1f;
  --si-warn-fg: #ffcc80;
  --si-input-bg: #2c2c2e;
  --si-input-border: #4a4a4c;
  --si-backdrop: rgba(0, 0, 0, 0.6);
  --si-shadow: rgba(0, 0, 0, 0.6);
  color-scheme: dark;
`

/** Storybook 데코레이터처럼 라이트 DOM 에서 토큰을 주입할 때 쓰는 인라인 스타일 문자열 */
export const themeTokens = { light, dark } as const

/** 루트 컴포넌트 전용. theme 속성이 없으면 시스템 설정을 따른다. */
export const themeStyles = css`
  :host {
    ${unsafeCSS(light)}
  }
  @media (prefers-color-scheme: dark) {
    :host(:not([theme='light'])) {
      ${unsafeCSS(dark)}
    }
  }
  :host([theme='dark']) {
    ${unsafeCSS(dark)}
  }
`
