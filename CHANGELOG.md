# Changelog

## 0.4.8 - 2026-10-04

### Fixed

- Remove observation and rewriting of Hermes transcript nodes, stop inspecting the host tab strip, and use the public workspace visibility API for Vault View tabs.
- Scope the remote-image preference update to Vault View roots and localize the remaining code-copy, callout, link, image and agent-context text in English and French.
- Keep the direct-install and package entry points identical. No vault note migration or automatic content sharing is introduced.

## 0.4.7 - 2026-09-28

### Security and privacy

- Replace the raw Electron webview with the public SDK SandboxedFrame and its default opaque-origin sandbox. Embedded pages do not share the Hermes preview partition. Some sites refuse embedding; the external browser action remains available. Guest navigation history is not accessible across origins, so unavailable Back/Forward actions are removed.
- Add a separate opt-in setting for relevant-request agent navigation guidance, disabled by default. Disabling it removes stale guidance attachments without removing user attachments or enabling note sharing. Guidance follows the selected language and Hermes locale.
- Block remote note images by default. An explicit setting permits their requests with no referrer; switching it off removes existing remote sources. Markdown image references and local previews remain intact.

### Fixed

- Route errors, notifications, prompts, confirmations, bridge messages, image controls, callout labels and formatting defaults through complete English/French locale bundles. Imperative calls follow the Hermes locale in automatic mode.
- Require Hermes >=0.21.5 in plugin and catalog metadata. List Linux and macOS transport platforms explicitly; Windows Desktop requires a WSL-hosted Unix backend rather than a native Windows gateway.
- Keep both plugin entry points and package version synchronized. Add regression checks for SDK embedding, independent privacy controls, language switching and remote-image network behavior.

## 0.4.6 - 2026-09-27


### Fixed

- Isolate concurrent vault scans with private unique temporary manifests, bounded page reads and cleanup after failures. Preserve the published image allow-list, canonical containment checks and scans that do not follow symbolic links. Remove stale active-note metadata when agent sharing is disabled, and avoid collisions between concurrent bridge writes.
- Temporarily hide direct Obsidian opening from the note toolbar and context menu because reliable Desktop protocol dispatch remains unresolved. Copy-link and file-reveal actions remain available.
- Use platform association handlers for external attachments when available. Remove PowerShell scripts (both encoded and ordinary execution are rejected by the desktop gateway), use direct Explorer arguments for reveal fallback, and test generated commands against the installed gateway classifier. Use platform URI openers on macOS/Linux; remove silent background shell launches and installation-path assumptions.
- Reject shell RPC error envelopes; neutralize executable Markdown link schemes and unsupported external image schemes while preserving their source text.
- Reuse revision-checked note contents and cached Markdown rendering when navigating back to notes. Keep bounded LRU caches for generated previews and original image details, show known previews immediately during validation, and prioritize visible file reads over new background indexing work.
- Remove redundant saved/modified title icons; retain only saving progress and failure feedback beside the note title.
- Clicking a tag in the bottom strip searches matching notes instead of modifying the note. The note picker accepts case-insensitive `#tag` queries and nested tags; insertion remains in the editing toolbar.
- Share asynchronous ffmpeg discovery between concurrent preview requests. Previously later images could see an unfinished probe as unavailable and read/cache the original instead. Retry negative discovery and cached original fallback after 30 seconds.
- Place saving progress and failure feedback as accessible icons at the top right of the note title. Use icons with tooltips for image detail zoom/close controls.
- Fall back to the host file explorer when attachment launching fails. Use mapped native paths for Windows/WSL, the macOS opener on Darwin, and the Linux opener otherwise; report failure only if both opening and revealing fail.
- Make note tags use the theme accent, show inline and frontmatter tags in the bottom strip, and let users insert a tag through the formatting toolbar .
- Give the right outline/links panel the theme sidebar background and a separating border.
- Reuse serialized unchanged editor groups instead of cloning every block on each input; avoid layout reads for ordinary active-block text, repeated tab-state writes and repeated file-tree/right-panel renders while typing.
- Keep headings, emphasis and code styled while their Markdown source is active, with muted syntax markers and tags. Preserve the caret while updating the active block.
- Move the note's tag strip below its body and align note/title padding to the available width, without a fixed 760-pixel reading column.
- Show sidebar buttons as pressed toggles and retain the right-sidebar close button so it can also be hidden in narrow layouts.
- Open Windows attachments through the default file association rather than a file URL; report launch failures. macOS/Linux use the platform opener when needed.
- Move the historical UTF-8 alignment regression helper out of production code into a test fixture.
- Preserve every byte across read boundaries. Recover from altered or incomplete base64 responses using bounded hexadecimal reads, and reject files changed during a read.
- Verify the exact staged note content before atomic replacement; retain a recovery copy when saving a file previously decoded with invalid UTF-8.
- Revalidate image cache entries against disk revisions, bound cache memory, retry failed images on click, and discover bundled ffmpeg without a machine-specific path. Large originals remain readable when thumbnails are unavailable.
- Render a different note even when its text matches the preceding note, so relative links and images resolve against the correct path.

### Added

- Public AI contribution guide, bilingual release documentation, catalog banner and metadata-only Desktop packaging. Root and catalog entry points are byte-identical.

- Preview compatible image/text/code attachments inside a plugin workspace on file-tree click. Add explicit preview and external-application actions to the attachment context menu. Unsupported files or unavailable workspace APIs retain association/explorer fallback. HTML/code previews remain inert source text.
- Undo and redo icon actions in the editing toolbar, using the browser editing history.
- Reassert retained note panes after a Hermes conversation change through the public session-state subscription, preserving pane IDs and respecting explicitly hidden Vault View panels.
- Generate previews for all local raster images when ffmpeg is available, load images near the viewport, and limit concurrent preview reads to two. SVGs remain vector images and external images use browser lazy loading.
- Open an image detail dialog from reading or visual editing, retaining the preview while loading the original separately. Include fit/100% viewing, Escape/close, and cancellation when the dialog closes. Image double-clicks no longer enter note editing.
- Preserve the original Markdown of unchanged editor blocks, including line endings, list and emphasis markers; serialize only changed groups of blocks.
- Remember reading position and loaded sections per tab across remounts, with at most 32 note positions per tab.
- Compare the draft and disk version after a save conflict, copy the current draft, continue editing, or explicitly confirm reloading the disk version.
- Bound raw note caching to approximately 16 MiB while retaining compact link/tag summaries for the graph. Index refreshes check revisions before rereading content.
- Skip full editor parsing for typing echoes, cancel obsolete note loads, and pause disk polling in inactive/hidden tabs. Unchanged notes progressively reduce polling frequency.
- Progressive visual reading for long notes: load sections automatically near the end of the viewport, use “Load more”, or display the entire note. Outline navigation reveals the target section and Ctrl/Cmd+F reveals all sections. Markdown blocks remain intact; editing and saving always use the complete source.
- Let the browser defer rendering off-screen reading sections while retaining the loaded DOM and full note source.
- Reveal Markdown markers in the active heading, paragraph, list or quote while editing. Formatting actions work on that visible source; complex widgets keep their existing editing behavior.
- Note header save status and a collapsible list of simple frontmatter properties.
- A private failure log in settings, with repeated incidents grouped, seven-day retention, diagnostic copying and clearing. Exports contain no note content, names, paths or exception messages.

### Compatibility

- Uses the existing Hermes SDK and shell gateway; no Hermes upgrade or new backend is required. Unix/WSL shell utilities remain required by the plugin. Large-image fallback without ffmpeg can be slower.
- Automated browser, integrity, cache and synthetic WSL integration checks pass. Native macOS/Windows launch validation remains incomplete; external opening depends on the host/backend configuration. Direct Obsidian opening is hidden.


## 0.4.5 - 2026-09-19

### Fixed

- Use explicit macOS and Linux command variants when checking file revisions and resolving canonical image paths, so normal note reads and local image hydration work on both supported platforms.
- Avoid GNU-only option separators in chunked file reads.

## 0.4.4 - 2026-09-18

### Security

- Keep local image resolution and reads inside the selected vault. Unresolved or traversal references are no longer emitted as readable local paths, canonical paths are checked again before reading, and asset scans no longer follow symbolic links.

## 0.4.3 - 2026-09-10

First public-ready release of Vault View.

### Highlights

- Search, read, create, edit, rename, move, and delete Markdown notes from Hermes Desktop.
- Navigate through wikilinks, backlinks, outlines, tags, folders, and the vault graph.
- Open several notes in tabs with independent Back and Forward history.
- Work with the Obsidian CLI integration already configured for the Hermes agent.
- Automatically detect the configured vault and external note changes.
- English and French interface with Hermes Desktop language following.
- Local-first design with note-content sharing disabled by default.
