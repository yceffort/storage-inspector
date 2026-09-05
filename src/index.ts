import { StorageInspector, type Theme } from './components/storage-inspector'
import type { SchemaEntry } from './core'

export type { SchemaEntry, Entry, StorageKind, ValueType } from './core'
export type { Theme }

export interface InitOptions {
  schema?: SchemaEntry[]
  /** 생략하면 시스템의 prefers-color-scheme 을 따른다 */
  theme?: Theme
}

export interface Inspector {
  open(): void
  close(): void
  destroy(): void
}

let current: StorageInspector | null = null

function mount(el: StorageInspector) {
  if (document.body) {
    document.body.appendChild(el)
    return
  }
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      if (current === el) document.body.appendChild(el)
    },
    { once: true },
  )
}

export function init(options: InitOptions = {}): Inspector {
  current?.remove()
  const el = new StorageInspector()
  el.schema = options.schema ?? []
  el.theme = options.theme ?? null
  current = el
  mount(el)
  return {
    open: () => el.open(),
    close: () => el.close(),
    destroy: () => {
      el.remove()
      if (current === el) current = null
    },
  }
}
