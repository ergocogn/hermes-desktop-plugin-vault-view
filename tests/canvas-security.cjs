// Synthetic untrusted Canvas content; no real vault, browser or shell access.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const opened = [], requests = []
const sandbox = {
  console, TextEncoder, TextDecoder, Uint8Array, URL, btoa, atob,
  host: { request: async (...args) => { requests.push(args); throw new Error('Unexpected I/O') } },
  jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  useRef: current => ({ current }), useMemo: fn => fn(), useCallback: fn => fn, useEffect() {},
  usePluginI18n: () => key => key, Codicon() {},
}
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
vm.runInNewContext(source.replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {') + '\nglobalThis.renderCanvas = CanvasDocumentView;', sandbox)
const node = (id, extra) => ({ id, x: 0, y: 0, width: 300, height: 200, ...extra })
const content = JSON.stringify({ nodes: [
  node('text', { type: 'text', text: '# Synthetic\n\n<script>BAD()</script>\n\n[bad](javascript:BAD())\n\n![remote](https://remote.example/image.png)' }),
  node('inside', { type: 'file', file: 'Notes/Target.md' }),
  node('outside', { type: 'file', file: '../outside.md' }),
  node('executable', { type: 'link', url: 'javascript:BAD()' }),
], edges: [{ fromNode: 'inside', toNode: 'outside' }, { fromNode: 'absent', toNode: 'inside' }] })
const props = { content, currentPath: '/vault/Board.canvas', vaultPath: '/vault', files: ['/vault/Notes/Target.md'], onOpen: file => opened.push(file) }
function flatten(value) {
  if (Array.isArray(value)) return value.flatMap(flatten)
  if (!value || typeof value !== 'object') return []
  return [value, ...flatten(value.props?.children)]
}
const tree = flatten(sandbox.renderCanvas(props))
const html = tree.find(item => item.props?.dangerouslySetInnerHTML)?.props.dangerouslySetInnerHTML.__html
assert.ok(html)
assert.doesNotMatch(html, /<script\b|\shref=["']javascript:|\ssrc=["']https?:/i)
assert.match(html, /data-markdown-src="https:\/\/remote\.example/)
assert.equal(opened.length, 0, 'rendering must not navigate')
assert.equal(requests.length, 0, 'rendering must not read files or contact a host')
const cards = tree.filter(item => item.props?.className?.startsWith('ov-canvas-node '))
const event = { target: { closest: () => null } }
cards[2].props.onClick(event)
cards[3].props.onClick(event)
assert.deepEqual(opened, [], 'traversal and executable links must not navigate')
cards[1].props.onClick(event)
assert.deepEqual(opened, ['/vault/Notes/Target.md'], 'an explicit click opens only the listed in-vault note')
assert.equal(requests.length, 0)
assert.equal(props.content, content, 'viewing and navigating preserve Canvas source')
assert.ok(sandbox.renderCanvas({ ...props, content: '{invalid' }), 'invalid JSON has a visible fallback')
console.log('Vault View Canvas security: OK (inert HTML/links/images, confined explicit navigation, unchanged source)')
