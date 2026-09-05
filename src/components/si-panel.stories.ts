import { html } from 'lit'
import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { expect, fn, userEvent, type Mock } from 'storybook/test'
import { allInShadow, findInShadow } from '../../.storybook/shadow'
import type { Entry, StorageKind } from '../core'
import './si-panel'

interface Args {
  entries: Entry[]
  tab: StorageKind
  onTabChange: Mock<(e: CustomEvent<StorageKind>) => void>
  onRefresh: Mock<() => void>
  onAdd: Mock<() => void>
  onClose: Mock<() => void>
}

const entries: Entry[] = [
  { key: 'accessToken', storage: 'local', description: '인증 토큰', type: 'string', raw: 'token', registered: true },
  { key: 'darkMode', storage: 'local', description: '다크모드', type: 'boolean', raw: 'true', registered: true },
  { key: 'retryCount', storage: 'local', type: 'number', raw: '3', registered: false },
  { key: 'draft', storage: 'session', description: '작성 중 글', type: 'json', raw: '{"a":1}', registered: true },
]

const meta: Meta<Args> = {
  title: 'Components/SiPanel',
  args: { entries, tab: 'local', onTabChange: fn(), onRefresh: fn(), onAdd: fn(), onClose: fn() },
  render: (args) => html`
    <si-panel
      .entries=${args.entries}
      .tab=${args.tab}
      @tab-change=${args.onTabChange}
      @refresh=${args.onRefresh}
      @add=${args.onAdd}
      @close=${args.onClose}
    ></si-panel>
  `,
}

export default meta
type Story = StoryObj<Args>

export const LocalTab: Story = {
  play: async ({ canvasElement, args }) => {
    const host = canvasElement.querySelector('si-panel')
    await findInShadow(host, 'si-entry-row')
    await expect(allInShadow(host, 'si-entry-row')).toHaveLength(3)

    const tabs = allInShadow<HTMLButtonElement>(host, '.tabs button')
    await userEvent.click(tabs[1]!)
    await expect(args.onTabChange).toHaveBeenCalledTimes(1)
    await expect(args.onTabChange.mock.calls[0]?.[0].detail).toBe('session')

    const [refresh, add, close] = allInShadow<HTMLButtonElement>(host, 'header button')
    await userEvent.click(refresh!)
    await userEvent.click(add!)
    await userEvent.click(close!)
    await expect(args.onRefresh).toHaveBeenCalledTimes(1)
    await expect(args.onAdd).toHaveBeenCalledTimes(1)
    await expect(args.onClose).toHaveBeenCalledTimes(1)
  },
}

export const SessionTab: Story = {
  args: { tab: 'session' },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('si-panel')
    await findInShadow(host, 'si-entry-row')
    const rows = allInShadow<HTMLElement & { entry: Entry }>(host, 'si-entry-row')
    await expect(rows.map((r) => r.entry.key)).toEqual(['draft'])
  },
}

export const Empty: Story = {
  args: { entries: [] },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('si-panel')
    const empty = await findInShadow<HTMLElement>(host, '.empty')
    await expect(empty.textContent?.trim()).toBe('항목이 없습니다')
  },
}
