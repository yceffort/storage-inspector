import { html } from 'lit'
import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { expect, fn, userEvent, type Mock } from 'storybook/test'
import { findInShadow, inShadow } from '../../.storybook/shadow'
import type { Entry } from '../core'
import './si-entry-row'

interface Args {
  entry: Entry
  onSelect: Mock<(e: CustomEvent<Entry>) => void>
  onRemove: Mock<(e: CustomEvent<Entry>) => void>
}

const meta: Meta<Args> = {
  title: 'Components/SiEntryRow',
  args: { onSelect: fn(), onRemove: fn() },
  render: (args) => html`<si-entry-row .entry=${args.entry} @select=${args.onSelect} @remove=${args.onRemove}></si-entry-row>`,
}

export default meta
type Story = StoryObj<Args>

const registered: Entry = {
  key: 'accessToken',
  storage: 'local',
  description: '인증 토큰',
  type: 'string',
  raw: 'eyJhbGciOi.example.token',
  registered: true,
}

export const Registered: Story = {
  args: { entry: registered },
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('si-entry-row')
    const row = await findInShadow<HTMLElement>(host, '.row')
    await userEvent.click(row)
    await expect(args.onSelect).toHaveBeenCalledTimes(1)
    await expect(args.onSelect.mock.calls[0]?.[0].detail).toEqual(registered)

    await userEvent.click(inShadow<HTMLButtonElement>(host, 'button'))
    await expect(args.onRemove).toHaveBeenCalledTimes(1)
    await expect(args.onSelect).toHaveBeenCalledTimes(1)
  },
}

export const Unregistered: Story = {
  args: { entry: { key: 'retryCount', storage: 'local', type: 'number', raw: '3', registered: false } },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('si-entry-row')
    const badge = await findInShadow<HTMLElement>(host, '.badge.unregistered')
    await expect(badge.textContent?.trim()).toBe('미등록')
  },
}

export const EmptyValue: Story = {
  args: { entry: { key: 'neverSet', storage: 'local', description: '아직 값 없는 키', type: 'number', raw: null, registered: true } },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('si-entry-row')
    const preview = await findInShadow<HTMLElement>(host, '.preview.empty')
    await expect(preview.textContent?.trim()).toBe('값 없음')
  },
}

export const LongValue: Story = {
  args: { entry: { key: 'blob', storage: 'session', type: 'string', raw: 'x'.repeat(100), registered: false } },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('si-entry-row')
    const preview = await findInShadow<HTMLElement>(host, '.preview')
    const text = preview.textContent?.trim() ?? ''
    await expect(text.endsWith('…')).toBe(true)
    await expect(text.length).toBe(61)
  },
}
