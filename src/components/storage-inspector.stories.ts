import { html, nothing } from 'lit'
import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { allInShadow, findInShadow, inShadow, setValue } from '../../.storybook/shadow'
import type { Entry, SchemaEntry } from '../core'
import './storage-inspector'

const schema: SchemaEntry[] = [
  { key: 'accessToken', description: '인증 토큰', type: 'string', storage: 'local' },
  { key: 'darkMode', description: '다크모드', type: 'boolean', storage: 'local' },
  { key: 'draft', description: '작성 중 글', type: 'json', storage: 'session' },
  { key: 'neverSet', description: '아직 값 없는 키', type: 'number', storage: 'local' },
]

interface Args {
  bottomOffset: number
  zIndex: number
}

const meta: Meta<Args> = {
  title: 'StorageInspector',
  args: { bottomOffset: 0, zIndex: 2147483000 },
  argTypes: {
    bottomOffset: { control: { type: 'range', min: 0, max: 120, step: 4 } },
    zIndex: { control: { type: 'number' } },
  },
  render: (args, { globals }) =>
    html`<storage-inspector
      .schema=${schema}
      .bottomOffset=${args.bottomOffset}
      .zIndex=${args.zIndex}
      theme=${globals.theme === 'dark' ? 'dark' : nothing}
    ></storage-inspector>`,
  beforeEach: () => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('accessToken', 'token')
    localStorage.setItem('darkMode', 'true')
    localStorage.setItem('retryCount', '3')
    sessionStorage.setItem('draft', '{"title":"초안"}')
    return () => {
      localStorage.clear()
      sessionStorage.clear()
    }
  },
}

export default meta
type Story = StoryObj<Args>

type RowEl = HTMLElement & { entry: Entry }

async function openPanel(canvasElement: HTMLElement) {
  const root = canvasElement.querySelector('storage-inspector')
  const launcher = await findInShadow(root, 'si-launcher')
  await userEvent.click(inShadow<HTMLButtonElement>(launcher, 'button'))
  const panel = await findInShadow(root, 'si-panel')
  await findInShadow(panel, 'si-entry-row')
  return { root, panel }
}

const rows = (panel: Element) => allInShadow<RowEl>(panel, 'si-entry-row')
const row = (panel: Element, key: string) => rows(panel).find((r) => r.entry.key === key)!

export const FullFlow: Story = {
  play: async ({ canvasElement }) => {
    const { root, panel } = await openPanel(canvasElement)

    await expect(rows(panel).map((r) => [r.entry.key, r.entry.registered])).toEqual([
      ['accessToken', true],
      ['darkMode', true],
      ['neverSet', true],
      ['retryCount', false],
    ])

    // boolean 편집
    await userEvent.click(inShadow<HTMLElement>(row(panel, 'darkMode'), '.row'))
    const sheet = await findInShadow(root, 'si-entry-sheet')
    await userEvent.click(await findInShadow<HTMLInputElement>(sheet, 'input[type=checkbox]'))
    await userEvent.click(inShadow<HTMLButtonElement>(sheet, 'button.primary'))
    await waitFor(() => expect(localStorage.getItem('darkMode')).toBe('false'))
    await waitFor(() => expect(root?.shadowRoot?.querySelector('si-entry-sheet')).toBeNull())

    // 타입 오버라이드가 닫았다 열어도 유지
    await userEvent.click(inShadow<HTMLElement>(row(panel, 'retryCount'), '.row'))
    const sheet2 = await findInShadow(root, 'si-entry-sheet')
    await userEvent.selectOptions(await findInShadow<HTMLSelectElement>(sheet2, 'select'), 'string')
    await userEvent.click(inShadow<HTMLButtonElement>(sheet2, 'button.primary'))
    await waitFor(() => expect(row(panel, 'retryCount').entry.type).toBe('string'))
    await userEvent.click(allInShadow<HTMLButtonElement>(panel, 'header button')[2]!)
    const { panel: reopened } = await openPanel(canvasElement)
    await expect(row(reopened, 'retryCount').entry.type).toBe('string')

    // 삭제: 등록 키는 값만 지워져 "값 없음" 으로 남고, 미등록 키는 목록에서 사라진다
    await userEvent.click(inShadow<HTMLButtonElement>(row(reopened, 'accessToken'), 'button'))
    await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull())
    await waitFor(() => expect(row(reopened, 'accessToken').entry.raw).toBeNull())
    await userEvent.click(inShadow<HTMLButtonElement>(row(reopened, 'retryCount'), 'button'))
    await waitFor(() => expect(rows(reopened).map((r) => r.entry.key)).not.toContain('retryCount'))

    // 추가
    await userEvent.click(allInShadow<HTMLButtonElement>(reopened, 'header button')[1]!)
    const sheet3 = await findInShadow(root, 'si-entry-sheet')
    await findInShadow(sheet3, 'button.primary')
    setValue(allInShadow<HTMLInputElement>(sheet3, 'input')[0]!, 'newKey')
    setValue(allInShadow<HTMLInputElement>(sheet3, 'input')[1]!, 'hello')
    await waitFor(() => expect(inShadow<HTMLButtonElement>(sheet3, 'button.primary').disabled).toBe(false))
    await userEvent.click(inShadow<HTMLButtonElement>(sheet3, 'button.primary'))
    await waitFor(() => expect(localStorage.getItem('newKey')).toBe('hello'))
    await expect(row(reopened, 'newKey').entry.registered).toBe(false)
  },
}

export const WithBottomOffset: Story = {
  args: { bottomOffset: 80 },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('storage-inspector')!
    const launcher = await findInShadow<HTMLElement>(root, 'si-launcher')
    await waitFor(() => expect(getComputedStyle(launcher).bottom).toBe('96px'))
    await userEvent.click(inShadow<HTMLButtonElement>(launcher, 'button'))
    const panel = await findInShadow(root, 'si-panel')
    await expect(getComputedStyle(inShadow<HTMLElement>(panel, '.list')).paddingBottom).toBe('80px')
  },
}

export const WithCustomZIndex: Story = {
  args: { zIndex: 500 },
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('storage-inspector')!
    const launcher = await findInShadow<HTMLElement>(root, 'si-launcher')
    await waitFor(() => expect(getComputedStyle(launcher).zIndex).toBe('500'))
    await userEvent.click(inShadow<HTMLButtonElement>(launcher, 'button'))
    const panel = await findInShadow<HTMLElement>(root, 'si-panel')
    await expect(getComputedStyle(panel).zIndex).toBe('501')
  },
}
