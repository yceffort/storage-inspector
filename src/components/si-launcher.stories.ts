import { html } from 'lit'
import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { expect, fn, userEvent, type Mock } from 'storybook/test'
import { findInShadow } from '../../.storybook/shadow'
import './si-launcher'

interface Args {
  onToggle: Mock<() => void>
}

const meta: Meta<Args> = {
  title: 'Components/SiLauncher',
  args: { onToggle: fn() },
  render: (args) => html`<si-launcher @toggle=${args.onToggle}></si-launcher>`,
}

export default meta
type Story = StoryObj<Args>

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const button = await findInShadow<HTMLButtonElement>(canvasElement.querySelector('si-launcher'), 'button')
    await userEvent.click(button)
    await expect(args.onToggle).toHaveBeenCalledTimes(1)
  },
}
