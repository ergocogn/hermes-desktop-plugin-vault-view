# Release candidate validation

This checklist describes the 0.4.7 candidate. An Unreleased entry is not a published release, and passing automated checks does not certify every operating system or Hermes layout.

## Automated checks completed

- JavaScript syntax and plugin behavior checks.
- Exact UTF-8/binary transport, long notes, obsolete-read cancellation and atomic save integrity.
- Revision-aware note/image caches, memory eviction and changed-file invalidation.
- Progressive reading, Markdown block boundaries, source preservation and conflict handling.
- Browser editing, responsive layout, lazy images, image detail dialog and session-state subscription.
- Native browser undo/redo commands; history is not retained across editor reconstruction.
- Mocked Windows/macOS/Linux launch paths, quoted filenames, explicit launch failure and explorer fallback.
- Installed gateway classification: reproduce the encoded PowerShell rejection and verify direct association/URI/reveal commands are not classified as dangerous. This checks policy compatibility without launching applications.
- Real ffmpeg preview generation and decoding using synthetic WSL fixtures.
- Real WSL inventory scanning with Unicode filenames, verified 0600 manifest permissions and removal of temporary files.
- Escaped raw HTML, neutralized executable Markdown link schemes, restricted external image schemes and rejected shell RPC error envelopes.
- Public SDK imports; no new dependency on private Hermes APIs or automatic note-content sharing.
- Concurrent scan isolation and bounded page reads, private manifest cleanup, image-path traversal rejection, and removal of stale note metadata after sharing is disabled.

Temporary generated previews use private file permissions and are removed after reading. Diagnostics retain categorized errors rather than note contents, paths or raw command output.

## Checks still required inside Hermes

- Clean install, enable/disable, plugin reload and application restart.
- One and several open notes across at least two conversations; retain the shared tab inventory without duplicates, respect explicit hiding, and preserve unsaved drafts.
- Agent `open-tab`/`open-tabs` adds notes; `navigate` replaces only the specified tab.
- Actual external application association, including names with spaces, Unicode and quotes; unavailable associations must produce the documented fallback/error. Direct Obsidian opening is currently hidden and must not be advertised as working.
- Undo/redo during source and visual editing, formatting, composition and saving; confirm the documented history reset boundaries.
- External edits, save conflicts, replaced images, light/dark themes, narrow layouts and keyboard navigation.
- Representative large notes and screenshots: first loading, back/forward navigation, image detail reopening and prolonged memory use.
- Native Windows, macOS and Linux hosts with their supported backend configurations.

Do not publish claims that these manual checks passed until they have actually been performed. Use synthetic data for public reports and screenshots; exclude personal paths, environment values, infrastructure details and real notes.
