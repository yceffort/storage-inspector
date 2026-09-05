import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command: 'pnpm build && pnpm dev --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
