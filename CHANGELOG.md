# Changelog

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
