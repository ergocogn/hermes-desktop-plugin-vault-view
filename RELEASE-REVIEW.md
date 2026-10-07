# 0.5.0 catalog admission review

## 2026-10-07 candidate

The exact tested public code candidate is commit `a98587b22643576920cb23d60134de79491d1035`, based on public release 0.4.8 at `532c9b95f204cafb224e33c8075c4a774ad6f7eb`. It supersedes the unpushed `71f7824117c5bd15edbfcca996d24479e97bb7cf` candidate after a live report showed that hiding and immediately restoring Vault View could lose open notes. Version 0.5.0 adds optional per-conversation workspaces, globally pinned tabs, explicit selection quoting, a localized empty-workspace card, responsive controls and versioned workspace storage. The migration changes plugin-local state only; it does not modify notes or attachments. The root and `desktop/` entry points are byte-identical.

The official SDK documentation, catalog admission policy/schema, catalog entry and Desktop surface lint were reviewed at Hermes upstream commit `808520532cf7c48c3eccb09476fb3cde379b02e9`. The new behavior uses the documented public `host.state`, `host.openWorkspace`, `host.paneVisibility`, `host.composer.insertText`, contribution areas and plugin storage surfaces. The current Desktop lint reported no findings. The standalone catalog schema validator accepted the current Vault View entry; the 0.5.0 pin is validated separately after its immutable release commit exists.

The installed `hermes plugins validate` command passed the candidate, including manifest, minimum-version, loadability, security, no-core-override and Desktop-surface checks. Its only warning is the expected skipped Python capability probe for a Desktop-only plugin. `node tests/verify.cjs --browser` passed with Playwright/Chromium, including locale parity, independent privacy controls, actual remote-image request blocking, Markdown preservation, workspace isolation, storage migration and browser editing. The workspace regression now deliberately restores panes before delivering the old registration's delayed `onClose` callback; the callback cannot delete restored tabs or the active-note state, and visibility listeners are released during hiding. Real WSL tests passed for Unicode byte I/O and atomic saves, ffmpeg preview generation and private concurrent scans.

Network inventory is unchanged: remote Markdown image providers receive requests only after the separate persistent image opt-in; external links contact their destination only after a user action through the SDK SandboxedFrame or the operating-system opener. There is no self-updater or remote code loader. Draft mutations remain consent-scoped: navigation guidance is a separate persistent default-off setting, active-note metadata requires its own opt-in, note bodies require the explicit attachment action, and the new quote action inserts only the user's current selection after an explicit click. Selections are never persisted. Opt-out tests verify stale plugin guidance and metadata are removed without deleting user attachments or changing note source.

No access to Hermes transcript or tab-strip DOM was reintroduced. External content keeps the SDK SandboxedFrame default opaque-origin containment. English and French bundles cover the new settings, controls, empty state, errors and tooltips. The declared minimum remains Hermes >=0.21.5. File transport remains Linux/macOS Unix or a WSL-hosted Unix backend for Windows Desktop; native Windows gateways are unsupported.

Verdict: no unresolved catalog-admission blocker was identified. Automated and synthetic evidence is not a security certification. Hermes Desktop hot-reloaded the corrected disk plugin and a live Windows check opened two workspace tabs on a synthetic `00-vault-map` note, hid Vault View, restored it once, waited for UI settlement, switched away and back to the originating conversation, and confirmed both tabs plus the active note and rendered content remained present. Note source was not modified. Application restart, native external-application dispatch, unsaved-editor draft preservation and native cross-platform UI checks were not performed for this candidate and are not claimed.

# 0.4.8 release candidate review

## 2026-10-04 candidate review

Version 0.4.8 identifies the post-review correction separately from the published 0.4.7 tag. The reviewed base is public tag `v0.4.7` at `fc6068e72f14e71f6fd2c1a1a39c2cb72b9ff50d`; the release-candidate commit and tag are recorded in the publication handoff. The correction removes Hermes transcript and tab-strip DOM access, uses the public pane visibility API for Vault View tabs, confines remote-image updates to plugin roots and localizes the remaining labels. The two supported entry points stay byte-identical.

The current official Hermes SDK documentation, catalog policy, catalog entry parser and Desktop lint were reviewed at upstream commit `8b66a51036c1e20920a17cdd049fdf55c968d683`. The current Desktop lint returned no findings for the candidate, and the catalog validator at that commit accepted the staged entry. The installed Hermes plugin validator (source commit `a510d6c64a61582688133b5f54c8191e190a1f49`) passed the candidate with the expected warning that the Python capability probe is skipped for a Desktop-only plugin. The full plugin validator at upstream `8b66a510` was not run. These checks are not admission approval.

The browser-inclusive regression suite passed on Windows with Playwright/Chromium, including an actual click into progressive reading before Ctrl+F, remote-image request blocking and source preservation. A synthetic SDK harness verified workspace tab selection, hide/restore and listener cleanup. Synthetic WSL integration passed for Unicode read/write, real ffmpeg previews, private concurrent scans and installed gateway command classification. The running Hermes Desktop UI displayed v0.4.8; hiding and restoring Vault View left one note tab, without a duplicate. Clean install, application restart, draft preservation across reload, native application dispatch and cross-platform behavior remain unverified. No public push or release had occurred when this review was recorded.

## Earlier 0.4.7 correction candidate — 2026-10-01

The 1 October correction candidate removed the Hermes transcript observer and text/attribute rewriting, dropped the `<ide_opened_file>` wrapper, stopped reading the host tab strip, scoped remote-image toggling to Vault View roots and localized the remaining labels. It was initially labeled 0.4.7 and was not published; version 0.4.8 supersedes that candidate. The root and `desktop/` entry points remain identical because the documented direct disk install loads the root file while package installation uses `desktop/plugin.js`.

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
