import type { StandardIssue, StandardSchemaV1, ValueType } from './types'

/** 저장 문자열(raw)을 타입에 맞는 JS 값으로 바꾼다. raw 는 이미 toRaw 로 정규화된 값이어야 한다. */
export function parseRaw(type: ValueType, raw: string): unknown {
  switch (type) {
    case 'string':
      return raw
    case 'number':
      return Number(raw)
    case 'boolean':
      return raw === 'true'
    case 'json':
      return JSON.parse(raw)
  }
}

export function checkOptions(options: readonly string[] | undefined, raw: string): string {
  if (!options || options.includes(raw)) return ''
  return `허용된 값이 아닙니다: ${options.join(', ')}`
}

function formatIssue(issue: StandardIssue): string {
  const path = (issue.path ?? []).map((p) => String(typeof p === 'object' ? p.key : p)).join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

/** 성공이면 빈 문자열, 실패면 이슈를 줄바꿈으로 합친 메시지 */
export async function validateWithSchema(schema: StandardSchemaV1 | undefined, type: ValueType, raw: string): Promise<string> {
  if (!schema) return ''
  const result = await schema['~standard'].validate(parseRaw(type, raw))
  if (!result.issues) return ''
  return result.issues.map(formatIssue).join('\n')
}
