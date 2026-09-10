# Security

Security fixes are provided for the latest Vault View release.

## Reporting a vulnerability

Do not open a public issue. Use [GitHub private vulnerability reporting](https://github.com/ergocogn/hermes-desktop-plugin-vault-view/security/advisories/new) and include a concise description, impact, and reproduction steps using synthetic data.

Never attach real vault content, personal paths, environment values, credentials, tokens, or client data.

## Security boundaries

Vault View reads and writes files only in the vault selected by the user. Unexpected access outside that vault, unsafe path handling, unintended note disclosure, or unexpected network activity should be reported as security-sensitive.

Automatic detection reads only the configured `WIKI_PATH` value, not the complete environment file. The selected path stays in private local plugin storage. Runtime bridge files contain vault-relative display state, not note bodies, credentials, environment dumps, or absolute vault paths.
