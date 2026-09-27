const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pluginPath = path.join(__dirname, '..', 'plugin.js')
const original = fs.readFileSync(pluginPath, 'utf8')

async function readFixture(source, fixture, options = {}) {
  const commands = []
  let stats = 0
  const sandbox = {
    console: { error() {} }, TextDecoder, TextEncoder, Uint8Array, atob, btoa,
    host: { request: async (method, { command }) => {
      commands.push(command)
      let stdout
      if (command.startsWith('stat ')) stdout = fixture.length + '|revision' + (options.changed && stats++ ? '-changed' : '')
      else if (command.includes('-tx1')) {
        const start = Number(command.match(/tail -c \+(\d+)/)[1]) - 1
        const length = Number(command.match(/head -c (\d+)/)[1])
        stdout = options.badHex ? 'truncated' : fixture.subarray(start, start + length).toString('hex')
      }
      else if (command.includes('od -An')) {
        const start = Number(command.match(/tail -c \+(\d+)/)[1]) - 1
        stdout = Array.from(fixture.subarray(start, start + 4)).join(' ')
      } else {
        const start = Number(command.match(/tail -c \+(\d+)/)[1]) - 1
        const length = Number(command.match(/head -c (\d+)/)[1])
        stdout = options.badBase64 ? '[REDACTED]' : fixture.subarray(start, start + length).toString('base64')
      }
      return { result: { code: 0, stdout } }
    } },
  }
  vm.runInNewContext(source.replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {') + '\nglobalThis.read = readVaultFileBytes', sandbox)
  return Buffer.from(await sandbox.read('/vault/Unicode — note.md'))
}

;(async () => {
  // Two- and three-byte characters straddle the old alignment boundary.
  const text = Buffer.from('a'.repeat(2398) + 'é€' + 'b'.repeat(2400) + '😀 fin')
  assert.deepEqual(await readFixture(original, text), text)
  const binary = Buffer.alloc(7201)
  for (let i = 0; i < binary.length; i++) binary[i] = i % 256
  binary[2399] = 0x80
  binary[2400] = 0x81
  assert.deepEqual(await readFixture(original, binary), binary)
  assert.equal((await readFixture(original, Buffer.alloc(0))).length, 0)
  for (const size of [2999, 3000, 3001, 4096, 10000]) {
    const note = Buffer.alloc(size, 0x61)
    assert.deepEqual(await readFixture(original, note), note, 'note size ' + size)
  }
  assert.deepEqual(await readFixture(original, text, { badBase64: true }), text)
  assert.deepEqual(await readFixture(original, binary, { badBase64: true }), binary)
  const largeImage = Buffer.alloc(2 * 1024 * 1024)
  for (let index = 0; index < largeImage.length; index++) largeImage[index] = index % 251
  assert.deepEqual(await readFixture(original, largeImage), largeImage, 'parallel large-file reads must preserve every byte')
  await assert.rejects(readFixture(original, text, { badBase64: true, badHex: true }), error => error.code === 'FILE_READ_INCOMPLETE')
  await assert.rejects(readFixture(original, text, { changed: true }), error => error.code === 'FILE_CHANGED_DURING_READ')
  // Prove that these fixtures catch the previous implementation.
  const previous = fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy-alignment.js'), 'utf8') + original.replace('// Assemble exact bytes before decoding.',
    'if (offset + expected < size) expected = await alignChunkToUtf8(bytes, offset, expected, quotedPath)\n    // Assemble exact bytes before decoding.')
  assert.notDeepEqual(await readFixture(previous, text), text)
  assert.notDeepEqual(await readFixture(previous, binary), binary)
  console.log('Vault View byte integrity: OK (UTF-8, binary, empty; previous regression reproduced)')
})().catch(error => { console.error(error); process.exitCode = 1 })
