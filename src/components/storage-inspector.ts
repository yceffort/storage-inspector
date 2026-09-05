import { LitElement, css, html } from 'lit'
import {
  browserStorages,
  buildEntries,
  removeEntry,
  type Entry,
  type Overrides,
  type SchemaEntry,
  type StorageKind,
  type Storages,
} from '../core'
import './si-launcher'
import './si-panel'

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

  close = () => {
    this.sheet = null
    this.isOpen = false
  }

  protected refresh = () => {
    this.entries = buildEntries(this.schema, this.overrides, this.storages)
  }

  render() {
    return html`
      <si-launcher @toggle=${this.onToggle}></si-launcher>
      ${this.isOpen ? this.renderPanel() : null}
    `
  }

  protected renderPanel() {
    return html`
      <si-panel
        .entries=${this.entries}
        .tab=${this.tab}
        @tab-change=${this.onTabChange}
        @refresh=${this.refresh}
        @add=${this.onAdd}
        @close=${this.close}
        @select=${this.onSelect}
        @remove=${this.onRemove}
      ></si-panel>
    `
  }

  private onToggle = () => {
    this.isOpen ? this.close() : this.open()
  }

  private onTabChange = (ev: CustomEvent<StorageKind>) => {
    this.tab = ev.detail
  }

  private onAdd = () => {
    this.sheet = { mode: 'add' }
    this.sheetError = ''
  }

  private onSelect = (ev: CustomEvent<Entry>) => {
    this.sheet = { mode: 'edit', entry: ev.detail }
    this.sheetError = ''
  }

  private onRemove = (ev: CustomEvent<Entry>) => {
    removeEntry(this.storages, ev.detail)
    this.refresh()
  }
}

customElements.define('storage-inspector', StorageInspector)
