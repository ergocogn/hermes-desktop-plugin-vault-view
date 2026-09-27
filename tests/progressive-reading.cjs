const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
  .replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
const sandbox = { console, TextDecoder, TextEncoder, Uint8Array, atob, btoa }
vm.runInNewContext(source + '\nglobalThis.api = { splitReadingPages, readingPageForHeading, marked }', sandbox)
const { splitReadingPages, readingPageForHeading, marked } = sandbox.api
const options = { currentPath: '/vault/test.md', vaultPath: '/vault', allFiles: [], allAssets: [] }
const cases = [
  '',
  '# Titre\n\nParagraphe **gras**.\n\n'.repeat(30),
  '# Intro\r\n\r\nTexte é 😀.\r\n\r\n'.repeat(30),
  '# Code\n\n```js\n' + ('// code\n\n# not a heading\n').repeat(25) + '```\n\n# Fin\n\nFin.\n',
  ('- Un\n    - enfant\n- Deux\n\nTexte.\n\n').repeat(30),
  ('| A | B |\n| --- | --- |\n| é | 😀 |\n\n').repeat(30),
  ('> [!NOTE] Important\n> Citation\n>\n> Suite\n\n').repeat(30),
  '# Début\n\n' + 'paragraphe indivisible '.repeat(100),
]
for (const content of cases) {
  const pages = splitReadingPages(content, 100)
  assert.equal(pages.map(page => page.content).join(''), content, 'preserve exact full source')
  const rendered = pages.map(page => marked.parse(page.content, { ...options, headingOffset: page.headingOffset })).join('\n')
  assert.equal(rendered, marked.parse(content, options), 'paging must preserve Markdown structure and heading indexes')
  for (let index = 0; index < pages.at(-1).headingEnd; index++) {
    const page = readingPageForHeading(pages, index)
    assert.ok(page >= 0)
    assert.match(marked.parse(pages[page].content, { ...options, headingOffset: pages[page].headingOffset }), new RegExp('data-outline-index="' + index + '"'))
  }
}
const huge = ('# Section\n\n' + 'Texte '.repeat(1000) + '\n\n').repeat(20)
assert.ok(splitReadingPages(huge).length > 1)
assert.equal(splitReadingPages('x'.repeat(20000)).length, 1, 'never cut one indivisible paragraph')
console.log('Vault View progressive reading: OK (exact source, code/lists/tables/callouts, CRLF, global outline, indivisible blocks)')
