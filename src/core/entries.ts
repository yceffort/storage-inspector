import { inferType } from './infer'
import type { Entry, SchemaEntry, StorageKind, StorageLike, ValueType } from './types'

export type Storages = Record<StorageKind, StorageLike>
export type Overrides = Map<string, ValueType>

const KINDS: readonly StorageKind[] = ['local', 'session']

export function overrideKey(storage: StorageKind, key: string): string {
  return `${storage}:${key}`
}

export function buildEntries(schema: SchemaEntry[], overrides: Overrides, storages: Storages): Entry[] {
  const entries: Entry[] = []
  const seen = new Set<string>()

  for (const item of schema) {
    const id = overrideKey(item.storage, item.key)
    if (seen.has(id)) continue
    seen.add(id)
    const raw = storages[item.storage].getItem(item.key)
    entries.push({
      key: item.key,
      storage: item.storage,
      description: item.description,
      type: overrides.get(id) ?? item.type ?? inferType(raw),
      raw,
      registered: true,
    })
  }

  for (const kind of KINDS) {
    const storage = storages[kind]
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key === null) continue
      const id = overrideKey(kind, key)
      if (seen.has(id)) continue
      seen.add(id)
      const raw = storage.getItem(key)
      entries.push({
        key,
        storage: kind,
        type: overrides.get(id) ?? inferType(raw),
        raw,
        registered: false,
      })
    }
  }

  return entries
}

export function writeEntry(storages: Storages, target: { storage: StorageKind; key: string; raw: string }): void {
  storages[target.storage].setItem(target.key, target.raw)
}

export function removeEntry(storages: Storages, target: { storage: StorageKind; key: string }): void {
  storages[target.storage].removeItem(target.key)
}

export function browserStorages(): Storages {
  return { local: window.localStorage, session: window.sessionStorage }
}
