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
const revealed = []
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
    revealPane(id) {
      revealed.push(id)
      atom(id).set(true)
    },
    openWorkspace(id, options) {
      assert.equal(typeof options.render, 'function', 'every restored or existing workspace registration requires a render function')
      opened.push({ id, dock: options.dock })
      panes.set(id, options)
      return () => { closed.push(id); panes.delete(id); atom('plugin-workspace:' + id).set(false); options.onClose() }
    },
  },
  PALETTE_AREA: 'palette',
  vaultTranscriptSdk: { TRANSCRIPT_DIRECTIVE_AREA: 'transcript.directives' },
  COMPOSER_AREAS: { middleware: 'middleware', attachments: 'attachments' },
  Codicon() {}, jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
  useState: value => [typeof value === 'function' ? value() : value, () => {}], useRef: value => ({ current: value }),
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
const titlebarContribution = registrations.find(entry => entry.id === 'show-vault-titlebar')
assert.equal(titlebarContribution.area, 'titleBar.right', 'the toggle uses the public interactive titlebar slot')
const titlebarElement = titlebarContribution.render()
const titlebarButton = titlebarElement.type(titlebarElement.props)
const toggle = () => titlebarButton.props.onClick({ stopPropagation() {} })
assert.equal(titlebarButton.props.style.order, -1000, 'CSS ordering moves the interactive control before native titlebar actions')
assert.equal(titlebarButton.props['aria-pressed'], false, 'titlebar shortcut starts inactive while Vault View is hidden')
const first = toggle()
assert.match(first, /^vault-view:(?:workspace|tab:[a-z0-9-]+)$/)
assert.equal(opened[0].dock.pane, 'workspace', 'first tab uses the SDK workspace dock')
assert.equal(opened[0].dock.pos, 'right')
assert.equal(toggle(), true, 'a registered Vault View pane is masked without relying on visibility heuristics')
assert.equal(closed.length, 1)
assert.equal(sandbox.testTabs.count(), 1, 'masking preserves tab metadata')
assert.equal(toggle(), first, 'the same masked workspace can be restored')
const second = sandbox.testTabs.open('/synthetic/Second.md')
assert.notEqual(second, first)
assert.equal(opened[2].dock.pane, 'plugin-workspace:' + first, 'new tab anchors only to Vault View')
assert.equal(sandbox.testTabs.count(), 2)
assert.equal(sandbox.testTabs.open('/synthetic/Second.md'), second, 'opening the same note focuses its existing tab')
assert.equal(opened.length, 3, 'reopening the same note does not register a duplicate pane')
atom('plugin-workspace:' + first).set(true)
assert.equal(sandbox.testTabs.active(), first, 'SDK visibility selects the active Vault View tab')
assert.equal(toggle(), true, 'visible workspace can be hidden')
assert.equal(closed.length, 3, 'each mask operation retires every currently registered Vault View pane')
assert.equal(sandbox.testTabs.count(), 2, 'hide preserves tab metadata')
assert.equal(atom('plugin-workspace:' + first).listenerCount(), 0, 'hide releases visibility listeners')
assert.ok(toggle(), 'hidden workspace can be restored')
assert.equal(sandbox.testTabs.count(), 2, 'restore does not duplicate tabs')
assert.equal(opened[3].dock.pane, 'workspace', 'the first restored pane anchors beside the conversation, not a suspended Vault View pane')
assert.equal(opened[3].dock.pos, 'right')
assert.equal(opened[4].dock.pane, 'plugin-workspace:' + opened[3].id, 'the next restored pane joins the registered Vault View group')
assert.equal(typeof panes.get(opened[4].id).render().props.onHide, 'function', 'the note pane offers a hide action')
assert.equal(panes.get(opened[4].id).render().props.onHide(), true, 'hiding from a note pane retires the workspace')
assert.equal(sandbox.testTabs.count(), 2, 'the note hide action preserves open tabs and drafts')
assert.ok(toggle(), 'the note pane can be restored after hiding')
const directive = registrations.find(entry => entry.area === 'transcript.directives' && entry.data?.name === 'vault-note')
const renderCard = relative => { const element = directive.data.render({ attrs: { vault: 'synthetic', path: relative }, vaultPath: '/synthetic', sessionId: 'chat-a', streaming: false }); return element.type(element.props) }
assert.equal(renderCard('Missing.md').props.children[3].props.children, 'transcriptOpenNote', 'a closed note shows Open in Vault View')
const card = renderCard('Second.md')
assert.equal(card.props.children.length, 4, 'the card has one note action beside Download')
const hideButton = card.props.children[3]
assert.equal(hideButton.props.children, 'hideNote', 'Hide note replaces Open while the note is open')
assert.equal(hideButton.props.onClick(), false, 'a card from another conversation cannot hide the workspace')
assert.equal(sandbox.testTabs.count(), 2)
sandbox.host.state.focusedStoredSessionId = { get: () => 'chat-a' }
assert.equal(hideButton.props.onClick(), true, 'the deep-link card hides Vault View when its conversation is focused')
assert.equal(sandbox.testTabs.count(), 2, 'the card hide action preserves tabs')
assert.equal(renderCard('Second.md').props.children[3].props.children, 'transcriptOpenNote', 'Open replaces Hide note when its tab is masked')
disposers.forEach(fn => fn())
assert.equal(atom('plugin-workspace:' + first).listenerCount(), 0, 'dispose releases visibility listeners')
console.log('Vault View workspace tabs: OK (SDK dock, visibility selection, hide/restore, listener cleanup)')
