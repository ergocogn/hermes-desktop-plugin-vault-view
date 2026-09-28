# Vault View

![Vault View — Markdown, images and links in Hermes Desktop](assets/banner.png)

**Your Obsidian-compatible vault, directly inside Hermes Desktop.**

[English](README.md) · [Français](README.fr.md)

[![Release v0.4.7](https://img.shields.io/badge/release-v0.4.7-2563eb)](https://github.com/ergocogn/hermes-desktop-plugin-vault-view/releases/tag/v0.4.7)
[![Install in Hermes Desktop](https://img.shields.io/badge/Install%20in-Hermes%20Desktop-2563eb)](hermes://plugin/install?repo=ergocogn/hermes-desktop-plugin-vault-view)

![Vault View displaying a linked Markdown note, explorer, outline, and graph inside Hermes Desktop](screenshots/vault-view-light.png)

Vault View brings your Markdown knowledge base into the conversation. Find a note, ask Hermes to create or update it, follow its links, and keep several notes open in a workspace designed for a vault—not a generic file preview.

## What is new in 0.4.7

- SDK-sandboxed web previews, with Hermes >=0.21.5 required.
- Separate agent navigation guidance and remote-image settings, both off by default.
- Complete English/French errors, dialogs, bridge messages and formatting defaults.

- Reliable chunked reading and verified saves for long notes.
- Faster navigation with bounded, revision-aware caches and progressive reading.
- Live Markdown styling, source preservation, tag search and responsive sidebars.
- Lazy image previews, a detail viewer, and image/text/code attachment previews.
- Shared note tabs across conversations, editing undo/redo and private incident diagnostics.

Raster thumbnails use ffmpeg when available; original images remain available as a fallback. The filesystem transport requires Unix/WSL shell utilities. Direct Obsidian opening is temporarily hidden; external application opening depends on the host/backend configuration. Native Windows/macOS launch validation remains incomplete.

See [CHANGELOG.md](CHANGELOG.md) for the complete changes and [AGENTS.md](AGENTS.md) for the public AI contribution guide.

## Find. Create. Navigate.

| Search the vault | Create and edit | Explore connections |
| --- | --- | --- |
| Search notes, browse folders, filter tags, and inspect links. | Write directly or ask Hermes to work through its configured Obsidian CLI. | Follow wikilinks, use Back and Forward, open tabs, or jump through the graph. |

![Vault View settings showing vault detection, language selection, and privacy controls](screenshots/vault-view-settings.png)

## Features

- Visual reading and Markdown editing
- Note and folder creation, renaming, moving, and deletion
- Search, explorer, outline, tags, backlinks, outgoing links, and vault graph
- Wikilinks, Obsidian callouts, and local images
- Multiple tabs with independent navigation history
- Automatic refresh after changes made by Hermes, Obsidian CLI, or another editor
- Light and dark Hermes theme support
- English, French, or automatic Hermes Desktop language selection
- Icon-first controls with localized labels and tooltips

## How it works with Hermes

The Hermes agent keeps using its existing Obsidian CLI integration for note operations. Vault View provides the user-facing display and replaces the generic preview for Obsidian-related work. It can show one note, open several notes at once, or stay hidden for background-only operations.

The root `plugin.js` remains the standalone entry point. `plugin.yaml` contains catalog metadata only; `desktop/plugin.js` is an identical Desktop entry point for catalog installation. There is no Python component, Agent tool, or runtime dependency added.

## Installation

Vault View is a standalone Hermes Desktop Plugin. It requires no build step, npm package, or Python component.

### One-click installation

Open this page on the computer running Hermes Desktop, then select **Install in Hermes Desktop**:

[**Install Vault View in Hermes Desktop**](hermes://plugin/install?repo=ergocogn/hermes-desktop-plugin-vault-view)

Hermes asks for confirmation before installing. If the link is not available in your Hermes Desktop version, use the manual installation below.

### Manual installation

1. Copy this repository into the active Hermes Desktop plugin directory as `vault-view`.
2. Confirm that the entry point is `$HERMES_HOME/desktop-plugins/vault-view/plugin.js`.
3. Reload Desktop Plugins in Hermes Settings.
4. Enable **Vault View**.

Use the plugin directory shown by Hermes Desktop. The Desktop application and its backend may use different locations, especially with WSL or a virtual machine.

## Configuration

Vault View automatically looks for the vault already configured through Hermes `WIKI_PATH`. If no valid `.obsidian` vault is found, select its root in the settings panel.

The language setting offers **Follow Hermes Desktop**, **English**, and **Français**. The same panel controls tab restoration, panel layout, optional active-note metadata sharing, agent navigation guidance and remote images. All sharing/network options are independent and disabled by default.

## Privacy

- Vault files stay on the configured local filesystem.
- No token, credential, personal path, or vault content is embedded in the plugin.
- Full note content is never attached to the agent automatically.
- Optional active-note sharing is disabled by default and sends only lightweight metadata.
- Remote images remain blocked unless explicitly enabled; enabling them sends requests to their providers without a referrer. Explicitly opening a web link contacts its website through the SDK sandbox or external browser.
- Navigation guidance is an independent opt-in and is localized.
- The vault path remains in Vault View's private local plugin storage.

The screenshots use a synthetic demonstration vault. They contain no personal path, private conversation, or real note content, and their PNG metadata has been removed.

## Compatibility

- Hermes Desktop >=0.21.5 with Desktop Plugin support
- A local Markdown vault compatible with Obsidian
- Linux or macOS Unix transport. Windows Desktop can use a WSL-hosted Unix backend; native Windows gateways are not supported by the POSIX file transport.

## Support and contributions

Use [GitHub Issues](https://github.com/ergocogn/hermes-desktop-plugin-vault-view/issues) for support, bugs, and feature requests. See [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), and [SECURITY.md](SECURITY.md) before sharing logs or screenshots.

## Independent project

Vault View is an independent community project by ergoCogn sàrl. It is not affiliated with, sponsored by, or endorsed by Dynalist Inc., the maker of Obsidian, or by Nous Research, the maintainer of Hermes. Product names are used only to describe compatibility.

## License

[MIT](LICENSE) © 2026 ergoCogn sàrl
