// Optional integration test: node tests/wsl-read.cjs (requires WSL Ubuntu).
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fixturePath = path.join(__dirname, '.wsl-read — été.tmp')
const wslPath = '/mnt/' + fixturePath[0].toLowerCase() + fixturePath.slice(2).replace(/\\/g, '/')
const fixture = Buffer.from(('# Été — test\n\nTexte **gras**, euro €, emoji 😀.\n').repeat(280))
let altered = false
const sandbox = {
  TextEncoder, TextDecoder, Uint8Array, atob, btoa, console,
  host: { request: async (_, { command }) => {
    let stdout = execFileSync('wsl.exe', ['-d', process.env.VAULT_TEST_DISTRO || 'Ubuntu', '--', 'sh', '-c', command], { encoding: 'utf8', windowsHide: true })
    // Mirror the RPC tail and reproduce alteration of one base64 response.
    if (!altered && command.endsWith('| base64')) { stdout = '[REDACTED]'; altered = true }
    return { result: { code: 0, stdout: stdout.slice(-4000) } }
  } },
}
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
  .replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
vm.runInNewContext(source + '\nglobalThis.read = readVaultFileBytes; globalThis.save = saveNoteFile', sandbox)
fs.writeFileSync(fixturePath, fixture, { flag: 'wx' })
;(async () => {
  try {
    assert.deepEqual(Buffer.from(await sandbox.read(wslPath)), fixture)
    assert.equal(altered, true)
    const edited = 'Écriture atomique — été 😀\nApostrophes : \' et ’ ; texte littéral : $(test), `test`.\n'.repeat(200)
    assert.ok(Buffer.byteLength(edited) > 3000)
    assert.equal(await sandbox.save(wslPath, edited), true)
    assert.equal(fs.readFileSync(fixturePath, 'utf8'), edited)
    console.log('Vault View WSL I/O: OK (Unicode path, byte read, altered block recovery, atomic write with exact Unicode/shell-literal content)')
  } finally { fs.unlinkSync(fixturePath) }
})().catch(error => { console.error(error); process.exitCode = 1 })
