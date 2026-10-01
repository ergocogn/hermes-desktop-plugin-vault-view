# 0.4.7 release review

## Post-review correction candidate — 2026-10-01

This correction removes the Hermes transcript observer and text/attribute rewriting, drops the `<ide_opened_file>` wrapper, uses only Vault View's own tab as an optional workspace anchor, follows SDK pane visibility instead of listening to Hermes tab-strip DOM events, scopes remote-image toggling to Vault View roots, and localizes the remaining copy button, quote, link, image, and agent-context labels. The cosmetic tab-strip CSS was removed too. The version stays 0.4.7; the published tag is unchanged. The root and `desktop/` entry points remain identical because the documented direct disk install loads the root file while package installation uses `desktop/plugin.js`.

The upstream `NousResearch/hermes-agent` main revision observed for this review was `34f8ec3b407e50bad3ae27e4cd79d65212061356`. Its pinned public SDK documentation, catalog admission policy, schema validator and Desktop surface lint source were inspected for disk/package entry points, SDK-only Desktop access, exact SHA pins, platform meaning and minimum Hermes version. The local Desktop lint copy matches the inspected rules and reported no findings. The standalone catalog validator could not run because `ruamel.yaml` is unavailable; the full `hermes plugins validate` command also remains unverified.

`node tests/verify.cjs --browser` passed with Playwright/Chromium, including remote-image request and Markdown-source checks, locale-bundle parity, and source editing. This is browser harness evidence, not a live Hermes run. WSL gateway integration, native OS dispatch, actual installed-module reload, the standalone catalog validator and the full Hermes plugin validator were not run for this candidate. The PR pin, public release, index status, development push and running plugin must each be verified independently before any publication claim.

Network inventory: remote Markdown image providers receive requests only after the separate persistent image opt-in; external Markdown links open a SandboxedFrame preview after a user click or use the operating-system external opener after a user click. Local note and image reads use the selected Hermes gateway; the plugin has no self-update or remote code loader. Draft inventory: the composer can add a capability pointer only after the separate persistent agent-guidance opt-in, active-note metadata only after its own sharing opt-in, and a note body only through the user's explicit attachment action. Both automatic opt-outs remove stale plugin attachments without deleting user attachments or note source.

## Verdict

The candidate passes the automated checks listed in RELEASE-CHECKLIST.md. No unresolved security defect was identified in this review, but this is not a guarantee of absence of vulnerabilities or certification of every Hermes version. Manual validation remains partial, and native application dispatch has not been certified across all OS/backend configurations. These limitations are disclosed in the release documentation. Direct Obsidian opening is hidden and must not be advertised as working.

## Review fixes

- Catalog feedback: SDK SandboxedFrame replaces the raw webview; complete locale bundles cover imperative UI and bridge messages; separate opt-ins control agent guidance and remote images. Catalog policy and browser network/source-preservation tests verify these behaviors.

- Vault scans now use private unique temporary manifests instead of shared predictable filenames. Concurrent scans cannot overwrite each other's inventory, page readers are bounded to four per scan, and cleanup waits for all readers even after failure.
- Image candidates are normalized and confined to the selected vault's path namespace. Relative traversal cannot select an arbitrary image outside the vault. Scans do not follow symlinks; canonical containment is checked before image previews and original reads, preserving the published security boundary.
- Draft enrichment removes old active-note metadata before applying current sharing preferences. Switching sharing off removes previously attached plugin metadata. Repeated enrichment does not accumulate attachments.
- Concurrent bridge writes use distinct staging names, private permissions and failed-write cleanup.

## Resource and context behavior

- Note reads and image results are validated against file revisions. Navigation reuses unchanged text/rendering; original image details and generated thumbnails use bounded caches.
- File indexing has two workers and yields new jobs during visible reads. Raster preview reads have two workers. Near-viewport hydration avoids loading every attachment immediately.
- Inactive note polling pauses; unchanged active notes back off. The agent bridge still polls for display requests; those filesystem operations do not invoke a model or consume its context.
- Explicit cache budgets sum to approximately 96 MiB under conservative string accounting, before shared-string savings. This is not a total process-memory limit: open editor drafts, metadata, DOM, decoded images and in-flight files use additional memory.
- Unrelated prompts receive no Vault View context. Relevant prompts receive a small capability pointer only when the separate guidance setting is enabled; active-note metadata requires explicit sharing. Note bodies are not attached automatically. The separate composer action can insert note content when explicitly selected.
- Undo/redo uses browser editing history and does not survive editor reconstruction or note changes.

## Compatibility and security boundaries

The plugin uses public SDK imports and the existing gateway shell interface; it does not access the raw private Desktop bridge or require a Hermes modification. Hermes >=0.21.5 is required for the public SDK SandboxedFrame. Unix utilities remain necessary for file transport: Linux/macOS gateways or a WSL-hosted Unix backend for Windows Desktop. Native Windows gateways are unsupported. Remote images and agent navigation guidance are disabled by default. Mocked OS launch tests and gateway classification checks do not prove that a receiving native application actually opens a target.

Raw Markdown HTML is escaped. Executable link schemes are neutralized; HTML/code attachment previews are inert text. Temporary scan manifests and generated previews use private file permissions. Incident records contain categorized errors rather than note bodies, paths, credentials or raw command output.

Final publication checks: clean install/reload/restart, shared tabs across conversations, unsaved drafts and conflicts, narrow layouts/themes, actual external application opening, source/visual undo behavior, and the target OS/backend combinations. Keep unsupported configurations and remaining limitations visible in release notes.
