import { LitElement, css, html } from 'lit'
import {
  browserStorages,
  buildEntries,
  overrideKey,
  removeEntry,
  writeEntry,
  type Entry,
  type Overrides,
  type SchemaEntry,
  type StorageKind,
  type Storages,
} from '../core'
import { themeStyles } from './theme'
import './si-launcher'
import './si-panel'
import './si-entry-sheet'
import type { SaveDetail } from './si-entry-sheet'

export type Theme = 'light' | 'dark'

export type SheetState = { mode: 'edit'; entry: Entry } | { mode: 'add' } | null

export class StorageInspector extends LitElement {
  static properties = {
    schema: { attribute: false },
    theme: { reflect: true },
    bottomOffset: { attribute: 'bottom-offset', type: Number, reflect: true },
    isOpen: { state: true },
    tab: { state: true },
    entries: { state: true },
    sheet: { state: true },
    sheetError: { state: true },
  }

  static styles = [
    themeStyles,
    css`
      :host {
        all: initial;
        font: 14px/1.4 system-ui, -apple-system, sans-serif;
        color: var(--si-fg);
      }
    `,
  ]

  schema: SchemaEntry[] = []
  theme: Theme | null = null
  bottomOffset = 0
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

  protected updated(changed: Map<PropertyKey, unknown>) {
    if (changed.has('bottomOffset')) {
      this.style.setProperty('--si-bottom-offset', `${this.bottomOffset}px`)
    }
  }

  protected refresh = () => {
    this.entries = buildEntries(this.schema, this.overrides, this.storages)
  }

  render() {
    return html`
      <si-launcher @toggle=${this.onToggle}></si-launcher>
      ${this.isOpen ? this.renderPanel() : null}
      ${this.isOpen && this.sheet ? this.renderSheet() : null}
    `
  }

  protected renderSheet() {
    const s = this.sheet!
    const existingKeys = this.entries.filter((e) => e.raw !== null).map((e) => overrideKey(e.storage, e.key))
    return html`
      <si-entry-sheet
        .mode=${s.mode}
        .entry=${s.mode === 'edit' ? s.entry : undefined}
        .tab=${this.tab}
        .existingKeys=${existingKeys}
        .error=${this.sheetError}
        @save=${this.onSave}
        @cancel=${this.onCancel}
        @click=${this.onCancel}
      ></si-entry-sheet>
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

  private onSave = (ev: CustomEvent<SaveDetail>) => {
    const { key, storage, type, raw } = ev.detail
    this.overrides.set(overrideKey(storage, key), type)
    try {
      writeEntry(this.storages, { key, storage, raw })
    } catch (e) {
      this.sheetError = (e as Error).message
      return
    }
    this.sheet = null
    this.sheetError = ''
    this.refresh()
  }

  private onCancel = () => {
    this.sheet = null
    this.sheetError = ''
  }
}

customElements.define('storage-inspector', StorageInspector)
