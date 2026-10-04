// SDK behavior harness for workspace tabs; no Hermes DOM or real notes.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace('export default {', 'globalThis.plugin = {')
const panes = new Map()
const visibility = new Map()
const registrations = []
const disposers = []
const saved = new Map()
const opened = []
const closed = []
const atom = id => {
  if (!visibility.has(id)) {
    let visible = false
    const listeners = new Set()
    visibility.set(id, {
      get: () => visible,
      listen(fn) { listeners.add(fn); return () => listeners.delete(fn) },
      set(next) { visible = next; listeners.forEach(fn => fn(next)) },
      listenerCount: () => listeners.size,
    })
  }
  return visibility.get(id)
}
const sandbox = {
  console, TextEncoder, TextDecoder, Uint8Array, URL, atob, btoa,
  setTimeout: () => 1, clearTimeout() {}, setInterval: () => 2, clearInterval() {},
  host: {
    state: {},
    paneVisibility: atom,
    openWorkspace(id, options) {
      opened.push({ id, dock: options.dock })
      panes.set(id, options)
      return () => { closed.push(id); panes.delete(id); atom('plugin-workspace:' + id).set(false); options.onClose() }
    },
  },
  PALETTE_AREA: 'palette',
  COMPOSER_AREAS: { middleware: 'middleware', attachments: 'attachments' },
  Codicon() {}, jsx: () => null, jsxs: () => null,
  useState: value => [value, () => {}], useRef: value => ({ current: value }),
  useEffect() {}, useCallback: fn => fn, useMemo: fn => fn(),
  useTheme: () => ({}), usePluginI18n: () => key => key,
}
sandbox.globalThis = sandbox
vm.runInNewContext(source + `
globalThis.testTabs = {
  open: path => openVaultTab(path),
  active: () => activeVaultTabId,
  count: () => vaultTabs.size,
}`, sandbox)
const ctx = {
  storage: {
    get: (key, fallback) => saved.get(key) ?? fallback,
    set: (key, value) => saved.set(key, value),
  },
  i18n: { register() {}, t: key => key },
  register: entry => registrations.push(entry),
  onDispose: fn => disposers.push(fn),
}
sandbox.plugin.register(ctx)
const toggle = registrations.find(entry => entry.id === 'show-vault-titlebar').data.onSelect
const first = toggle()
assert.equal(first, 'vault-view:workspace')
assert.equal(opened[0].dock.pane, 'workspace', 'first tab uses the SDK workspace dock')
assert.equal(opened[0].dock.pos, 'right')
const second = sandbox.testTabs.open('/synthetic/Second.md')
assert.notEqual(second, first)
assert.equal(opened[1].dock.pane, 'plugin-workspace:' + first, 'new tab anchors only to Vault View')
assert.equal(sandbox.testTabs.count(), 2)
atom('plugin-workspace:' + first).set(true)
assert.equal(sandbox.testTabs.active(), first, 'SDK visibility selects the active Vault View tab')
assert.equal(toggle(), true, 'visible workspace can be hidden')
assert.equal(closed.length, 2, 'hide closes both registered panes')
assert.equal(sandbox.testTabs.count(), 2, 'hide preserves tab metadata')
assert.equal(atom('plugin-workspace:' + first).listenerCount(), 0, 'hide releases visibility listeners')
assert.ok(toggle(), 'hidden workspace can be restored')
assert.equal(sandbox.testTabs.count(), 2, 'restore does not duplicate tabs')
disposers.forEach(fn => fn())
assert.equal(atom('plugin-workspace:' + first).listenerCount(), 0, 'dispose releases visibility listeners')
console.log('Vault View workspace tabs: OK (SDK dock, visibility selection, hide/restore, listener cleanup)')
