import { LitElement, css, html } from 'lit'
import {
  browserStorages,
  buildEntries,
  type Entry,
  type Overrides,
  type SchemaEntry,
  type StorageKind,
  type Storages,
} from '../core'
import './si-launcher'

export type SheetState = { mode: 'edit'; entry: Entry } | { mode: 'add' } | null

export class StorageInspector extends LitElement {
  static properties = {
    schema: { attribute: false },
    isOpen: { state: true },
    tab: { state: true },
    entries: { state: true },
    sheet: { state: true },
    sheetError: { state: true },
  }

  static styles = css`
    :host {
      all: initial;
      font: 14px/1.4 system-ui, -apple-system, sans-serif;
      color: #111;
    }
  `

  schema: SchemaEntry[] = []
  isOpen = false
  tab: StorageKind = 'local'
  entries: Entry[] = []
  sheet: SheetState = null
  sheetError = ''

  protected overrides: Overrides = new Map()
  protected storages: Storages = browserStorages()

  open() {
    this.refresh()
    this.isOpen = true
  }

  close() {
    this.sheet = null
    this.isOpen = false
  }

  protected refresh() {
    this.entries = buildEntries(this.schema, this.overrides, this.storages)
  }

  render() {
    return html`
      <si-launcher @toggle=${this.onToggle}></si-launcher>
      ${this.isOpen ? this.renderPanel() : null}
    `
  }

  protected renderPanel() {
    return html`<div style="position:fixed;inset:0;background:#fff;z-index:2147483001" @click=${this.close}>panel</div>`
  }

  private onToggle = () => {
    this.isOpen ? this.close() : this.open()
  }
}

customElements.define('storage-inspector', StorageInspector)
