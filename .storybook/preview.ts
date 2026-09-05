import { html } from 'lit'
import type { Preview } from '@storybook/web-components-vite'
import { themeTokens } from '../src/components/theme'

type ThemeGlobal = 'light' | 'dark'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
  },
  globalTypes: {
    theme: {
      description: '라이트/다크 토큰',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (story, context) => {
      const theme = (context.globals.theme as ThemeGlobal) ?? 'light'
      // 루트 컴포넌트는 스스로 토큰을 정의하므로 하위 컴포넌트 단독 스토리에만 라이트 DOM 에서 토큰을 주입한다
      return html`
        <div style="${themeTokens[theme]} min-height: 100vh; background: var(--si-bg); color: var(--si-fg);">
          ${story()}
        </div>
      `
    },
  ],
}

export default preview
