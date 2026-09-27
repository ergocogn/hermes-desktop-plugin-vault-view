// Synthetic inventory integration check. Reads no user vault data.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fixture = fs.mkdtempSync(path.join(__dirname, '.synthetic-scan-'))
const names = ['A.md', 'été note.md', 'image.png']
const posix = value => '/mnt/' + value[0].toLowerCase() + value.slice(2).replace(/\\/g, '/')
const quote = value => "'" + value.replace(/'/g, "'\"'\"'") + "'"
const shell = command => execFileSync('wsl.exe', ['-d', process.env.VAULT_TEST_DISTRO || 'Ubuntu', '--', 'sh', '-c', command], { encoding: 'utf8', windowsHide: true })
const temporary = []
const sandbox = { console, TextEncoder, TextDecoder, Uint8Array, host: { request: async (_, { command }) => {
  const stdout = shell(command)
  if (command.startsWith('mktemp ')) {
    const allocated = stdout.trim(); temporary.push(allocated)
    assert.equal(shell('stat -c %a ' + quote(allocated)).trim(), '600', 'scan manifest is private')
  }
  return { result: { code: 0, stdout: stdout.slice(-4000) } }
} } }
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8').replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
vm.runInNewContext(source + '\nglobalThis.scan = scanVaultEntries', sandbox)
;(async () => {
  try {
    names.forEach(name => fs.writeFileSync(path.join(fixture, name), 'synthetic'))
    const entries = await sandbox.scan(posix(fixture))
    assert.deepEqual(Array.from(entries, entry => path.posix.basename(entry.path)).sort(), [...names].sort())
    assert.equal(temporary.length, 2)
    assert.equal(new Set(temporary).size, 2)
    temporary.forEach(file => shell('test ! -e ' + quote(file)))
    console.log('Vault View real WSL scan: OK (Unicode names, private unique manifests, concurrent scan cleanup)')
  } finally {
    names.forEach(name => { const file = path.join(fixture, name); if (fs.existsSync(file)) fs.unlinkSync(file) })
    fs.rmdirSync(fixture)
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
