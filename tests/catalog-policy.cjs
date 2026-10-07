const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
let settings = new Map()
let locale = 'en'
const frame = function SandboxedFrame() {}
const sandbox = {
  console, TextEncoder, TextDecoder, Uint8Array, URL, btoa, atob,
  host: { request: async () => ({ error: 'synthetic failure' }) },
  jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
  useState: value => [value, () => {}], useRef: value => ({ current: value }),
  useEffect() {}, useCallback: fn => fn,
  usePluginI18n: () => (key, ...args) => sandbox.api.translate(locale, key, args),
  Codicon() {}, SandboxedFrame: frame,
}
vm.runInNewContext(source.replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {') + `
globalThis.api = {
  bundles: LOCALES, translate: translateLocalBundle, t, setVaultUiLanguage,
  renderImage, setPrivacyPreference, attachVaultCapabilitiesToDraft, EmbeddedBrowserPane, shellExec,
  configure() {
    pluginCtx = { storage: { get: (key, fallback) => settings.get(key) ?? fallback, set: (key, value) => settings.set(key, value) } };
    vaultSessionContext = { vaultPath: '/vault', activePath: '/vault/Note.md', shareWithAgent: true, dirty: false };
    runtimeI18n = { t: (key, ...args) => translateLocalBundle(locale(), key, args) };
  }
}`, Object.assign(sandbox, { settings, locale: () => locale }))
const api = sandbox.api
api.configure()
;(async () => {
  assert.deepEqual(Object.keys(api.bundles.en).sort(), Object.keys(api.bundles.fr).sort(), 'complete matching locale bundles')
  assert.equal(api.t('messageCouldNotReadTheNote'), 'Could not read the note')
  assert.equal(api.t('copyCode'), 'Copy code')
  assert.equal(api.t('quote'), 'Quote')
  assert.equal(api.t('quoteSelection'), 'Quote selection in the conversation')
  assert.equal(api.t('imagePlaceholderPath'), 'path/image.png')
  assert.equal(api.t('messageVaultLabel'), 'Vault: ')
  locale = 'fr'
  assert.equal(api.t('messageCouldNotReadTheNote'), 'Impossible de lire la note', 'auto follows Hermes locale at call time')
  assert.equal(api.t('copyCode'), 'Copier le code')
  assert.equal(api.t('quote'), 'Citation')
  assert.equal(api.t('quoteSelection'), 'Citer la sélection dans la conversation')
  assert.equal(api.t('imagePlaceholderPath'), 'chemin/image.png')
  assert.equal(api.t('messageVaultLabel'), 'Vault : ')
  api.setVaultUiLanguage('en', false)
  assert.equal(api.t('messageCouldNotReadTheNote'), 'Could not read the note', 'manual locale wins')
  assert.equal(api.t('imagePlaceholderPath'), 'path/image.png')
  api.setVaultUiLanguage('auto', false)
  await assert.rejects(api.shellExec('synthetic'), /La requête shell a échoué/)
  const draft = { text: 'Open Note in Obsidian', attachments: [{ id: 'user-file', refText: 'user reference' }] }
  settings.set('vault-view:vault-path', '/vault')
  assert.strictEqual(await api.attachVaultCapabilitiesToDraft(draft), draft, 'guidance and sharing are off by default')
  settings.set('vault-view:agent-guidance', 'on')
  let result = await api.attachVaultCapabilitiesToDraft(draft)
  assert.equal(result.attachments.length, 2)
  assert.match(result.attachments[0].refText, /affichage utilisateur/)
  locale = 'en'
  result = await api.attachVaultCapabilitiesToDraft(draft)
  assert.match(result.attachments[0].refText, /user display/)
  assert.doesNotMatch(result.attachments[0].refText, /affichage utilisateur/)
  settings.set('vault-view:agent-guidance', 'off')
  result = await api.attachVaultCapabilitiesToDraft(result)
  assert.deepEqual(Array.from(result.attachments, a => a.id), ['user-file'], 'opt-out removes stale guidance and keeps user attachments')
  settings.set('vault-view:agent-context', 'on')
  result = await api.attachVaultCapabilitiesToDraft(draft)
  assert.match(result.attachments[0].refText, /Note.md/)
  assert.doesNotMatch(result.attachments[0].refText, /Use the configured|Use Vault View|display protocol/, 'metadata sharing does not implicitly enable guidance')
  const remote = () => api.renderImage('synthetic', 'https://remote.example/image.png', '/vault/Note.md', '/vault', [], '', false)
  assert.doesNotMatch(remote(), /\ssrc=/, 'remote network requests are blocked by default')
  assert.match(remote(), /data-markdown-src="https:/, 'image source is preserved for editing')
  assert.doesNotMatch(api.renderImage('', '//remote.example/image.png', '', '', [], '', false), /\ssrc=/)
  api.setPrivacyPreference('vault-view:remote-images', true)
  assert.match(remote(), /\ssrc="https:/)
  assert.match(remote(), /referrerpolicy="no-referrer"/)
  api.setPrivacyPreference('vault-view:remote-images', false)
  assert.doesNotMatch(remote(), /\ssrc=/)
  const pane = api.EmbeddedBrowserPane({ initialUrl: 'https://remote.example/' })
  const guest = pane.props.children.at(-1).props.children
  assert.strictEqual(guest.type, frame, 'web preview uses the public SDK component')
  assert.equal(guest.props.src, 'https://remote.example/')
  assert.equal(guest.props.title, 'Web preview')
  assert.equal(guest.props.sandbox, undefined, 'retain the SDK default sandbox posture')
  assert.doesNotMatch(source, /createElement\(['"](?:webview|iframe)['"]\)|persist:hermes-preview|allow-same-origin/)
  assert.doesNotMatch(source, /data-vault-context-envelope|aui_directive-text|preview-tile:|data-tree-tab|trackTabSelection/, 'no Hermes transcript or tab-strip DOM access')
  assert.match(source, /composer\.insertText\(sessionId \|\| null, quote, \{ mode: 'block' \}\)/, 'explicit quoting uses the public composer API and active session')
  assert.doesNotMatch(source, /STORAGE_[A-Z_]*SELECTION|selectedPassage.*storageSet/, 'quote selections are never persisted')
  assert.match(source, /visibility\.listen\(function\(visible\)/, 'tab selection follows the SDK visibility atom')
  assert.match(source, /document\.querySelectorAll\('\.ov-root img\[data-markdown-src\]'\)/, 'remote image changes stay in plugin roots')
  const manifest = fs.readFileSync(path.join(__dirname, '..', 'plugin.yaml'), 'utf8')
  assert.match(manifest, /requires_hermes: ">=0\.21\.5"/)
  console.log('Vault View catalog policy: OK (SDK frame, locale, independent opt-outs, remote privacy)')
})().catch(error => { console.error(error); process.exitCode = 1 })
