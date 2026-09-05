import { LitElement, css, html } from 'lit'

export class SiLauncher extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483000;
    }
    button {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: var(--si-accent);
      color: var(--si-accent-fg);
      font: 600 14px/1 system-ui, sans-serif;
      box-shadow: 0 2px 8px var(--si-shadow);
      cursor: pointer;
    }
  `

  render() {
    return html`<button type="button" aria-label="Storage inspector" @click=${this.onClick}>SI</button>`
  }

  private onClick = () => {
    this.dispatchEvent(new CustomEvent('toggle', { bubbles: true, composed: true }))
  }
}

customElements.define('si-launcher', SiLauncher)
