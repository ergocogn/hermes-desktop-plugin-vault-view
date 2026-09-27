const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent('<article id="editor" contenteditable="true"></article>')
    const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
      .replace(/^import .*$/gm, '').replace('export default {', 'globalThis.plugin = {')
    await page.addScriptTag({ content: source })
    await page.evaluate(() => {
      window.jsx = (type, props) => ({ type, props })
      const style = document.createElement('style')
      style.textContent = [].concat(styles().props.children).join('')
      document.head.appendChild(style)
      document.documentElement.style.setProperty('--ui-text-primary', '#202020')
      document.documentElement.style.setProperty('--ui-text-secondary', '#777777')
      document.documentElement.style.setProperty('--ui-accent', '#126ac4')
      document.documentElement.style.setProperty('--ui-bg-sidebar', '#e7e9ee')
    })
    const result = await page.evaluate(() => {
      const root = document.getElementById('editor')
      const options = { currentPath: '/vault/test.md', vaultPath: '/vault', allFiles: [], allAssets: [] }
      root.innerHTML = marked.parse('# Titre\n\nTexte **gras** ici\n\n- Un\n- Deux\n', options)
      const enter = (node, offset = 0) => {
        const range = document.createRange()
        range.setStart(node, offset); range.collapse(true)
        window.getSelection().removeAllRanges(); window.getSelection().addRange(range)
        revealMarkdownBlock(root, options)
      }
      enter(root.querySelector('h1').firstChild)
      const heading = root.querySelector('[data-source-active]').innerText
      const before = visualEditorToMarkdown(root)
      enter(root.querySelector('strong').firstChild, 2)
      const bold = root.querySelector('[data-source-active]').innerText
      formatActiveMarkdown(root, 'bold')
      const formatted = root.querySelector('[data-source-active]').innerText
      enter(root.querySelector('li').firstChild)
      const list = root.querySelector('[data-source-active]').innerText
      const after = visualEditorToMarkdown(root)
      root.querySelector('[data-source-active]').focus()
      return { heading, bold, list, before, after, formatted }
    })
    assert.equal(result.heading, '# Titre')
    assert.equal(result.bold, 'Texte **gras** ici')
    assert.equal(result.list, '- Un\n- Deux')
    assert.match(result.formatted, /\*\*texte\*\*/)
    assert.equal(result.after, result.before.replace('**gras**', '**gr**texte**as**'), 'toolbar must modify only the selected block')
    await page.keyboard.press('End')
    await page.keyboard.type(' modifie')
    const edited = await page.evaluate(() => visualEditorToMarkdown(document.getElementById('editor')))
    assert.match(edited, /modifie/)
    assert.doesNotMatch(edited, /- - Un/)
    console.log('Vault View browser editor: OK (heading, bold, lists, edit, no duplicate markers)')
    const preserved = await page.evaluate(() => {
      const root = document.getElementById('editor')
      const options = { currentPath: '/vault/test.md', vaultPath: '/vault', allFiles: [], allAssets: [] }
      const source = '# Title\r\n\r\nOriginal __bold__ text.  \r\n\r\n* First\r\n* Second\r\n\r\n```js\r\nconst a = 1\r\n```\r\n'
      renderSourcePreservingEditor(root, source, options)
      const roundtrip = visualEditorToMarkdown(root)
      const range = document.createRange()
      range.setStart(root.querySelector('h1').firstChild, 0); range.collapse(true)
      window.getSelection().removeAllRanges(); window.getSelection().addRange(range)
      revealMarkdownBlock(root, options)
      const revealed = visualEditorToMarkdown(root)
      root.querySelector('[data-source-active]').textContent = '# Changed'
      const changed = visualEditorToMarkdown(root)
      return { source, roundtrip, revealed, changed }
    })
    assert.equal(preserved.roundtrip, preserved.source, 'untouched source must retain CRLF, spaces and markers')
    assert.equal(preserved.revealed, preserved.source, 'revealing source must not change the note')
    assert.equal(preserved.changed, preserved.source.replace('# Title', '# Changed'), 'only changed source group may be serialized')
    console.log('Vault View browser source preservation: OK (exact roundtrip and isolated edit)')
    const appearance = await page.evaluate(() => {
      const root = document.getElementById('editor')
      root.className = 'ov-md ov-visual-editor'
      root.replaceChildren()
      const active = document.createElement('div')
      active.className = 'ov-active-markdown'; active.dataset.sourceActive = 'true'
      active.textContent = '## Heading **bold** *italic* `code` #tag'
      root.appendChild(active)
      const range = document.createRange(); range.setStart(active.firstChild, 19); range.collapse(true)
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range)
      styleActiveMarkdown(active)
      const caret = document.createRange(); caret.selectNodeContents(active); caret.setEnd(selection.anchorNode, selection.anchorOffset)
      return {
        text: active.textContent, caret: caret.toString().length,
        level: active.dataset.headingLevel,
        bold: getComputedStyle(active.querySelector('.ov-source-bold')).fontWeight,
        italic: getComputedStyle(active.querySelector('.ov-source-italic')).fontStyle,
        marker: getComputedStyle(active.querySelector('.ov-md-marker')).color,
        body: getComputedStyle(active).color,
        tag: getComputedStyle(active.querySelector('.ov-source-tag')).color,
        width: root.getBoundingClientRect().width, available: root.parentElement.getBoundingClientRect().width,
        padding: getComputedStyle(root).paddingLeft,
      }
    })
    assert.equal(appearance.text, '## Heading **bold** *italic* `code` #tag')
    assert.equal(appearance.caret, 19, 'syntax styling preserves caret offset')
    assert.equal(appearance.level, '2')
    assert.equal(appearance.bold, '700')
    assert.equal(appearance.italic, 'italic')
    assert.notEqual(appearance.marker, appearance.body)
    assert.equal(appearance.tag, 'rgb(18, 106, 196)', 'inline tag uses the theme accent')
    assert.equal(appearance.width, appearance.available, 'note fills available width')
    assert.ok(parseFloat(appearance.padding) <= 24)
    console.log('Vault View browser appearance: OK (live styling, muted syntax, caret and responsive width)')
    const header = await page.evaluate(() => {
      const panel = document.createElement('div'); panel.className = 'ov-note-title-panel'
      panel.innerHTML = '<div class="ov-note-title-inner"><input class="ov-note-title-input" value="Synthetic title"><div class="ov-note-folder">Folder</div><span class="ov-note-status" role="status" title="Saving" aria-label="Saving"><span class="codicon codicon-sync" aria-hidden="true"></span></span></div>'
      document.body.appendChild(panel)
      const status = panel.querySelector('.ov-note-status'), title = panel.querySelector('input'), folder = panel.querySelector('.ov-note-folder')
      const result = { text: status.textContent, right: status.getBoundingClientRect().right, edge: panel.querySelector('.ov-note-title-inner').getBoundingClientRect().right, top: status.getBoundingClientRect().top, titleTop: title.getBoundingClientRect().top, folderTop: folder.getBoundingClientRect().top }
      panel.remove(); return result
    })
    assert.equal(header.text, '', 'save status has no visible text')
    assert.ok(Math.abs(header.right - header.edge) < 1, 'save status aligns to the right edge')
    assert.ok(header.top < header.folderTop && header.top >= header.titleTop, 'status stays in the title row')
    console.log('Vault View browser save status: OK (icon layout at top right)')
    const history = await page.evaluate(() => {
      const field = document.createElement('textarea'); document.body.appendChild(field); field.focus()
      document.execCommand('insertText', false, 'synthetic edit')
      document.execCommand('undo', false); const undone = field.value
      document.execCommand('redo', false); const redone = field.value
      field.remove(); return { undone, redone }
    })
    assert.equal(history.undone, '')
    assert.equal(history.redone, 'synthetic edit')
    const performance = await page.evaluate(() => {
      const root = document.getElementById('editor')
      const options = { currentPath: '/vault/perf.md', vaultPath: '/vault', allFiles: [], allAssets: [] }
      const source = Array.from({ length: 800 }, (_, i) => 'Paragraph ' + i + ' __bold__ text.\n\n').join('')
      renderSourcePreservingEditor(root, source, options)
      const originalFingerprint = sourceGroupFingerprint
      let calls = 0
      sourceGroupFingerprint = nodes => { calls++; return originalFingerprint(nodes) }
      try {
        const before = visualEditorToMarkdown(root)
        const unchangedCalls = calls
        const first = root.querySelector('p')
        first.firstChild.textContent = 'Edited paragraph '
        calls = 0
        const after = visualEditorToMarkdown(root)
        const changedCalls = calls
        calls = 0
        const repeated = visualEditorToMarkdown(root)
        return { before, source, after, repeated, unchangedCalls, changedCalls, repeatCalls: calls, tag: markdownTagForSelection('Project demo') }
      } finally { sourceGroupFingerprint = originalFingerprint }
    })
    assert.equal(performance.before, performance.source)
    assert.equal(performance.unchangedCalls, 0, 'unchanged groups require no DOM clones')
    assert.equal(performance.changedCalls, 1, 'editing one paragraph fingerprints only one group')
    assert.equal(performance.repeatCalls, 0, 'serialized changed group is reused')
    assert.equal(performance.after, performance.repeated)
    assert.equal(performance.tag, '#Project-demo')
    assert.match(performance.after, /Edited paragraph/)
    console.log('Vault View browser incremental editing: OK (800 blocks, one changed group, tag insertion)')
    const imageDetail = await page.evaluate(async () => {
      const image = document.createElement('img')
      image.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="blue"/></svg>')
      document.body.appendChild(image)
      const dialog = openImageDetail(image)
      const opened = dialog.open
      dialog.querySelector('button').click()
      const zoomed = !!dialog.querySelector('.ov-image-actual')
      const closing = new Promise(resolve => dialog.addEventListener('close', resolve, { once: true }))
      dialog.close()
      await closing
      const closed = !dialog.isConnected
      image.dataset.localPath = '/vault/synthetic.png'
      image.dataset.vaultRoot = '/vault'
      const originalCanonical = canonicalVaultImagePath
      canonicalVaultImagePath = async path => path
      const originalRead = readVaultFileBytes
      let checked = false
      readVaultFileBytes = async (_, cancelled) => { checked = cancelled(); return new Uint8Array([1, 2, 3]) }
      try {
        const local = openImageDetail(image)
        await new Promise(resolve => setTimeout(resolve, 0))
        const loadedOriginal = local.querySelector('img').src.startsWith('blob:')
        local.close()
        image.remove()
        return { opened, zoomed, closed, loadedOriginal, checked }
      } finally { readVaultFileBytes = originalRead; canonicalVaultImagePath = originalCanonical }
    })
    assert.equal(imageDetail.opened, true)
    assert.equal(imageDetail.zoomed, true)
    assert.equal(imageDetail.closed, true)
    assert.equal(imageDetail.loadedOriginal, true, 'detail loads original separately from the preview')
    const sessions = await page.evaluate(() => {
      let value = 'conversation-a', listener, stopped = false
      const changed = []
      const stop = listenVaultConversationChanges({ focusedStoredSessionId: { get: () => value, listen: fn => { listener = fn; return () => { stopped = true } } } }, id => changed.push(id))
      listener('conversation-a'); listener('conversation-b'); listener('conversation-b'); listener(null)
      stop()
      return { changed, stopped }
    })
    assert.deepEqual(sessions.changed, ['conversation-b', null])
    assert.equal(sessions.stopped, true)
    console.log('Vault View browser image detail and conversations: OK (popup, zoom, original and session subscription)')
    await page.evaluate(() => {
      window.originalHydrate = hydrateLocalImage
      window.previewedImages = []
      hydrateLocalImage = image => previewedImages.push(image.dataset.localPath)
      const pane = document.createElement('div'); pane.className = 'ov-main'; pane.id = 'image-lazy-test'; pane.style.cssText = 'height:180px;overflow:auto'
      const article = document.createElement('article')
      article.innerHTML = '<img data-local-path="/vault/first.png" style="height:50px"><div style="height:2000px"></div><img data-local-path="/vault/last.png" style="height:50px">'
      pane.appendChild(article); document.body.replaceChildren(pane)
      hydrateLocalImages(article)
    })
    await page.waitForTimeout(150)
    assert.deepEqual(await page.evaluate(() => previewedImages), ['/vault/first.png'])
    await page.evaluate(() => { document.getElementById('image-lazy-test').scrollTop = 1e8 })
    await page.waitForTimeout(150)
    assert.deepEqual(await page.evaluate(() => previewedImages), ['/vault/first.png', '/vault/last.png'])
    await page.evaluate(() => { hydrateLocalImage = originalHydrate })
    console.log('Vault View browser lazy images: OK (only images near the viewport load)')
    // Lightweight hook harness for the reading component. IntersectionObserver,
    // scroll and buttons run in a real browser; this is not a full Hermes mount.
    await page.setContent('<div class="ov-main" style="height:220px;width:600px;overflow:auto"><div id="mount"></div></div>')
    await page.evaluate(() => {
      const slots = []
      const positions = new Map()
      pluginCtx = { storage: { get: key => positions.get(key), set: (key, value) => positions.set(key, JSON.parse(JSON.stringify(value))) } }
      window.remountReading = () => { slots.forEach(slot => slot && slot.cleanup && slot.cleanup()); slots.length = 0; window.renderReading() }
      let cursor = 0
      let effects = []
      let cleanups = []
      let queued = false
      window.useState = initial => {
        const index = cursor++
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
        return [slots[index], value => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value
          if (!queued) { queued = true; queueMicrotask(() => { queued = false; window.renderReading() }) }
        }]
      }
      window.useRef = initial => { const index = cursor++; return slots[index] || (slots[index] = { current: initial }) }
      window.useMemo = fn => fn()
      window.useCallback = fn => fn
      window.useEffect = (fn, deps) => {
        const index = cursor++
        const old = slots[index]
        if (!old || !deps || deps.some((value, i) => value !== old.deps[i])) {
          slots[index] = { deps, cleanup: old && old.cleanup }
          effects.push(() => { if (slots[index].cleanup) slots[index].cleanup(); slots[index].cleanup = fn() })
        }
      }
      window.usePluginI18n = () => (key, ...args) => typeof LOCALES.en[key] === 'function' ? LOCALES.en[key](...args) : LOCALES.en[key] || key
      window.jsx = window.jsxs = (type, props) => ({ type, props })
      const source = Array.from({ length: 10 }, (_, i) => '# Section ' + i + '\n\n' + 'Long paragraph. '.repeat(900) + '\n\n').join('')
      const props = { content: source, currentPath: '/vault/long.md', vaultPath: '/vault', allFiles: [], allAssets: [], onNavigate() {}, onEdit() { window.editedFullLength = source.length } }
      function dom(tree) {
        if (tree == null) return document.createTextNode('')
        if (typeof tree !== 'object') return document.createTextNode(String(tree))
        if (tree.type === MarkdownView) {
          const article = document.createElement('article')
          article.innerHTML = marked.parse(tree.props.content, tree.props)
          article.ondblclick = tree.props.onEdit
          return article
        }
        const node = document.createElement(tree.type)
        if (tree.props.className) node.className = tree.props.className
        if (tree.props.ref) tree.props.ref.current = node
        if (tree.props.onClick) node.onclick = tree.props.onClick
        const children = tree.props.children == null ? [] : Array.isArray(tree.props.children) ? tree.props.children : [tree.props.children]
        children.forEach(child => node.appendChild(dom(child)))
        return node
      }
      window.readingProps = props
      window.renderReading = () => {
        effects = []; cursor = 0
        const tree = ProgressiveMarkdownView(props)
        document.getElementById('mount').replaceChildren(dom(tree))
        effects.forEach(fn => fn())
      }
      window.totalReadingPages = splitReadingPages(source).length
      window.renderReading()
    })
    await page.waitForTimeout(100)
    assert.equal(await page.locator('.ov-reading-page').count(), 1)
    await page.getByRole('button', { name: 'Load more', exact: true }).click()
    assert.ok(await page.locator('.ov-reading-page').count() > 1)
    await page.evaluate(() => { document.querySelector('.ov-main').scrollTop = 1e8 })
    await page.waitForTimeout(150)
    assert.ok(await page.locator('.ov-reading-page').count() >= 3, 'scroll loads the next section')
    await page.keyboard.press('Control+f')
    await page.waitForTimeout(100)
    assert.equal(await page.locator('.ov-reading-page').count(), await page.evaluate(() => totalReadingPages))
    await page.locator('.ov-reading-page').last().dblclick()
    assert.equal(await page.evaluate(() => editedFullLength), await page.evaluate(() => readingProps.content.length))
    await page.evaluate(() => { document.querySelector('.ov-main').scrollTop = 900; document.querySelector('.ov-main').dispatchEvent(new Event('scroll')) })
    await page.waitForTimeout(300)
    await page.evaluate(() => remountReading())
    await page.waitForTimeout(100)
    assert.equal(await page.locator('.ov-reading-page').count(), await page.evaluate(() => totalReadingPages), 'remount restores loaded sections')
    assert.equal(await page.evaluate(() => document.querySelector('.ov-main').scrollTop), 900, 'remount restores scroll position')
    await page.evaluate(() => {
      readingProps.content = '# Replacement note\n\nEntire replacement.\n'
      renderReading()
    })
    assert.equal(await page.locator('.ov-reading-page').count(), 1)
    assert.match(await page.locator('#mount').innerText(), /Entire replacement/)
    console.log('Vault View browser reading: OK (button, scroll, full-text search, edit handoff, content reset)')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
