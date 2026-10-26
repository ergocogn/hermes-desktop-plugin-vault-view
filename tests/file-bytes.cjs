const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const pluginPath = path.join(__dirname, '..', 'plugin.js')
const original = fs.readFileSync(pluginPath, 'utf8')

async function readFixture(source, fixture, options = {}, hexCommands = null) {
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
        if (hexCommands) hexCommands.push(length)
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
  // od fallback regression: blocks must stay small enough that od's raw hex output (not just
  // the 2 hex chars/byte payload, but its line formatting) never exceeds the 4,000-char stdout
  // tail shell.exec returns, on GNU (measured directly) or BSD od (per the reviewer's reported
  // ~4.67 raw chars/byte on macOS for the same command).
  const blockMatch = original.match(/for \(let part = 0; part < expected; part \+= (\d+)\)/)
  const blockSize = Number(blockMatch[1])
  const { execFileSync } = require('node:child_process')
  const gnuRaw = execFileSync('od', ['-An', '-v', '-tx1'], { input: Buffer.alloc(blockSize, 0xab) }).toString()
  assert.ok(gnuRaw.length < 4000, 'GNU od raw output for one block must stay under the 4,000-char stdout tail (' + gnuRaw.length + ' chars for ' + blockSize + ' bytes)')
  const bsdWorstCaseCharsPerByte = 4200 / 900 // reviewer-measured ratio for macOS od -An -v -tx1
  assert.ok(blockSize * bsdWorstCaseCharsPerByte < 4000, 'BSD od worst-case raw output for one block must stay under 4,000 chars (' + (blockSize * bsdWorstCaseCharsPerByte).toFixed(0) + ' for ' + blockSize + ' bytes)')
  const hexCommands = []
  await readFixture(original, Buffer.alloc(blockSize * 3 + 10, 0x61), { badBase64: true }, hexCommands)
  assert.ok(hexCommands.length > 1 && hexCommands.every(length => length <= blockSize), 'every hex fallback request must ask for at most the bounded block size')
  console.log('Vault View byte integrity: OK (UTF-8, binary, empty; previous regression reproduced)')
})().catch(error => { console.error(error); process.exitCode = 1 })
