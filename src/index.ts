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
