import { html } from 'lit'
import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { expect, fn, userEvent, waitFor, type Mock } from 'storybook/test'
import { allInShadow, findInShadow, inShadow, setValue } from '../../.storybook/shadow'
import type { Entry, StorageKind } from '../core'
import type { SaveDetail } from './si-entry-sheet'
import './si-entry-sheet'

interface Args {
  mode: 'edit' | 'add'
  entry?: Entry
  tab: StorageKind
  existingKeys: string[]
  error: string
  onSave: Mock<(e: CustomEvent<SaveDetail>) => void>
  onCancel: Mock<() => void>
}

const meta: Meta<Args> = {
  title: 'Components/SiEntrySheet',
  args: { mode: 'edit', tab: 'local', existingKeys: [], error: '', onSave: fn(), onCancel: fn() },
  render: (args) => html`
    <si-entry-sheet
      .mode=${args.mode}
      .entry=${args.entry}
      .tab=${args.tab}
      .existingKeys=${args.existingKeys}
      .error=${args.error}
      @save=${args.onSave}
      @cancel=${args.onCancel}
    ></si-entry-sheet>
  `,
}

export default meta
type Story = StoryObj<Args>

const saveButton = (host: Element | null) => inShadow<HTMLButtonElement>(host, 'button.primary')
const errorText = (host: Element | null) => host?.shadowRoot?.querySelector('.error')?.textContent?.trim() ?? ''

export const EditString: Story = {
  args: {
    entry: { key: 'accessToken', storage: 'local', description: '인증 토큰', type: 'string', raw: 'abc', registered: true },
  },
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('si-entry-sheet')
    const input = await findInShadow<HTMLInputElement>(host, 'label:last-of-type input')
    await expect(input.value).toBe('abc')

    // 타입을 number 로 바꾸면 기존 입력이 유지되고 검증에 걸린다
    const typeSelect = allInShadow<HTMLSelectElement>(host, 'select')[0]!
    await userEvent.selectOptions(typeSelect, 'number')
    await waitFor(() => expect(errorText(host)).toBe('유효한 숫자가 아닙니다'))
    await expect(saveButton(host).disabled).toBe(true)

    setValue(inShadow<HTMLInputElement>(host, 'label:last-of-type input'), '12')
    await waitFor(() => expect(saveButton(host).disabled).toBe(false))
    await userEvent.click(saveButton(host))
    await expect(args.onSave.mock.calls[0]?.[0].detail).toEqual({ key: 'accessToken', storage: 'local', type: 'number', raw: '12' })
  },
}

export const EditBoolean: Story = {
  args: { entry: { key: 'darkMode', storage: 'local', type: 'boolean', raw: 'true', registered: true } },
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('si-entry-sheet')
    const checkbox = await findInShadow<HTMLInputElement>(host, 'input[type=checkbox]')
    await expect(checkbox.checked).toBe(true)
    await userEvent.click(checkbox)
    await userEvent.click(saveButton(host))
    await expect(args.onSave.mock.calls[0]?.[0].detail.raw).toBe('false')
  },
}

export const EditJson: Story = {
  args: { entry: { key: 'draft', storage: 'session', type: 'json', raw: '{"title":"초안","tags":["a"]}', registered: true } },
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('si-entry-sheet')
    const textarea = await findInShadow<HTMLTextAreaElement>(host, 'textarea')
    await expect(textarea.value).toBe('{\n  "title": "초안",\n  "tags": [\n    "a"\n  ]\n}')

    setValue(textarea, '{"title": "초안"')
    await waitFor(() => expect(errorText(host)).toContain('JSON 파싱 실패'))
    await expect(saveButton(host).disabled).toBe(true)

    setValue(textarea, '{ "title": "수정", "tags": [] }')
    await waitFor(() => expect(saveButton(host).disabled).toBe(false))
    await userEvent.click(saveButton(host))
    await expect(args.onSave.mock.calls[0]?.[0].detail.raw).toBe('{"title":"수정","tags":[]}')
  },
}

export const AddMode: Story = {
  args: { mode: 'add', tab: 'session', existingKeys: ['local:accessToken'] },
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('si-entry-sheet')
    await findInShadow(host, 'button.primary')
    await expect(errorText(host)).toBe('키를 입력하세요')
    await expect(saveButton(host).disabled).toBe(true)

    const keyInput = allInShadow<HTMLInputElement>(host, 'input')[0]!
    const storageSelect = allInShadow<HTMLSelectElement>(host, 'select')[0]!
    await expect(storageSelect.value).toBe('session')

    await userEvent.selectOptions(storageSelect, 'local')
    setValue(keyInput, 'accessToken')
    await waitFor(() => expect(errorText(host)).toBe('이미 있는 키입니다'))

    setValue(keyInput, 'newKey')
    setValue(allInShadow<HTMLInputElement>(host, 'input')[1]!, 'hello')
    await waitFor(() => expect(saveButton(host).disabled).toBe(false))
    await userEvent.click(saveButton(host))
    await expect(args.onSave.mock.calls[0]?.[0].detail).toEqual({ key: 'newKey', storage: 'local', type: 'string', raw: 'hello' })
  },
}

export const WithWriteError: Story = {
  args: {
    entry: { key: 'big', storage: 'local', type: 'string', raw: 'x', registered: true },
    error: 'QuotaExceededError',
  },
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('si-entry-sheet')
    await findInShadow(host, '.error')
    await expect(errorText(host)).toBe('QuotaExceededError')
    await userEvent.click(inShadow<HTMLButtonElement>(host, '.actions button:not(.primary)'))
    await expect(args.onCancel).toHaveBeenCalledTimes(1)
  },
}
