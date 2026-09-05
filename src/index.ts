import { StorageInspector, type Theme } from './components/storage-inspector'
import type { SchemaEntry } from './core'

export type { SchemaEntry, Entry, StorageKind, ValueType, StandardSchemaV1 } from './core'
export type { Theme }

export interface InitOptions {
  schema?: SchemaEntry[]
  /** 생략하면 시스템의 prefers-color-scheme 을 따른다 */
  theme?: Theme
  /** 하단 네이티브 탭바 등에 가리지 않도록 런처, 시트, 목록을 위로 밀 거리(px) */
  bottomOffset?: number
  /** 런처의 z-index. 패널은 +1, 시트는 +2 를 쓴다. 기본 2147483000 */
  zIndex?: number
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
  el.bottomOffset = options.bottomOffset ?? 0
  el.zIndex = options.zIndex ?? null
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
