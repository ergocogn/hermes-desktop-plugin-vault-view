const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
let now = 1_800_000_000_000
let revision = 1
let tamper = false
let reads = 0
const files = new Map([['/vault/note.md', Buffer.from('original')], ['/vault/image.png', Buffer.from('image-one')]])
const persisted = []
const sandbox = {
  console: { error() {} }, TextDecoder, TextEncoder, Uint8Array, atob, btoa,
  Date: class extends Date { static now() { return now } },
  setTimeout: fn => { sandbox.flush = fn; return 1 }, clearTimeout() {},
  host: { notifyError() {}, request: async (_, { command }) => {
    let stdout = ''
    if (command.startsWith('printf %s ')) {
      const matches = command.match(/printf %s '([^']*)'.*> '([^']+)'/)
      const bytes = Buffer.from(matches[1], 'base64')
      if (tamper && bytes.length) bytes[0] ^= 1
      files.set(matches[2], bytes)
    } else if (command.startsWith('cp -p')) {
      const matches = command.match(/cp -p '([^']+)' '([^']+)'/)
      files.set(matches[2], Buffer.from(files.get(matches[1])))
    } else if (command.startsWith('wc -c')) stdout = String(files.get(command.match(/< '([^']+)'/)[1]).length)
    else if (command.startsWith('mv -f')) {
      const matches = command.match(/mv -f '([^']+)' '([^']+)'/)
      files.set(matches[2], files.get(matches[1])); files.delete(matches[1])
    } else if (command.startsWith('rm -f')) files.delete(command.match(/rm -f '([^']+)'/)[1])
    else if (command.startsWith('if [ -f')) stdout = 'revision-' + revision
    else if (command.startsWith('case ')) stdout = '/vault\n/vault/image.png'
    else if (command.startsWith('stat ')) {
      const target = command.match(/-- '([^']+)'/)[1]
      stdout = String(files.get(target).length) + (command.includes('%s|') ? '|revision-' + revision : '')
    } else if (command.startsWith('tail ')) {
      reads++
      const target = command.match(/tail -c \+\d+ '([^']+)'/)[1]
      const start = Number(command.match(/tail -c \+(\d+)/)[1]) - 1
      const length = Number(command.match(/head -c (\d+)/)[1])
      stdout = files.get(target).subarray(start, start + length).toString('base64')
    } else throw Error('Unexpected command: ' + command)
    return { result: { code: 0, stdout } }
  } },
}
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
  .replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
vm.runInNewContext(source + '\nglobalThis.api = { VaultLruCache, cachedReadingMarkdown, marked, readImageOriginal, readNoteForNavigation, NoteContentCache, vaultNoteIndex, loadAllNoteContents, readNoteFile, saveNoteFile, loadImageDataUrl, reportPluginError, incidentSnapshot, setContext(ctx) { pluginCtx = ctx; vaultSessionContext.vaultPath = "/vault" } }', sandbox)
const api = sandbox.api
api.setContext({ storage: { set(_, value) { persisted.push(JSON.stringify(value)); return Promise.resolve() } } })

;(async () => {
  const bounded = new api.VaultLruCache(8)
  bounded.set('a', { bytes: 4 }); bounded.set('b', { bytes: 4 }); bounded.get('a'); bounded.set('c', { bytes: 4 })
  assert.equal(bounded.has('b'), false, 'evict least recently used result')
  assert.equal(bounded.bytes, 8)
  bounded.clear(); assert.equal(bounded.bytes, 0)
  files.set('/vault/note.md', Buffer.from('# Synthetic note\n' + 'A long synthetic paragraph.\n'.repeat(1000)))
  const cold = await api.readNoteForNavigation('/vault/note.md')
  const navigationReads = reads
  assert.ok(navigationReads > 10, 'long note exercises chunked transport')
  assert.equal((await api.readNoteForNavigation('/vault/note.md')).content, cold.content)
  assert.equal(reads, navigationReads, 'returning to unchanged note performs zero byte reads')
  revision++; files.set('/vault/note.md', Buffer.from('external edit'))
  assert.equal((await api.readNoteForNavigation('/vault/note.md')).content, 'external edit')
  assert.ok(reads > navigationReads, 'navigation detects external edit')
  const original = await api.readImageOriginal('/vault/image.png')
  const originalReads = reads
  assert.deepEqual(await api.readImageOriginal('/vault/image.png'), original)
  assert.equal(reads, originalReads, 'reopening detail reuses original bytes')
  revision++; files.set('/vault/image.png', Buffer.from('replacement'))
  assert.notDeepEqual(await api.readImageOriginal('/vault/image.png'), original)
  const parse = api.marked.parse; let parses = 0
  api.marked.parse = () => { parses++; return '<p>synthetic</p>' }
  const options = { currentPath: '/vault/note.md', vaultPath: '/vault', allFiles: [], allAssets: [], headingOffset: 0 }
  api.cachedReadingMarkdown('synthetic', options); api.cachedReadingMarkdown('synthetic', options)
  assert.equal(parses, 1, 'navigation reuses rendered Markdown')
  api.cachedReadingMarkdown('changed', options); assert.equal(parses, 2)
  api.cachedReadingMarkdown('changed', { ...options, allAssets: ['/vault/new.png'] }); assert.equal(parses, 3)
  api.marked.parse = parse
  const unsafe = api.marked.parse('<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)\n\n![bad](file:///private/file.png)', options)
  assert.doesNotMatch(unsafe, /<script|\shref="javascript:|\ssrc="file:/i, 'note markup cannot activate scripts or arbitrary external local URLs')
  assert.match(unsafe, /&lt;script&gt;/)
  assert.match(api.marked.parse('[safe](https://example.com)', options), /href="https:\/\/example.com"/)
  const escapedImage = api.marked.parse('![outside](../../../private.png)', { ...options, allAssets: ['/private.png'] })
  assert.doesNotMatch(escapedImage, /data-local-path="\/private\.png"|src="file:\/\/\/private\.png"/, 'image traversal cannot read outside the selected vault')
  const insideImage = api.marked.parse('![inside](assets/inside.png)', { ...options, allAssets: ['/vault/assets/inside.png'] })
  assert.match(insideImage, /data-local-path="\/vault\/assets\/inside.png"/)
  const cache = new api.NoteContentCache(64)
  cache.set('/vault/one.md', '[[Target]] #tag ' + 'x'.repeat(40))
  assert.equal(cache.size, 0, 'oversized raw note must be evicted')
  assert.match(api.vaultNoteIndex.get('/vault/one.md'), /\[\[Target(?:\|Target)?\]\]/, 'graph summary survives raw eviction')
  await api.loadAllNoteContents(['/vault/note.md'])
  const indexedReads = reads
  await api.loadAllNoteContents(['/vault/note.md'])
  assert.equal(reads, indexedReads, 'unchanged revision avoids content reads')
  revision++
  await api.loadAllNoteContents(['/vault/note.md'])
  assert.ok(reads > indexedReads, 'changed revision rereads content')
  await api.loadAllNoteContents([])
  assert.equal(api.vaultNoteIndex.size, 0, 'removed notes leave the index')
  const beforeCancel = reads
  await assert.rejects(api.readNoteFile('/vault/note.md', () => true), error => error.code === 'FILE_READ_CANCELLED')
  assert.equal(reads, beforeCancel, 'cancelled load starts no byte reads')
  const largeNote = 'été 😀\n'.repeat(500)
  assert.ok(Buffer.byteLength(largeNote) > 3000)
  assert.equal(await api.saveNoteFile('/vault/note.md', largeNote), true)
  assert.equal(files.get('/vault/note.md').toString(), largeNote)
  tamper = true
  assert.equal(await api.saveNoteFile('/vault/note.md', 'new text'), false)
  assert.equal(files.get('/vault/note.md').toString(), largeNote, 'same-size corruption must never replace original')
  assert.equal(Array.from(files.keys()).some(name => name.includes('.tmp-')), false)
  tamper = false
  files.set('/vault/bad.md', Buffer.from([0x80, 0x99]))
  await api.readNoteFile('/vault/bad.md')
  assert.equal(await api.saveNoteFile('/vault/bad.md', 'repaired'), true)
  const backup = Array.from(files.keys()).find(name => name.includes('.utf8-recovery-'))
  assert.deepEqual(files.get(backup), Buffer.from([0x80, 0x99]))
  const first = await api.loadImageDataUrl('/vault/image.png')
  const readCount = reads
  assert.equal(await api.loadImageDataUrl('/vault/image.png'), first)
  assert.equal(reads, readCount, 'unchanged image reuses its bytes')
  now += 30001
  await api.loadImageDataUrl('/vault/image.png')
  assert.ok(reads > readCount, 'cached original fallback expires so thumbnail generation can recover')
  revision++
  files.set('/vault/image.png', Buffer.from('image-two'))
  assert.notEqual(await api.loadImageDataUrl('/vault/image.png'), first)
  const beforeForce = reads
  await api.loadImageDataUrl('/vault/image.png', true)
  assert.ok(reads > beforeForce)
  const error = new Error('PRIVATE-NOTE /private/path token-secret')
  api.reportPluginError('note read failed', error)
  api.reportPluginError('note read failed', error)
  const incident = api.incidentSnapshot().find(entry => entry.code === 'NOTE_READ_FAILED')
  assert.equal(incident.count, 2)
  sandbox.flush()
  assert.doesNotMatch(persisted.join(''), /PRIVATE-NOTE|private|token-secret/)
  now += 8 * 86400000
  assert.equal(api.incidentSnapshot().length, 0)
  api.setContext({ storage: { set() { return Promise.reject(Error('quota')) } } })
  api.reportPluginError('note read failed', error)
  sandbox.flush()
  await new Promise(resolve => setImmediate(resolve))
  console.log('Vault View I/O and diagnostics: OK (save integrity, cleanup, cache revisions, log privacy/expiry/storage failure)')
  console.log('Navigation byte-read calls: cold long note=' + navigationReads + ', unchanged return=0; unchanged image detail return=0')
})().catch(error => { console.error(error); process.exitCode = 1 })
