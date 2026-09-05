import { LitElement, css, html } from 'lit'
import type { Entry, StorageKind } from '../core'
import './si-entry-row'

const TABS: readonly StorageKind[] = ['local', 'session']

export class SiPanel extends LitElement {
  static properties = {
    entries: { attribute: false },
    tab: { attribute: false },
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 2147483001;
      display: flex;
      flex-direction: column;
      background: var(--si-bg);
      color: var(--si-fg);
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--si-border);
    }
    h1 {
      font-size: 15px;
      margin: 0;
      flex: 1;
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--si-border);
    }
    .tabs button {
      flex: 1;
      padding: 10px;
      border: none;
      background: none;
      color: var(--si-fg);
      font-size: 14px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tabs button.active {
      border-bottom-color: var(--si-accent);
      font-weight: 600;
    }
    header button {
      border: 1px solid var(--si-border);
      background: var(--si-bg);
      color: var(--si-fg);
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
    }
    .list {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .empty {
      padding: 32px;
      text-align: center;
      color: var(--si-muted);
    }
  `

  entries: Entry[] = []
  tab: StorageKind = 'local'

  render() {
    const visible = this.entries.filter((e) => e.storage === this.tab)
    return html`
      <header>
        <h1>Storage</h1>
        <button type="button" @click=${() => this.emit('refresh')}>새로고침</button>
        <button type="button" @click=${() => this.emit('add')}>추가</button>
        <button type="button" @click=${() => this.emit('close')}>닫기</button>
      </header>
      <div class="tabs">
        ${TABS.map(
          (t) => html`
            <button type="button" class=${t === this.tab ? 'active' : ''} @click=${() => this.emit('tab-change', t)}>
              ${t}Storage
            </button>
          `,
        )}
      </div>
      <div class="list">
        ${visible.length === 0
          ? html`<div class="empty">항목이 없습니다</div>`
          : visible.map((e) => html`<si-entry-row .entry=${e}></si-entry-row>`)}
      </div>
    `
  }

  private emit(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }))
  }
}

customElements.define('si-panel', SiPanel)
