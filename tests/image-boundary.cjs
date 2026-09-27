const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
let canonical = '/vault\n/private/outside.png'
const commands = []
const sandbox = { console: { error() {} }, TextDecoder, TextEncoder, Uint8Array, atob, btoa,
  host: { request: async (_, { command }) => { commands.push(command); return { result: { code: 0, stdout: canonical } } } } }
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8').replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
vm.runInNewContext(source + '\nglobalThis.api = { canonicalVaultImagePath, canonicalPathCommand, loadImageDataUrl, readImageOriginal, resolveImagePath, isPathInsideVault }', sandbox)
;(async () => {
  const api = sandbox.api
  assert.equal(api.resolveImagePath('unknown.png', '/vault/note.md', '/vault', []), null)
  await assert.rejects(api.loadImageDataUrl('/vault/linked.png', false, '/vault'), /outside vault/)
  await assert.rejects(api.readImageOriginal('/vault/linked.png', null, '/vault'), /outside vault/)
  assert.ok(commands.every(command => command.startsWith('case ')), 'symlink escape starts no byte reads or thumbnail generation')
  const count = commands.length
  await assert.rejects(api.loadImageDataUrl('/private/outside.png', false, '/vault'), /outside vault/)
  assert.equal(commands.length, count, 'lexical escape is rejected before shell access')
  canonical = '/vault\n/vault/inside.png'
  assert.equal(await api.canonicalVaultImagePath('/vault/inside.png', '/vault'), '/vault/inside.png')
  assert.equal(api.isPathInsideVault('C:/Vault/image.png', 'c:/vault'), true)
  assert.equal(api.isPathInsideVault('/vault-other/image.png', '/vault'), false)
  assert.match(api.canonicalPathCommand('/vault/image.png', '/vault'), /Darwin\) root=\$\(realpath '\/vault'\)/)
  assert.doesNotMatch(source, /find -L |followlinks=True/)
  assert.doesNotMatch(source, /tail -c.*\+ ' -- ' \+ quotedPath/)
  console.log('Vault View image boundary: OK (allow-list, canonical symlink confinement, macOS commands, no linked scans)')
})().catch(error => { console.error(error); process.exitCode = 1 })
