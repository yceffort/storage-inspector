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
