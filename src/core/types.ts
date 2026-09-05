export type StorageKind = 'local' | 'session'
export type ValueType = 'string' | 'number' | 'boolean' | 'json'

export const VALUE_TYPES: readonly ValueType[] = ['string', 'number', 'boolean', 'json']

export interface SchemaEntry {
  key: string
  storage: StorageKind
  description?: string
  type?: ValueType
}

export interface Entry {
  key: string
  storage: StorageKind
  description?: string
  type: ValueType
  raw: string | null
  registered: boolean
}

export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
