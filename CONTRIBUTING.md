# Contributing

Bug reports, ideas, and pull requests are welcome.

## Before opening an issue

Search existing issues and use a synthetic example whenever possible. Include the Vault View and Hermes Desktop versions, operating system, reproduction steps, and expected behavior. Remove note contents, personal paths, environment values, credentials, tokens, and client data from logs and screenshots.

## Pull requests

1. Keep the change focused.
2. Update tests and documentation when behavior changes.
3. Run `node --check plugin.js` and `node tests/run-tests.cjs`.
4. Test the change in Hermes Desktop.

Keep the Desktop half based only on public Hermes SDK capabilities. The optional agent half must register only its declared tool, use synthetic examples, and deliver note files only for explicit user-facing requests. Do not add machine-specific paths or automatic note-content sharing.

Contributions are licensed under the repository’s [MIT License](LICENSE).

## Regression checks

Use `node tests/verify.cjs` for the core regression suites, or `node tests/verify.cjs --browser` to also require the Playwright browser suite. Set `PLAYWRIGHT_MODULE` if using an existing Playwright installation. See [REVIEW-PROCESS.md](REVIEW-PROCESS.md) for the upstream rule review and official/manual checks not covered by this runner.

On a POSIX filesystem, also run `python3 tests/portable-note.py`, `python3 tests/portable-races.py` and `node tests/transcript-note.cjs`. These use synthetic fixtures to verify delivery, path confinement during directory changes, special-file rejection and explicit conversation actions. `node tests/canvas-security.cjs` covers inert Canvas content and confined explicit navigation and is included in the core runner.

Run the focused suites in `tests/`: `file-bytes.cjs`, `io-diagnostics.cjs`, `progressive-reading.cjs`, `attachment-opening.cjs`, `image-preview.cjs`, `image-boundary.cjs` and `scan-isolation.cjs`. The browser suite `editor-browser.cjs` requires Playwright with Chromium; `PLAYWRIGHT_MODULE` may select an existing installation.

On Windows with WSL, run `wsl-read.cjs`, `wsl-image-preview.cjs` (ffmpeg/ffprobe required) and `wsl-scan.cjs`. The optional `gateway-opening.cjs` accepts `VAULT_APPROVAL_MODULE` pointing to the gateway policy module and checks classification without launching applications. All fixtures are synthetic.

Read [AGENTS.md](AGENTS.md) for AI-assisted contributions.

Run `node tests/catalog-policy.cjs` for SDK embedding, complete English/French locale bundles, imperative locale selection and independent agent-guidance/image privacy settings. The browser suite also verifies that blocked remote images make no request and preserve their Markdown source.
