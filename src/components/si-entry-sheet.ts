import { LitElement, css, html } from 'lit'
import { VALUE_TYPES, overrideKey, toDisplay, toRaw, type Entry, type StorageKind, type ValueType } from '../core'
import { bottomInset } from './theme'

export interface SaveDetail {
  key: string
  storage: StorageKind
  type: ValueType
  raw: string
}

export class SiEntrySheet extends LitElement {
  static properties = {
    mode: { attribute: false },
    entry: { attribute: false },
    tab: { attribute: false },
    existingKeys: { attribute: false },
    error: { attribute: false },
    key: { state: true },
    storage: { state: true },
    type: { state: true },
    input: { state: true },
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: calc(var(--si-z-index) + 2);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      background: var(--si-backdrop);
    }
    .sheet {
      background: var(--si-bg);
      color: var(--si-fg);
      border-radius: 12px 12px 0 0;
      padding: 16px 16px calc(16px + ${bottomInset});
      max-height: 85vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: var(--si-muted);
    }
    input,
    select,
    textarea {
      font: 14px/1.4 system-ui, sans-serif;
      padding: 8px;
      border: 1px solid var(--si-input-border);
      border-radius: 6px;
      background: var(--si-input-bg);
      color: var(--si-fg);
    }
    textarea {
      font-family: ui-monospace, monospace;
      min-height: 140px;
    }
    .fixed {
      font-size: 14px;
      color: var(--si-fg);
      word-break: break-all;
    }
    .error {
      color: var(--si-danger);
      font-size: 12px;
    }
    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .actions button {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid var(--si-input-border);
      background: var(--si-bg);
      color: var(--si-fg);
      font-size: 14px;
      cursor: pointer;
    }
    .actions button.primary {
      background: var(--si-accent);
      color: var(--si-accent-fg);
      border-color: var(--si-accent);
    }
    .actions button:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `

  mode: 'edit' | 'add' = 'edit'
  entry?: Entry
  tab: StorageKind = 'local'
  existingKeys: string[] = []
  error = ''

  key = ''
  storage: StorageKind = 'local'
  type: ValueType = 'string'
  input = ''

  connectedCallback() {
    super.connectedCallback()
    if (this.mode === 'edit' && this.entry) {
      this.key = this.entry.key
      this.storage = this.entry.storage
      this.type = this.entry.type
      this.input = toDisplay(this.entry.type, this.entry.raw)
    } else {
      this.key = ''
      this.storage = this.tab
      this.type = 'string'
      this.input = ''
    }
  }

  private validate(): string {
    if (this.mode === 'add') {
      if (this.key.trim() === '') return '키를 입력하세요'
      if (this.existingKeys.includes(overrideKey(this.storage, this.key))) return '이미 있는 키입니다'
    }
    const result = toRaw(this.type, this.input)
    return result.ok ? '' : result.error
  }

  render() {
    const validation = this.validate()
    const message = validation || this.error
    return html`
      <div class="sheet" @click=${(e: Event) => e.stopPropagation()}>
        ${this.mode === 'add'
          ? html`
              <label>키 <input .value=${this.key} @input=${this.onKey} autocapitalize="off" autocomplete="off" /></label>
              <label>
                저장소
                <select .value=${this.storage} @change=${this.onStorage}>
                  <option value="local">localStorage</option>
                  <option value="session">sessionStorage</option>
                </select>
              </label>
            `
          : html`
              <div class="fixed">${this.storage}Storage / <strong>${this.key}</strong></div>
              ${this.entry?.description ? html`<div class="fixed" style="color: var(--si-muted)">${this.entry.description}</div>` : null}
            `}
        <label>
          타입
          <select .value=${this.type} @change=${this.onType}>
            ${VALUE_TYPES.map((t) => html`<option value=${t} ?selected=${t === this.type}>${t}</option>`)}
          </select>
        </label>
        <label>값 ${this.renderInput()}</label>
        ${message ? html`<div class="error">${message}</div>` : null}
        <div class="actions">
          <button type="button" @click=${this.onCancel}>취소</button>
          <button type="button" class="primary" ?disabled=${validation !== ''} @click=${this.onSave}>저장</button>
        </div>
      </div>
    `
  }

  private renderInput() {
    switch (this.type) {
      case 'boolean':
        return html`
          <span>
            <input type="checkbox" .checked=${this.input === 'true'} @change=${this.onToggle} />
            ${this.input === 'true' ? 'true' : 'false'}
          </span>
        `
      case 'number':
        return html`<input inputmode="decimal" .value=${this.input} @input=${this.onInput} />`
      case 'json':
        return html`<textarea .value=${this.input} @input=${this.onInput} spellcheck="false"></textarea>`
      case 'string':
        return html`<input .value=${this.input} @input=${this.onInput} autocapitalize="off" autocomplete="off" />`
    }
  }

  private onKey = (e: Event) => {
    this.key = (e.target as HTMLInputElement).value
  }

  private onStorage = (e: Event) => {
    this.storage = (e.target as HTMLSelectElement).value as StorageKind
  }

  private onType = (e: Event) => {
    this.type = (e.target as HTMLSelectElement).value as ValueType
  }

  private onInput = (e: Event) => {
    this.input = (e.target as HTMLInputElement | HTMLTextAreaElement).value
  }

  private onToggle = (e: Event) => {
    this.input = (e.target as HTMLInputElement).checked ? 'true' : 'false'
  }

  private onCancel = () => {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))
  }

  private onSave = () => {
    const result = toRaw(this.type, this.input)
    if (!result.ok) return
    const detail: SaveDetail = { key: this.key, storage: this.storage, type: this.type, raw: result.raw }
    this.dispatchEvent(new CustomEvent<SaveDetail>('save', { detail, bubbles: true, composed: true }))
  }
}

customElements.define('si-entry-sheet', SiEntrySheet)
