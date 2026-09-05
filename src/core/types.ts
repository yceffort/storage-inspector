export type StorageKind = 'local' | 'session'
export type ValueType = 'string' | 'number' | 'boolean' | 'json'

export const VALUE_TYPES: readonly ValueType[] = ['string', 'number', 'boolean', 'json']

export interface SchemaEntry {
  key: string
  storage: StorageKind
  description?: string
  type?: ValueType
  /** string 타입에서 허용하는 값 목록. 주면 입력기가 드롭다운으로 바뀐다 */
  options?: readonly string[]
  /** 저장 전에 파싱된 값을 검증하는 Standard Schema (zod, valibot 등) */
  validate?: StandardSchemaV1
}

export interface Entry {
  key: string
  storage: StorageKind
  description?: string
  type: ValueType
  raw: string | null
  registered: boolean
  options?: readonly string[]
  validate?: StandardSchemaV1
}

export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** https://standardschema.dev 의 v1 인터페이스. zod, valibot, arktype 등이 구현한다. 의존성 없이 쓰기 위해 필요한 부분만 옮겼다. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) => StandardResult<Output> | Promise<StandardResult<Output>>
    readonly types?: { readonly input: Input; readonly output: Output }
  }
}

export type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardIssue> }

export interface StandardIssue {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>
}
