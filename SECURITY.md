# Security policy

## Supported versions

Security fixes are provided for the latest published Vault View release.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository’s **Security → Advisories → Report a vulnerability** action to send a private report to the maintainers:

`https://github.com/ergocogn/hermes-desktop-plugin-vault-view/security/advisories/new`

Include a concise description, impact, reproduction steps, and a suggested mitigation when available. Never attach real vault contents, private paths, environment values, credentials, tokens, or client data. Use synthetic examples.

The maintainers will acknowledge a complete report, investigate it privately, and coordinate disclosure and release notes when a fix is available. No security certification or formal audit is claimed.

## Security boundaries

Vault View reads and writes files in the vault selected by the user. Unexpected access outside that vault, command-file injection, unsafe path resolution, unintended note-content disclosure, or unexpected external network activity should be treated as security-sensitive.

Vault auto-detection is deliberately allow-listed to `WIKI_PATH`. Vault View asks the already running Hermes gateway for that single value and searches only that path and its parents for `.obsidian`; it never reads, returns, logs, or stores the rest of `.env`. The selected vault root is kept in Hermes namespaced local plugin storage, not in the plugin source or documentation.

Generated `.obsidian/hermes-desktop-*.json` bridge files contain vault-relative display state only. They contain no note body, credential, environment dump, or absolute vault path. Treat them as local runtime metadata and exclude them from public vault repositories.
