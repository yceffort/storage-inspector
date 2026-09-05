import { LitElement, css, html } from 'lit'
import type { Entry } from '../core'

const PREVIEW_MAX = 60

export class SiEntryRow extends LitElement {
  static properties = {
    entry: { attribute: false },
  }

  static styles = css`
    :host {
      display: block;
      border-bottom: 1px solid var(--si-border);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      cursor: pointer;
    }
    .row:active {
      background: var(--si-surface);
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .key {
      font-weight: 600;
      word-break: break-all;
    }
    .desc {
      color: var(--si-muted);
      font-size: 12px;
    }
    .preview {
      color: var(--si-fg);
      font-family: ui-monospace, monospace;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .preview.empty {
      color: var(--si-muted);
      font-style: italic;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      background: var(--si-badge-bg);
      color: var(--si-badge-fg);
      margin-right: 4px;
    }
    .badge.unregistered {
      background: var(--si-warn-bg);
      color: var(--si-warn-fg);
    }
    button {
      border: 1px solid var(--si-border);
      background: var(--si-bg);
      color: var(--si-danger);
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 12px;
      cursor: pointer;
    }
  `

  entry!: Entry

  render() {
    const e = this.entry
    const preview = e.raw === null ? '값 없음' : e.raw.length > PREVIEW_MAX ? `${e.raw.slice(0, PREVIEW_MAX)}…` : e.raw
    return html`
      <div class="row" @click=${this.onSelect}>
        <div class="main">
          <div>
            <span class="badge">${e.type}</span>
            ${e.registered ? null : html`<span class="badge unregistered">미등록</span>`}
            <span class="key">${e.key}</span>
          </div>
          ${e.description ? html`<div class="desc">${e.description}</div>` : null}
          <div class="preview ${e.raw === null ? 'empty' : ''}">${preview}</div>
        </div>
        <button type="button" @click=${this.onRemove}>삭제</button>
      </div>
    `
  }

  private onSelect = () => {
    this.dispatchEvent(new CustomEvent('select', { detail: this.entry, bubbles: true, composed: true }))
  }

  private onRemove = (ev: Event) => {
    ev.stopPropagation()
    this.dispatchEvent(new CustomEvent('remove', { detail: this.entry, bubbles: true, composed: true }))
  }
}

customElements.define('si-entry-row', SiEntryRow)
