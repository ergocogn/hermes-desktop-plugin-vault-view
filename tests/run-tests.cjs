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
  ID, VERSION, attachVaultCapabilitiesToDraft, compactVaultContext, detectConfiguredVaultPath, findAgentNoteMatches, installVaultContextPresentation, isVaultRelevantRequest, validDetectedPath,
  setRuntime: function(ctx, session) { pluginCtx = ctx; vaultSessionContext = session }
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
assert.equal(api.ID, 'vault-view')
assert.equal(api.VERSION, '0.4.3')
assert.equal(api.validDetectedPath('/vault/'), '/vault')
assert.equal(api.validDetectedPath('/vault\nsecret'), '')

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
assert.match(wrapped.attachments[0].refText, /^<ide_opened_file>/)
assert.match(wrapped.attachments[0].refText, /<\/ide_opened_file>$/)
assert.match(wrapped.attachments[0].refText, /:command\[Vault View\]/)

const opening = { nodeType: 3, textContent: '<ide_opened_file>\n' }
const closing = { nodeType: 3, textContent: '\n</ide_opened_file>' }
const chip = { nodeType: 1, childNodes: [], matches: function(selector) { return selector.includes('aui_directive-chip') } }
const attributes = new Set()
const wrapper = {
  nodeType: 1,
  childNodes: [opening, chip, closing],
  parentElement: null,
  matches: function(selector) { return selector.includes('aui_directive-text') },
  closest: function(selector) { return this.matches(selector) ? this : null },
  querySelector: function() { return chip },
  querySelectorAll: function() { return [] },
  setAttribute: function(name) { attributes.add(name) },
  hasAttribute: function(name) { return attributes.has(name) },
  removeAttribute: function(name) { attributes.delete(name) },
  isConnected: true,
}
const body = {
  nodeType: 1,
  childNodes: [wrapper],
  parentElement: null,
  closest: function() { return null },
  querySelector: function() { return chip },
  querySelectorAll: function() { return [wrapper] },
}
wrapper.parentElement = body
sandbox.document = { body }
sandbox.MutationObserver = class MutationObserver {
  constructor(callback) { this.callback = callback }
  observe() {}
  disconnect() {}
}
const uninstallPresentation = api.installVaultContextPresentation()
assert.equal(opening.textContent, '')
assert.equal(closing.textContent, '')
assert.equal(attributes.has('data-vault-context-envelope'), true)
uninstallPresentation()

const pluginSource = fs.readFileSync(pluginPath, 'utf8')
assert.doesNotMatch(pluginSource, /(?:[A-Za-z]:\\Users\\|\/home\/)[^/\\\s]+[\\/]/)
assert.doesNotMatch(pluginSource, /window\.hermesDesktop/)
assert.match(pluginSource, /const VAULT_ENV_KEY = 'WIKI_PATH'/)
assert.match(pluginSource, /ctx\.i18n\.register\(LOCALES\)/)
assert.match(pluginSource, /onSelect: toggleVaultWorkspace/)
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
  assert.match(results[1].attachments[0].refText, /à la place de preview/)
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
  console.log('Vault View tests: OK')
}).catch(function(error) {
  console.error(error)
  process.exitCode = 1
})
