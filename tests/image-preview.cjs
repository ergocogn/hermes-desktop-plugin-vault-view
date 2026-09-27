const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
let releaseProbe
let probes = 0
let generations = 0
const probe = new Promise(resolve => { releaseProbe = resolve })
const files = new Map()
let temporarySequence = 0
const sandbox = {
  console: { error() {} }, TextEncoder, TextDecoder, Uint8Array, btoa, atob, setTimeout, clearTimeout,
  host: { request: async (_, { command }) => {
    let stdout = ''
    if (command === 'command -v ffmpeg') { probes++; await probe; stdout = '/usr/bin/ffmpeg' }
    else if (command.startsWith('for candidate')) stdout = ''
    else if (command.endsWith(' -version')) stdout = 'ffmpeg version synthetic'
    else if (command.startsWith('mktemp ')) { stdout = '/tmp/vault-view-thumb-test' + (++temporarySequence); files.set(stdout, Buffer.alloc(0)) }
    else if (command.includes(' -y -loglevel error -i ')) {
      generations++
      const target = command.match(/'([^']+)'$/)[1]
      files.set(target, Buffer.from('RIFF synthetic preview WEBP'))
    } else if (command.startsWith('stat ')) {
      const target = command.match(/-- '([^']+)'/)[1]
      assert.ok(files.has(target), 'original bytes must not be read when thumbnailing is available')
      stdout = files.get(target).length + '|revision'
    } else if (command.startsWith('tail ')) {
      const target = command.match(/tail -c \+\d+ '([^']+)'/)[1]
      stdout = files.get(target).toString('base64')
    } else if (command.startsWith('rm -f')) files.delete(command.match(/'([^']+)'/)[1])
    else throw Error('Unexpected command')
    return { result: { code: 0, stdout } }
  } },
}
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8').replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
vm.runInNewContext(source + '\nglobalThis.preview = readImageThumbnailDataUrl', sandbox)
;(async () => {
  const first = sandbox.preview('/vault/first.png')
  const second = sandbox.preview('/vault/second.png')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(probes, 1, 'concurrent image previews share discovery')
  releaseProbe()
  const results = await Promise.all([first, second])
  results.forEach(result => assert.ok(result.startsWith('data:image/webp;base64,'), 'each image receives a preview'))
  assert.equal(files.size, 0, 'temporary thumbnails are cleaned')
  await sandbox.preview('/vault/first.png', 'revision-1')
  const count = generations
  await sandbox.preview('/vault/first.png', 'revision-1')
  assert.equal(generations, count, 'unchanged preview is not regenerated or reread')
  await sandbox.preview('/vault/first.png', 'revision-2')
  assert.equal(generations, count + 1, 'replacement image regenerates its preview')
  console.log('Vault View image previews: OK (concurrent cold start gives every image a thumbnail)')
})().catch(error => { console.error(error); process.exitCode = 1 })
