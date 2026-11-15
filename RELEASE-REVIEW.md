# Vault View 0.5.2 — release review

Review date: 2026-11-15. This section records the 0.5.2 candidate; the 0.5.1 review below is historical evidence only.

## Candidate and upstream rules

- Runtime JavaScript SHA-256 (both entry points): `6707364385fa7894cee6de1ab54e106e5c8f6a676b64d6f645b8d6004acd02e3`.
- Agent entry point SHA-256 (unchanged): `45d22909f8be13ba4ee28782355c54ca8e63a987052b02922932061354b8298b`.
- Official SDK documentation, catalog policy and entry schema, and Desktop surface lint reviewed at Hermes upstream commit `fd8a6c41ace59b476193c61002ce6a86d667b18a`.
- The changed UI uses existing public transcript directives, tool-media renderer fallback, `host.openWorkspace`, `host.paneVisibility`, SDK localization and React. No new SDK import, platform claim, capability or minimum Hermes requirement. The manifest still requires Hermes >=0.21.5 and declares the Unix gateway platforms through the catalog entry.
- The catalog currently pins the published 0.5.1 public commit `224c5b5ad8cef5ffd4884216d16c8481077407d8`. A catalog SHA and asset update requires a separate reviewed PR; repository publication alone does not update installs from the catalog.

## Behavior and privacy review

- The left toolbar button controls the explorer and the right controls the context panel. Restored tabs anchor to the conversation only when no registered Vault View pane remains, then group with that pane.
- Deep-link cards retain Download and one localized note action: Open while its note tab is closed or masked, Hide while open. Reopening restores or focuses the existing tab without replacing a different draft. Hiding preserves tab metadata and editor snapshots.
- Transcript and tool-media actions continue to check the focused conversation and validated vault path. Unsupported, disabled, unowned or mismatched tool results retain the native file card. No new network source or agent draft mutation was introduced.
- Existing network inventory remains explicit external navigation, SDK SandboxedFrame for embedded pages, and remote Markdown images only after the separate persistent opt-in. Existing agent guidance remains a separate default-off opt-in; disabling either preference removes stale plugin data while preserving user attachments and note source.
- English/French bundles cover the new action. Automatic Hermes locale and manual overrides are covered by the locale suite; note contents are not translated.

## Candidate checks

- `node tests/candidate-version.cjs`: passed.
- `node tests/verify.cjs --browser` with Playwright 1.64.0 and its Chromium 1248 browser: passed, including source integrity, locale/privacy policy, workspace tabs, remote request blocking and responsive browser behavior.
- Installed Hermes validator API `validate_plugin_dir`: all 16 checks passed, including capability probe, security scan, core override and Desktop surface; zero warnings. This is a local installed validator run, distinct from current upstream admission CI and live Desktop.
- Installed Desktop surface lint: zero refusals and zero review cues. Manual public SDK and catalog rule review remains separate from these scanner results.
- `git diff --check`: passed. The Desktop and catalog JavaScript entry points are byte-identical.

## Checks not established by this candidate

- The synthetic POSIX transcript and file-race tests, WSL integration and native Windows/macOS/Linux gateway checks were not rerun here. WSL access was denied in this environment. The earlier 0.5.1 checks do not count as 0.5.2 results.
- No live Hermes reload, clean install, tab placement check or unsaved-draft handoff was performed for this candidate; an on-disk file does not establish the module currently loaded in Hermes. The browser and mocked SDK checks do not establish native layout behavior.
- Public commit, tag, release assets, catalog PR and running-module version are recorded separately once verified. A maintainer merge is never inferred from a submitted PR.

---

# Vault View 0.5.1 — pre-publication review

Review date: 2026-11-12. This is an unpublished candidate, not a security certification or a catalog admission decision.

## Source and scope

The reviewed runtime consists of plugin.js, its identical desktop/plugin.js entry point, plugin.yaml and the optional __init__.py agent entry point. No other extension or skill is installed, modified or bundled.

Runtime SHA-256:
- JavaScript entry points: a2a719073838c9ef23a2b62446b18796b09336a548e9673a3fcc643a950816ee
- Agent entry point: 45d22909f8be13ba4ee28782355c54ca8e63a987052b02922932061354b8298b

The public candidate is prepared separately from installed runtime data. A public source commit and catalog asset pins must be assigned and checked before publication; no tag, public push, release or catalog update is claimed here.

## Official requirements reviewed

Hermes upstream commit: 67664e236ddcc45824b871d575677287599af152.

- [Desktop SDK and tool-media ownership](https://github.com/NousResearch/hermes-agent/blob/67664e236ddcc45824b871d575677287599af152/website/docs/developer-guide/desktop-plugin-sdk.md).
- [Agent registration](https://github.com/NousResearch/hermes-agent/blob/67664e236ddcc45824b871d575677287599af152/website/docs/developer-guide/plugins/index.md).
- [Catalog policy and entry schema](https://github.com/NousResearch/hermes-agent/blob/67664e236ddcc45824b871d575677287599af152/plugin-catalog/README.md).
- [Desktop static admission lint](https://github.com/NousResearch/hermes-agent/blob/67664e236ddcc45824b871d575677287599af152/hermes_cli/plugin_validate_desktop.py).

The renderer claims only vault_view_present_note from its own unified package. Unsupported, disabled, unowned or mismatched results retain the host file card. Optional SDK additions are feature-detected. The existing named SandboxedFrame import requires Hermes >=0.21.5, declared in the manifest. Transport requires a Unix gateway; Windows Desktop with a WSL Unix gateway is distinct from a native Windows gateway.

## Privacy, network and mutation inventory

- The optional delivery tool reads only an explicitly requested, validated Markdown note in the configured vault. It stages exact bytes under a unique private host document-cache path, with 0600 file permissions, a 32 MiB limit and revision checking. Canonical containment and invalid-path checks reject traversal, metadata paths and escaping symlinks. Attachments are retained for conversation use; the source is unchanged.
- The audit reproduced an intermediate-directory symlink substitution after canonical validation. The candidate now walks from an opened vault directory through no-follow directory descriptors and validates the final regular file without following a replacement symlink. Nonblocking open plus a regular-file check rejects FIFO substitutions. Synthetic regression tests verify failure without a staged attachment or leaked descriptors.
- Desktop stores the chosen vault in namespaced plugin storage and synchronizes a private gateway-side root setting. No private path is embedded in distributed source.
- Existing local writes comprise explicit note/file operations, namespaced plugin state, vault-relative display bridge metadata, private temporary scan manifests and image previews. Temporary manifests/previews are cleaned up. No external skill, credential store or Hermes core function is changed.
- Optional remote Markdown images contact their own providers only after persistent opt-in, with no referrer. External web navigation is explicit and uses the public SDK SandboxedFrame with default containment or an explicit external-browser action. The agent module has no network client, telemetry or updater.
- Agent guidance and active-note metadata are separate default-off options. Middleware removes stale plugin attachments when disabled while retaining user attachments. Note bodies are not attached automatically. Explicit selection quoting and explicit note attachment are user actions.
- Guidance, errors and controls use English/French locale selection, including automatic Hermes locale changes and manual overrides. Note contents are never translated.

## Verification evidence

Passed against runtime bytes listed above:
- Core verification: syntax, package identity, behavior, privacy/locale policy, inert Canvas content and confined explicit navigation, workspace/session isolation, byte integrity, atomic saves, caches, progressive reading, attachment dispatch, image boundaries and concurrent scan cleanup.
- Playwright/Chromium browser suite: editing, source round-trip, responsive controls, lazy images, remote-request blocking/opt-in and reading navigation.
- Real WSL synthetic integration: Unicode reads and atomic writes, scan isolation/private permissions, ffmpeg thumbnails and image decoding.
- Current upstream Desktop lint: no refusal or review-cue findings.
- Official validator: manifest, declarations, capability probe, security scan, core overrides and Desktop surface passed on the isolated candidate. The current upstream orchestrator was run in an isolated audit process using existing Hermes dependencies; the installed Desktop, core-override, locale, private-import and security-scan modules were verified byte-identical to the upstream commit. This did not replace modules in the running service. The process emitted a host-library DeprecationWarning; the candidate report contained no warnings.
- Synthetic POSIX delivery, directory/FIFO races and transcript actions passed; this evidence is separate from native UI evidence.

Live evidence for the preceding delivery version (agent SHA-256 b2352ac799e85282c4b46ed226c64a7ebb8e4a3107da032a6997335f4a1b2a2b):
- A fresh conversation used the unchanged external Obsidian skill and the corrected Vault View tool. The stored reply contained one MEDIA tag and no legacy directive.
- Desktop displayed one Download / Open in Vault View card. Opening selected the requested note in a fresh tab. A real native download matched source and snapshot bytes; the temporary verification copy was removed.
- The user confirmed that the same response showed one native card on Android and downloaded successfully.

Live evidence after the directory-descriptor hardening (agent SHA-256 listed above):
- The corrected module was installed and the conversation service restarted with explicit user authorization. Installed source hashes matched the candidate. The external Obsidian skill remained identical to its original backup.
- A new conversation produced exactly one MEDIA reference and no legacy directive. The tool succeeded, the snapshot matched the source bytes, and file permissions remained 0600.
- Desktop displayed one two-action card and opened the correct note. Its native save dialog proposed the correct full filename; the final save was interrupted by the user, so this is not recorded as a completed new Desktop download. The Desktop JavaScript is unchanged from the preceding completed download test.
- The user tested this new candidate on Android and reported that the tests looked correct. This is user-reported evidence, distinct from automated verification and direct Desktop observation.

## Limits and publication gates

A model can still disregard delivery guidance; it is not a deterministic output filter. Older messages are not rewritten. No universal client support or native Windows gateway support is claimed.

The directory-descriptor hardening is installed in the running service. The evidence above distinguishes the new live checks from the earlier completed Desktop download. No claim is made that every native check was repeated.

Clean installation/enable-disable and complete native validation across macOS/Linux hosts, external application associations, prolonged memory use, and the complete draft/conflict/keyboard/theme matrix have not been repeated for this candidate. Mocked launches do not establish native OS behavior.

The public tree must contain no local installer marker, configuration, private screenshots, raw logs, credentials, real notes or internal conversation history. Existing demonstration assets must remain the reviewed public assets.

The catalog currently references the published 0.5.0 source with no agent tool. A future catalog update needs the exact reviewed public commit, matching asset pins/version and provides_tools: [vault_view_present_note]. Maintainer merge and catalog availability remain separate from a repository release.
