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
  plugins: [dts({ include: ['src'], exclude: ['src/**/*.test.ts', 'src/**/*.stories.ts'], entryRoot: 'src' })],
})
