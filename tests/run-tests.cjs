const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pluginPath = path.join(__dirname, '..', 'plugin.js')
let source = fs.readFileSync(pluginPath, 'utf8')
source = source.replace(/^import .*$/gm, '')
source = source.replace(
  '\nexport default {',
  `
globalThis.__vaultViewTest = {
  ID, VERSION, attachVaultCapabilitiesToDraft, compactVaultContext, detectConfiguredVaultPath, filterVaultNotes, findAgentNoteMatches, isVaultRelevantRequest, validDetectedPath,
  formatSelectionQuote, insertSelectionQuote, focusedWorkspaceIdentity, validStoredTab, serializeVaultTab, resolveVaultActivePath,
  setRuntime: function(ctx, session) { pluginCtx = ctx; vaultSessionContext = session },
  setWorkspaceModel: function(enabled, key, tabs) {
    sessionWorkspacesEnabled = enabled
    activeWorkspaceKey = key
    vaultTabs.clear()
    tabs.forEach(function(tab) { vaultTabs.set(tab.tabId, tab) })
  },
  visibleTabIds: function() { return Array.from(vaultTabs.values()).filter(function(tab) { return tabIsVisibleInWorkspace(tab) }).map(function(tab) { return tab.tabId }) }
}
globalThis.__vaultViewPlugin = {`
)

const sandbox = {
  console,
  TextDecoder,
  TextEncoder,
  URL,
  Uint8Array,
  Map,
  Set,
  Promise,
  Date,
  Math,
  JSON,
  RegExp,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Error,
  encodeURI,
  encodeURIComponent,
  decodeURIComponent,
  atob,
  btoa,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  host: {},
  PALETTE_AREA: 'palette',
  COMPOSER_AREAS: { middleware: 'middleware', underside: 'underside', attachments: 'attachments' },
  Codicon: function Codicon() {},
  jsx: function jsx() { return null },
  jsxs: function jsxs() { return null },
  useState: function useState(initial) { return [initial, function() {}] },
  useEffect: function useEffect() {},
  useCallback: function useCallback(fn) { return fn },
  useMemo: function useMemo(fn) { return fn() },
  useRef: function useRef(value) { return { current: value } },
  useTheme: function useTheme() { return {} },
  usePluginI18n: function usePluginI18n() { return function(key) { return key } },
}
sandbox.globalThis = sandbox
vm.runInNewContext(source, sandbox, { filename: pluginPath })

const api = sandbox.__vaultViewTest
const tagFiles = ['/vault/Inline.md', '/vault/Yaml.md', '/vault/Nested.md', '/vault/Other.md', '/vault/Project filename.md', '/vault/Pending.md']
const tagContents = new Map([
  [tagFiles[0], 'Text #Project'],
  [tagFiles[1], '---\ntags: [project]\n---\nBody'],
  [tagFiles[2], 'Text #project/phase-one'],
  [tagFiles[3], 'Text #projectile'],
  [tagFiles[4], 'No matching tag'],
])
assert.deepEqual(Array.from(api.filterVaultNotes(tagFiles, '/vault', '#PROJECT', tagContents)), tagFiles.slice(0, 3), 'tag search covers inline/YAML/nested tags, without matching prefixes or filenames')
assert.deepEqual(Array.from(api.filterVaultNotes(tagFiles, '/vault', '#project/phase-one', tagContents)), [tagFiles[2]])
assert.deepEqual(Array.from(api.filterVaultNotes(tagFiles, '/vault', '#missing', tagContents)), [])
assert.deepEqual(Array.from(api.filterVaultNotes(tagFiles, '/vault', 'project filename', tagContents)), [tagFiles[4]], 'ordinary filename search still works')
assert.equal(api.ID, 'vault-view')
assert.equal(api.VERSION, '0.5.0')
assert.equal(api.validDetectedPath('/vault/'), '/vault')
assert.equal(api.validDetectedPath('/vault\nsecret'), '')

assert.equal(api.formatSelectionQuote('Simple passage'), '> Simple passage')
assert.equal(api.formatSelectionQuote('\r\nFirst\r\n\r\nSecond\r\n'), '> First\n>\n> Second', 'quotes normalize line endings and preserve internal blank lines')
assert.equal(api.formatSelectionQuote('First\n  \nSecond'), '> First\n>\n> Second', 'whitespace-only internal lines become empty quote lines')
assert.equal(api.formatSelectionQuote('\n \t\n'), '', 'blank selections are refused')
assert.equal(api.resolveVaultActivePath('', ['/vault/Vaultmap.md', '/vault/Z.md'], true), '', 'an intentionally empty session workspace stays empty')
assert.equal(api.resolveVaultActivePath('', ['/vault/Vaultmap.md', '/vault/Z.md'], false), '/vault/Vaultmap.md', 'global mode keeps its historical first-note fallback')
assert.equal(api.resolveVaultActivePath('/vault/Z.md', ['/vault/Vaultmap.md', '/vault/Z.md'], true), '/vault/Z.md', 'an existing session note remains selected')
const atom = value => ({ get: () => value })
assert.equal(api.focusedWorkspaceIdentity({ focusedSessionProfile: atom('work'), focusedSessionId: atom('draft-1') }), 'work::runtime:draft-1', 'new chats use a distinct provisional workspace')
assert.equal(api.focusedWorkspaceIdentity({ focusedSessionProfile: atom('work'), focusedStoredSessionId: atom('saved-1'), focusedSessionId: atom('draft-1') }), 'work::session:saved-1', 'durable session identity replaces the provisional key')
assert.equal(api.validStoredTab({ tabId: 'foreign', path: '/vault/A.md' }), null, 'foreign tab ids are ignored during migration')
const restoredTab = api.validStoredTab({ tabId: 'vault-view:tab:one', path: '/vault/A.md', workspaceKey: 'profile::session-a', pinned: true, snapshot: { rawContent: 'draft' } })
assert.equal(restoredTab.pinned, true)
assert.equal(restoredTab.snapshot.rawContent, 'draft', 'draft snapshots survive storage migration')
api.setWorkspaceModel(true, 'profile::session-a', [
  { tabId: 'vault-view:tab:a', workspaceKey: 'profile::session-a', pinned: false },
  { tabId: 'vault-view:tab:b', workspaceKey: 'profile::session-b', pinned: false },
  { tabId: 'vault-view:tab:p1', workspaceKey: 'profile::session-b', pinned: true },
  { tabId: 'vault-view:tab:p2', workspaceKey: 'profile::session-a', pinned: true },
])
assert.deepEqual(Array.from(api.visibleTabIds()), ['vault-view:tab:a', 'vault-view:tab:p1', 'vault-view:tab:p2'], 'session workspaces isolate local tabs and retain multiple pinned tabs')
api.setWorkspaceModel(false, 'profile::session-b', [
  { tabId: 'vault-view:tab:global', workspaceKey: 'global', pinned: false },
  { tabId: 'vault-view:tab:parked', workspaceKey: 'profile::session-a', pinned: false },
  { tabId: 'vault-view:tab:pinned', workspaceKey: 'profile::session-a', pinned: true },
])
assert.deepEqual(Array.from(api.visibleTabIds()), ['vault-view:tab:global', 'vault-view:tab:pinned'], 'global mode does not surface parked session tabs')

const root = '/vault'
const files = [
  '/vault/Projects/Alpha.md',
  '/vault/Archive/Alpha.md',
  '/vault/Projects/Beta Note.md',
  '/vault/Unicode/Été.md',
]

assert.deepEqual(Array.from(api.findAgentNoteMatches('Projects/Beta Note.md', files, root)), ['/vault/Projects/Beta Note.md'])
assert.deepEqual(Array.from(api.findAgentNoteMatches('Été', files, root)), ['/vault/Unicode/Été.md'])
assert.deepEqual(Array.from(api.findAgentNoteMatches('Alpha', files, root)), ['/vault/Projects/Alpha.md', '/vault/Archive/Alpha.md'])
assert.deepEqual(Array.from(api.findAgentNoteMatches('Bet', files, root)), [])
assert.deepEqual(Array.from(api.findAgentNoteMatches('/vault/Projects/Alpha.md', files, root)), ['/vault/Projects/Alpha.md'])

api.setRuntime(null, { activePath: '', shareWithAgent: false })
assert.equal(api.isVaultRelevantRequest('Peux-tu reformater ce fichier Markdown ?', root), false)
assert.equal(api.isVaultRelevantRequest('Ouvre ma note de réunion générique', root), false)
assert.equal(api.isVaultRelevantRequest('Affiche cette note dans Obsidian', root), true)
assert.equal(api.isVaultRelevantRequest('Ouvre Vault View', root), true)

api.setRuntime(null, { activePath: '/vault/Projects/Beta Note.md', shareWithAgent: false })
assert.equal(api.isVaultRelevantRequest('Affiche cette note', root), true)
assert.equal(api.isVaultRelevantRequest('Montre Beta Note', root), true)

const wrapped = api.compactVaultContext({
  text: 'Affiche cette note dans Obsidian',
  attachments: [{ id: 'vault-view:capabilities', label: 'Vault View', refText: 'Contexte compact' }],
})
assert.doesNotMatch(wrapped.attachments[0].refText, /ide_opened_file/)
assert.match(wrapped.attachments[0].refText, /:command\[Vault View\]/)
assert.doesNotMatch(source, /data-vault-context-envelope|aui_directive-text|preview-tile:/)

const pluginSource = fs.readFileSync(pluginPath, 'utf8')
assert.doesNotMatch(pluginSource, /(?:[A-Za-z]:\\Users\\|\/home\/)[^/\\\s]+[\\/]/)
assert.doesNotMatch(pluginSource, /window\.hermesDesktop/)
assert.match(pluginSource, /const VAULT_ENV_KEY = 'WIKI_PATH'/)
assert.match(pluginSource, /ctx\.i18n\.register\(LOCALES\)/)
assert.match(pluginSource, /area: 'titleBar\.right'[\s\S]*?VaultTitlebarToggle/)
assert.match(pluginSource, /WebkitAppRegion: 'no-drag', order: -1000/)
assert.match(pluginSource, /font-family:var\(--dt-font-sans,var\(--theme-font-sans/)
assert.match(pluginSource, /border-radius:var\(--radius-md,5px\)/)
assert.match(pluginSource, /background:var\(--ui-control-hover-background/)
assert.match(pluginSource, /box-shadow:var\(--shadow-md/)
assert.match(pluginSource, /className: 'ov-button ov-primary-button'[\s\S]*?name: 'new-file'/)
assert.match(pluginSource, /onClick: openEmptyCreate, 'aria-expanded': emptyCreateOpen/)
assert.match(pluginSource, /className: 'ov-empty-create-form', onSubmit: submitEmptyCreate/)
assert.match(pluginSource, /const created = await createNoteFromRequestedPath\(emptyCreateName\)/)
assert.doesNotMatch(pluginSource, /workspaceOptions\.title = title[\s\S]*?host\.openWorkspace\(tabId, workspaceOptions\)/)
assert.match(pluginSource, /className: 'ov-toolbar-group', children: \[useSessionWorkspaces \? jsx\('button', \{[\s\S]*?ov-pin-button[\s\S]*?name: 'layout-sidebar-left'[\s\S]*?name: 'arrow-left'/)
assert.match(pluginSource, /className: 'ov-button ov-icon-button' \+ \(editMode \? ' ov-toolbar-active' : ''\)[\s\S]*?'aria-pressed': editMode,[\s\S]*?name: 'edit'/)
assert.doesNotMatch(pluginSource, /name: editMode \? 'book' : 'edit'/)
assert.match(pluginSource, /onContextMenuCapture: function\(event\)[\s\S]*?setSelectionMenu\(/)
assert.match(pluginSource, /selectionMenu\.text\)\) setSelectionMenu\(null\)[\s\S]*?t\('quoteSelection'\)/)
assert.match(pluginSource, /const vaultWasVisible = !workspaceHidden && isVaultWorkspaceVisible\(\)/)
assert.match(pluginSource, /!tabs\.length && vaultWasVisible && workspaceOpenState\.get\(nextKey\) !== false/)
assert.match(pluginSource, /host\.paneVisibility\('plugin-workspace:' \+ tabId\)/)
assert.match(pluginSource, /function hideVaultWorkspace\(\)/)
assert.match(pluginSource, /tab\.suspended = true/)
assert.match(pluginSource, /function restoreVaultWorkspace\(\)/)
assert.doesNotMatch(pluginSource, /host\.openSession\(returnSessionId\)/)
assert.match(pluginSource, /className: 'ov-source-read', onDoubleClick:/)
assert.match(pluginSource, /onDoubleClick: function\(event\)/)
assert.match(pluginSource, /navigateHistory\(-1\)/)
assert.match(pluginSource, /navigateHistory\(1\)/)
assert.match(pluginSource, /vaultName \+ ' · ' \+ stats/)
assert.doesNotMatch(pluginSource, /(?:cat|sed|grep)[^\n]*\/home\/[^\n]*\.env/)
assert.doesNotMatch(pluginSource, /console\.error\([^\n]*(?:activePath|task\.file|cleanPath)/)
assert.match(pluginSource, /for \(let index = command\.paths\.length - 1; index >= 0; index -= 1\)/)
assert.match(pluginSource, /Après une modification, laisse l’actualisation automatique agir/)
assert.doesNotMatch(pluginSource, /command: 'obsidian'/)
assert.match(pluginSource, /Do not assume that an executable named "obsidian" exists/)
assert.match(pluginSource, /Do not silently replace it with generic file tools/)

api.setRuntime({
  storage: {
    get: function(key, fallback) {
      if (key.endsWith(':vault-path')) return '/vault'
      if (key.endsWith(':agent-guidance')) return 'on'
      if (key.endsWith(':agent-context')) return 'off'
      return fallback
    },
  },
}, { activePath: '', shareWithAgent: false })

const detectionCommands = []
sandbox.host.request = async function(method, payload) {
  assert.equal(method, 'shell.exec')
  detectionCommands.push(payload.command)
  return { result: { code: 0, stdout: payload.command.includes("printf 'valid'") ? 'valid' : '/vault\n', stderr: '' } }
}

Promise.all([
  api.attachVaultCapabilitiesToDraft({ text: 'Explique ce fichier Markdown', attachments: [] }),
  api.attachVaultCapabilitiesToDraft({ text: 'Affiche Alpha dans Obsidian', attachments: [] }),
  api.detectConfiguredVaultPath(),
]).then(async function(results) {
  assert.equal(results[0].attachments.length, 0)
  assert.equal(results[1].attachments.length, 1)
  assert.ok(results[1].attachments[0].refText.length < 2500, 'agent pointer should stay compact')
  assert.match(results[1].attachments[0].refText, /Obsidian CLI/)
  assert.match(results[1].attachments[0].refText, /instead of preview/)
  assert.doesNotMatch(results[1].attachments[0].refText, /\/vault(?:\/|\b)/)
  assert.equal(results[2], '/vault')
  assert.equal(detectionCommands.length, 2)
  assert.match(detectionCommands[0], /WIKI_PATH/)
  assert.match(detectionCommands[0], /candidate%\/\*/)
  assert.doesNotMatch(detectionCommands.join('\n'), /\.env/)
  api.setRuntime({
    storage: {
      get: function(key, fallback) {
        if (key.endsWith(':vault-path')) return '/vault'
        if (key.endsWith(':agent-guidance')) return 'on'
      if (key.endsWith(':agent-context')) return 'on'
        return fallback
      },
    },
  }, {
    tabId: 'vault-view:workspace', vaultPath: '/vault', activePath: '/vault/Projects/Beta Note.md',
    content: 'Private body', outgoingLinks: [], backlinks: [], tags: [], dirty: false, shareWithAgent: true,
  })
  const shared = await api.attachVaultCapabilitiesToDraft({ text: 'Affiche cette note dans Obsidian', attachments: [] })
  const sharedText = shared.attachments.map(function(item) { return item.refText || '' }).join('\n')
  assert.match(sharedText, /Projects\/Beta Note\.md/)
  assert.doesNotMatch(sharedText, /\/vault(?:\/|\b)/)
  assert.doesNotMatch(sharedText, /Private body/)
  api.setRuntime({ storage: { get(key) { return key.endsWith(':vault-path') ? '/vault' : key.endsWith(':agent-guidance') ? 'on' : 'off' } } }, { vaultPath: '/vault', activePath: '/vault/Projects/Beta Note.md', shareWithAgent: false })
  const unshared = await api.attachVaultCapabilitiesToDraft({ ...shared, text: 'Affiche cette note dans Obsidian' })
  assert.equal(unshared.attachments.some(item => item.id.startsWith('vault-view:agent-context:')), false, 'disabling sharing removes previously attached note metadata')
  const repeated = await api.attachVaultCapabilitiesToDraft(unshared)
  assert.equal(repeated.attachments.length, 1, 'repeated enrichment does not accumulate context')
  assert.equal((await api.attachVaultCapabilitiesToDraft({ text: 'Bonjour, parlons météo', attachments: [] })).attachments.length, 0, 'unrelated prompts spend no Vault View context')
  const inserted = []
  const quoteState = { focusedSessionId: { get: () => 'active-runtime' }, focusedStoredSessionId: { get: () => 'note-owner-session' } }
  assert.equal(await api.insertSelectionQuote('Selected\n\npassage', quoteState, { insertText: async function(...args) { inserted.push(args); return true } }), true)
  assert.equal(inserted[0][0], 'active-runtime', 'a pinned note still targets the currently active conversation')
  assert.equal(inserted[0][1], '> Selected\n>\n> passage')
  assert.equal(inserted[0][2].mode, 'block')
  assert.equal(await api.insertSelectionQuote('Selected', quoteState, { insertText: async function() { return false } }), false, 'a missing composer surface is reported without mutating stored state')
  console.log('Vault View tests: OK')
}).catch(function(error) {
  console.error(error)
  process.exitCode = 1
})
