import type { StorybookConfig } from '@storybook/web-components-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-vitest'],
  framework: { name: '@storybook/web-components-vite', options: {} },
  viteFinal(config) {
    // 라이브러리 빌드 설정은 Storybook 번들에 적용하지 않는다
    return { ...config, build: { ...config.build, lib: false } }
  },
}

export default config
