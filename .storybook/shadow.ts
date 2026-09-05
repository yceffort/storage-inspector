import { waitFor } from 'storybook/test'

export function inShadow<T extends Element>(host: Element | null | undefined, selector: string): T {
  const el = host?.shadowRoot?.querySelector<T>(selector)
  if (!el) throw new Error(`섀도 DOM 에서 찾지 못함: ${selector}`)
  return el
}

export function allInShadow<T extends Element>(host: Element | null | undefined, selector: string): T[] {
  return [...(host?.shadowRoot?.querySelectorAll<T>(selector) ?? [])]
}

export function findInShadow<T extends Element>(host: Element | null | undefined, selector: string): Promise<T> {
  return waitFor(() => inShadow<T>(host, selector))
}

export function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
