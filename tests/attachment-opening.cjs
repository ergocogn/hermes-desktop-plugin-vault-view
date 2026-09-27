const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const commands = []
let fail = false
let externalCalls = 0
let revealSuccess = false
let reveals = []
let mapped = true
const nativePath = "C:\\Synthetic notes\\image's $name.png"
const sandbox = {
  console, Uint8Array, TextEncoder, TextDecoder, btoa, atob,
  host: { notifyError() {}, request: async (_, { command }) => {
    commands.push(command)
    if (command.startsWith('wslpath')) return { result: { code: mapped ? 0 : 1, stdout: mapped ? nativePath : '' } }
    return { result: { code: fail ? 1 : 0, stdout: '', stderr: fail ? 'no association' : '' } }
  } },
}
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
  .replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
vm.runInNewContext(source + '\nglobalThis.api = { openVaultAttachment, attachmentPreviewKind, openVaultFile, openNoteInObsidian, shellExec, context(value) { pluginCtx = value } }', sandbox)
sandbox.api.context({ os: { openExternal() { externalCalls++; return true }, revealPath(candidate) { reveals.push(candidate); return revealSuccess } } })
;(async () => {
  const previews = []
  sandbox.host.openWorkspace = (id, options) => { previews.push({ id, options }); return () => {} }
  for (const file of ['/vault/image.png', '/vault/example.py', '/vault/example.txt']) {
    assert.equal(await sandbox.api.openVaultAttachment(file), true)
  }
  assert.equal(commands.length, 0, 'compatible attachment clicks do not launch external applications')
  assert.equal(previews.length, 3)
  await sandbox.api.openVaultAttachment('/vault/image.png')
  assert.equal(previews[0].id, previews[3].id, 'repeated preview uses the same workspace identity')
  assert.equal(sandbox.api.attachmentPreviewKind('/vault/example.html'), 'text', 'HTML is displayed as inert source')
  assert.equal(sandbox.api.attachmentPreviewKind('/vault/unknown.bin'), '')
  delete sandbox.host.openWorkspace
  assert.equal(await sandbox.api.openVaultFile('/vault/image.png'), true)
  const command = commands.find(value => value.includes(' url.dll,FileProtocolHandler '))
  const unquote = value => value.slice(1, -1).split("'\"'\"'").join("'")
  assert.equal(unquote(command.split(' url.dll,FileProtocolHandler ')[1]), nativePath)
  assert.equal(await sandbox.api.openNoteInObsidian('/vault/note.md', '/vault'), true)
  assert.equal(commands.at(-1).includes('FileProtocolHandler'), false, 'Obsidian first uses the Desktop OS API, not backend Windows paths')
  sandbox.api.context({ os: { openExternal() { externalCalls++; return false }, revealPath(candidate) { reveals.push(candidate); return revealSuccess } } })
  assert.equal(await sandbox.api.openNoteInObsidian('/vault/note.md', '/vault'), true)
  const obsidianTarget = unquote(commands.at(-1).split(' url.dll,FileProtocolHandler ')[1])
  assert.equal(obsidianTarget, 'obsidian://open?path=' + encodeURIComponent(nativePath))
  assert.equal(externalCalls, 2, 'only Obsidian custom-protocol requests use the Desktop OS API; attachments do not use file URLs')
  assert.equal(commands.some(value => /explorer|xdg-open/.test(value)), false)
  assert.equal(commands.some(value => /powershell|pwsh|-EncodedCommand/i.test(value)), false, 'gateway forbids PowerShell execution; use the OS association handler')
  fail = true
  assert.equal(await sandbox.api.openNoteInObsidian('/vault/note.md', '/vault'), false, 'missing protocol association reports failure')
  assert.equal(await sandbox.api.openVaultFile('/vault/image.png'), false, 'failure of both association and explorer must not claim success')
  revealSuccess = true
  assert.equal(await sandbox.api.openVaultFile('/vault/image.png'), true, 'failed association falls back to the host explorer')
  assert.ok(reveals.includes(nativePath), 'explorer receives the mapped native path')
  mapped = false
  fail = false
  externalCalls = 0
  sandbox.api.context({ os: { openExternal() { externalCalls++; return true } } })
  assert.equal(await sandbox.api.openVaultFile('/vault/image.png'), true, 'POSIX file uses its association opener')
  assert.equal(externalCalls, 0, 'file URLs are reserved for reveal, not association launching')
  fail = false
  sandbox.api.context({ os: { openExternal() { return false } } })
  assert.equal(await sandbox.api.openVaultFile('/vault/image.png'), true, 'POSIX shell opener remains available')
  assert.match(commands.at(-1), /uname -s.*Darwin.*open.*else xdg-open/)
  fail = true
  let fallbackPath = ''
  sandbox.api.context({ os: { openExternal() { return false }, revealPath(candidate) { fallbackPath = candidate; return true } } })
  assert.equal(await sandbox.api.openVaultFile('/vault/image.png'), true)
  assert.equal(fallbackPath, '/vault/image.png', 'POSIX launch failure reveals through the host API')
  sandbox.host.request = async () => ({ error: { code: -32000, message: 'synthetic rejected request' } })
  await assert.rejects(sandbox.api.shellExec('synthetic'), /requête shell/, 'RPC rejection cannot be treated as a successful launch')
  console.log('Vault View attachment opening: OK (association, quoting, explicit failure; mocked OS)')
})().catch(error => { console.error(error); process.exitCode = 1 })
