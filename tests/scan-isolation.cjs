const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const files = new Map()
let sequence = 0, active = 0, peak = 0, fail = false
const fixtures = {
  A: Array.from({ length: 1000 }, (_, i) => '/a/' + i + '.md'),
  B: Array.from({ length: 900 }, (_, i) => '/b/' + i + '.md'),
}
const sandbox = { console, TextDecoder, TextEncoder, Uint8Array, host: { request: async (_, { command }) => {
  let stdout = '', code = 0
  if (command.startsWith('mktemp ')) { stdout = '/tmp/vault-view-manifest-test' + (++sequence); files.set(stdout, []) }
  else if (command.startsWith('umask 077 && fixture')) {
    const match = command.match(/fixture([AB]) > '([^']+)'/)
    files.set(match[2], fixtures[match[1]])
  } else if (command.startsWith('wc -l')) stdout = String(files.get(command.match(/'([^']+)'/)[1]).length)
  else if (command.startsWith('sed ')) {
    const match = command.match(/sed -n '(\d+),(\d+)p' '([^']+)'/)
    active++; peak = Math.max(peak, active)
    await new Promise(resolve => setImmediate(resolve))
    assert.ok(files.has(match[3]), 'manifest must not be deleted while readers run')
    if (fail) code = 1
    else stdout = files.get(match[3]).slice(Number(match[1]) - 1, Number(match[2])).join('\n')
    active--
  } else if (command.startsWith('rm -f ')) files.delete(command.match(/'([^']+)'/)[1])
  else throw Error('Unexpected synthetic command')
  return { result: { code, stdout } }
} } }
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8').replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
vm.runInNewContext(source + '\nglobalThis.collect = collectCommandLines', sandbox)
;(async () => {
  const results = await Promise.all([sandbox.collect('fixtureA'), sandbox.collect('fixtureB')])
  assert.deepEqual(Array.from(results[0]), fixtures.A)
  assert.deepEqual(Array.from(results[1]), fixtures.B)
  assert.equal(files.size, 0, 'private manifests are cleaned after concurrent scans')
  peak = 0
  await sandbox.collect('fixtureA')
  assert.ok(peak <= 4, 'page reads are bounded per scan')
  fail = true
  await assert.rejects(sandbox.collect('fixtureA'))
  assert.equal(files.size, 0, 'failed scans clean manifests after all workers finish')
  console.log('Vault View scan isolation: OK (concurrent inventories, bounded reads, private unique manifests, failure cleanup)')
})().catch(error => { console.error(error); process.exitCode = 1 })
