// SDK behavior harness for per-session workspaces; all notes and sessions are synthetic.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace('export default {', 'globalThis.plugin = {')
const scheduled = []
let timerSerial = 0
const later = (fn, delay = 0) => { const task = { id: ++timerSerial, fn, delay, cancelled: false }; scheduled.push(task); return task.id }
const cancel = id => { const task = scheduled.find(entry => entry.id === id); if (task) task.cancelled = true }
const flush = delay => {
  const tasks = scheduled.filter(task => !task.cancelled && task.delay === delay)
  tasks.forEach(task => { task.cancelled = true; task.fn() })
}
const atom = initial => {
  let value = initial
  const listeners = new Set()
  return {
    get: () => value,
    listen(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    set(next) { value = next; listeners.forEach(fn => fn(next)) },
  }
}
const storedSession = atom('a')
const runtimeSession = atom('runtime-a')
const profile = atom('profile')
const panes = new Map()
const visibility = new Map()
const paneAtom = id => {
  if (!visibility.has(id)) visibility.set(id, atom(false))
  return visibility.get(id)
}
const saved = new Map([
  ['vault-view:session-workspaces-enabled', 'on'],
  ['vault-view:restore-tabs', 'on'],
  ['vault-view:workspace-open', 'open'],
  ['vault-view:session-workspaces', {
    version: 1,
    activeWorkspaceKey: 'profile::session:a',
    activeTabId: 'vault-view:tab:a',
    workspaces: {
      'profile::session:a': { open: true, activeTabId: 'vault-view:tab:a', tabs: [{ tabId: 'vault-view:tab:a', path: '/synthetic/A.md', snapshot: { rawContent: 'draft A' } }] },
      'profile::session:b': { open: true, activeTabId: 'vault-view:tab:b', tabs: [{ tabId: 'vault-view:tab:b', path: '/synthetic/B.md', snapshot: { rawContent: 'draft B' } }] },
    },
    pinnedTabs: [{ tabId: 'vault-view:tab:pinned', path: '/synthetic/Pinned.md', workspaceKey: 'profile::session:a', pinned: true, snapshot: { rawContent: 'pinned draft' } }],
  }],
])
const registrations = []
const disposers = []
const sandbox = {
  console, TextEncoder, TextDecoder, Uint8Array, URL, atob, btoa, Promise, Map, Set,
  setTimeout: later, clearTimeout: cancel, setInterval: () => ++timerSerial, clearInterval() {},
  host: {
    state: { focusedStoredSessionId: storedSession, focusedSessionId: runtimeSession, focusedSessionProfile: profile },
    paneVisibility: paneAtom,
    openWorkspace(id, options) {
      assert.equal(typeof options.render, 'function', 'restored session tabs must register a render function')
      panes.set(id, options)
      return () => { panes.delete(id); paneAtom('plugin-workspace:' + id).set(false); options.onClose() }
    },
  },
  PALETTE_AREA: 'palette', COMPOSER_AREAS: { middleware: 'middleware', attachments: 'attachments' },
  Codicon() {}, jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
  useState: value => [typeof value === 'function' ? value() : value, () => {}], useRef: value => ({ current: value }), useEffect() {}, useCallback: fn => fn, useMemo: fn => fn(),
  useTheme: () => ({}), usePluginI18n: () => key => key,
}
sandbox.globalThis = sandbox
vm.runInNewContext(source + `
globalThis.testSessions = {
  open: path => openVaultTab(path),
  mode: enabled => changeWorkspaceModeRuntime(enabled),
  activeKey: () => activeWorkspaceKey,
  tabs: () => Array.from(vaultTabs.values()).map(tab => ({ id: tab.tabId, workspaceKey: tab.workspaceKey, pinned: tab.pinned, suspended: tab.suspended, draft: tab.snapshot && tab.snapshot.rawContent })),
}`, sandbox)
const ctx = {
  storage: { get: (key, fallback) => saved.get(key) ?? fallback, set: (key, value) => saved.set(key, value) },
  i18n: { register() {}, t: key => key }, register: entry => registrations.push(entry), onDispose: fn => disposers.push(fn),
}

;(async () => {
  sandbox.plugin.register(ctx)
  flush(0)
  await Promise.resolve(); await Promise.resolve()
  assert.deepEqual(Array.from(panes.keys()).sort(), ['vault-view:tab:a', 'vault-view:tab:pinned'], 'startup restores only session A plus pinned tabs')
  assert.equal(sandbox.testSessions.tabs().find(tab => tab.id === 'vault-view:tab:a').draft, 'draft A')
  const titlebarContribution = registrations.find(entry => entry.id === 'show-vault-titlebar')
  assert.equal(titlebarContribution.area, 'titleBar.right')
  const titlebarElement = titlebarContribution.render()
  const titlebarButton = titlebarElement.type(titlebarElement.props)
  const toggle = () => titlebarButton.props.onClick({ stopPropagation() {} })
  assert.equal(toggle(), true, 'titlebar button masks the active session workspace')
  assert.deepEqual(Array.from(panes.keys()), [], 'masking removes the visual panes without deleting their tab state')
  assert.equal(saved.get('vault-view:session-workspaces').workspaces['profile::session:a'].open, false, 'masked state is persisted for session A')
  assert.ok(toggle(), 'titlebar button restores the active session workspace')
  assert.deepEqual(Array.from(panes.keys()).sort(), ['vault-view:tab:a', 'vault-view:tab:pinned'])
  assert.equal(saved.get('vault-view:session-workspaces').workspaces['profile::session:a'].open, true, 'restored state is persisted for session A')

  storedSession.set('b'); flush(150)
  assert.deepEqual(Array.from(panes.keys()).sort(), ['vault-view:tab:b', 'vault-view:tab:pinned'], 'switching to B suspends A and restores B plus pinned tabs')
  panes.get('vault-view:tab:b').onClose()
  panes.delete('vault-view:tab:b')
  storedSession.set('a'); flush(150)
  storedSession.set('b'); flush(150)
  assert.deepEqual(Array.from(panes.keys()), [], 'an explicitly closed B workspace stays fully masked on return, including pinned tabs')

  storedSession.set(null); runtimeSession.set('new-chat'); flush(150)
  const provisionalId = sandbox.testSessions.open('/synthetic/New.md')
  assert.match(sandbox.testSessions.activeKey(), /::runtime:new-chat$/)
  storedSession.set('durable-chat'); flush(150)
  const promoted = sandbox.testSessions.tabs().find(tab => tab.id === provisionalId)
  assert.equal(promoted.workspaceKey, 'profile::session:durable-chat', 'provisional workspace migrates to the durable id without replacing its tab')

  sandbox.testSessions.mode(false)
  assert.equal(saved.get('vault-view:session-workspaces-enabled'), 'off')
  assert.equal(sandbox.testSessions.tabs().find(tab => tab.id === provisionalId).workspaceKey, 'global', 'disabling merges the current visible workspace into global state')
  sandbox.testSessions.mode(true)
  assert.equal(saved.get('vault-view:session-workspaces-enabled'), 'on')
  assert.equal(sandbox.testSessions.tabs().find(tab => tab.id === provisionalId).workspaceKey, 'profile::session:durable-chat', 're-enabling attaches visible global tabs to the current session')
  assert.equal(sandbox.testSessions.tabs().filter(tab => tab.pinned).length, 1, 'pinned tabs remain a separate global set')

  disposers.forEach(fn => fn())
  console.log('Vault View session workspaces: OK (isolation, closed state, provisional migration, mode toggle, pinned drafts)')
})().catch(error => { console.error(error); process.exitCode = 1 })
