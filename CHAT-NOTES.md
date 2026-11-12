# Conversation → Vault View 0.5.1 (local candidate, not published)

For a requested file, use `vault_view_present_note` and include its returned `media` value **exactly once**. Do not also emit `::vault-note`: Desktop already renders the attachment as a Vault View card, and clients without the plugin show the directive as raw text. The tool returns this delivery guidance in English and French; it does not modify another plugin or skill. The legacy directive below is only for Desktop-only navigation and older conversations.

The supported Desktop SDK transcript action opens a Markdown note **inside Vault View**, not in the external Obsidian application:

```text
::vault-note{vault="MyVault" path="Notes/Review été.md"}
```

Emit this directive alone in an assistant-message paragraph, outside a code fence. `vault` is the exact configured vault folder name; `path` is its exact relative `.md` filename, with literal spaces/Unicode, not URL encoding. Do not use an `obsidian://` Markdown link for this internal action. Existing external links are not rewritten.

The directive renders a compact Markdown file card with its filename and two actions: **Open in Vault View** and **Download**. Its spacing, colors and buttons follow the Hermes Desktop file card. A click on Open creates a **fresh Vault View tab**. Download asks Hermes to save the verified `.md` file through the public SDK gateway download action; it never modifies the source note. Neither action replaces, closes, saves or discards an existing editor draft, writes into the chat composer, or submits another agent prompt. Nothing starts during rendering/streaming. The chat containing the card must be focused; async context/vault changes abort either action. On a host without the SDK download action, Download reports that it is unavailable.

The action accepts only relative Markdown paths in the configured vault. Absolute paths, protocols, traversal, control characters, encoded paths and internal metadata/trash paths are refused. Existing canonical containment/stat checks also reject missing notes and symlink escapes. No external opener or protocol protection changes are introduced.

Compatibility is feature-detected: requires the public SDK `TRANSCRIPT_DIRECTIVE_AREA`, directive `sessionId` and focused-session atoms, plus the existing Vault View Unix/WSL transport. On unsupported/disabled clients the directive may stay literal or refuse; use the native Vault View palette/open-tab bridge instead. Version 0.5.1 identifies this local correction; no core patch, new runtime dependency, published release/tag or settings migration is involved.

## Client installation and activation

The entry file is resolved by the Desktop main process on the client computer, not by the remote WSL gateway. In that client, Capabilities → Plugins → the small folder icon on the **Vault View row** reveals the exact installed file. Do not guess this folder from a source checkout or a Windows share. Preserve live drafts before replacing code: hot reload can reconstruct plugin state.

Unified packages have a `.hermes-package.json` marker and are opt-in. A fresh Desktop user-data directory does not inherit another client's enable choice. Keep the marker and use the native Desktop switch; do not force activation by editing storage or deleting the marker. If that marker points at a source package, update its verified authoritative code too, otherwise native reconciliation may restore older bytes. Never follow an unverified marker path automatically.

The standard `::preview` and MEDIA cards are owned by the host. Vault View's card follows their presentation but does not reuse their private component or provide a native Preview action. Its download action uses the public SDK gateway save function, with the validated canonical path. The legacy directive remains the supported navigation extension for Desktop-only installs; the optional agent tool and media renderer below provide a portable file card without a core patch or protocol bypass.

## Portable file delivery (unreleased local candidate)

When the optional agent half is installed and enabled in the same unified package as the Desktop half, Vault View records its configured vault root in a private gateway-side file. `vault_view_present_note` checks an existing vault-relative `.md` path against that root and returns a canonical `MEDIA:` reference. `WIKI_PATH` remains a fallback for standalone agent installs. The agent includes that reference in its reply only when the user asked to see or download the note. Hermes then shows its ordinary file card on clients without Vault View, including Android clients that support Hermes file attachments. The Desktop SDK `TOOL_MEDIA_RENDERER_AREA` replaces that card with the two-action Vault View card only when Hermes confirms that the file came from this package's tool and the Desktop vault matches. A direct Desktop-only install or a disabled agent half keeps the native file card. The existing `::vault-note` directive remains for older chats.

This path requires a Unix/WSL gateway and a configured Desktop vault, or `WIKI_PATH` for an agent-only install. On explicit delivery, the tool stages an exact byte snapshot in Hermes's document cache, with private file permissions; the note source is unchanged. The download filename uses the complete title with ASCII transliteration and hyphens between words, avoiding clients that parse MEDIA paths only up to whitespace. Vault View displays the original note name. Each delivery has a unique path so an earlier search result naming the source note cannot take ownership of its media card. Notes over 32 MiB or changing during the read are rejected. Delivered snapshots remain available for chat attachments under the host cache lifecycle. The tool does not deliver notes during background operations, and the existing separate agent-guidance opt-in remains off by default. No Android plugin is required, but the exact Android app's file-card behavior still needs a live check.

An existing conversation can retain its earlier tool list after a plugin is enabled. In that case, start a new conversation or explicitly reload its tools before asking for a new file card. An old `::vault-note` reply cannot become a portable attachment retroactively.

## Conversation-bound agent navigation (unreleased local correction)

The bridge command file is shared by the vault, so a delayed command could previously be applied after Desktop focus moved to another conversation. The draft's optional guidance now carries the originating `sessionKey`; the agent must copy it into each command. The bridge rejects missing or inactive session keys, including older unscoped commands, and checks again after asynchronous scans and before opening a tab. A rejected command returns a localized error; it can be requested again from the original conversation. The shared state file is not a source for the originating session key. This change does not mutate note contents or user attachments.

## Acceptance on the real Desktop

1. Preserve any live draft before a plugin reload; do not disable/re-enable the plugin as a shortcut.
2. Confirm the plugin root actually used by this Desktop client. Updating gateway-side copies alone does not establish Windows client activation.
3. Present a directive in the conversation for an existing note whose filename includes spaces and accents.
4. Leave a distinguishable unsaved draft in another Vault View tab. Click the new button; confirm the requested title/content and the retained draft when returning.
5. Present an invalid `../outside.md` action; it must not become an opening button. Keep standard unknown protocols and Preview/iframe restrictions unchanged.

Automated test: `node tests/transcript-note.cjs` (synthetic fixtures and SDK harness, real POSIX canonical/stat operations; **not** a Windows UI test). Native Windows click/loaded-client behavior must be recorded separately.
