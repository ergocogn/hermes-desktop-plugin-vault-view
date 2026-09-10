# Contributing

Bug reports, ideas, and pull requests are welcome.

## Before opening an issue

Search existing issues and use a synthetic example whenever possible. Include the Vault View and Hermes Desktop versions, operating system, reproduction steps, and expected behavior. Remove note contents, personal paths, environment values, credentials, tokens, and client data from logs and screenshots.

## Pull requests

1. Keep the change focused.
2. Update tests and documentation when behavior changes.
3. Run `node --check plugin.js` and `node tests/run-tests.cjs`.
4. Test the change in Hermes Desktop.

Keep `vault-view` as a standalone Desktop Plugin based only on public Hermes SDK capabilities. Do not add machine-specific paths or automatic note-content sharing.

Contributions are licensed under the repository’s [MIT License](LICENSE).
