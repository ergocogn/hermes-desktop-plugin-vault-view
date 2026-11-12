# Catalog review process and lessons

The 0.4.6 catalog review exposed gaps in our review process. Version 0.4.7 addressed the first set of findings; the 0.4.8 candidate addresses the follow-up DOM-access and localization findings. A successful check is not security certification or authorization to publish.

## Gaps and controls

| Missed issue | Previous review gap | Required evidence |
| --- | --- | --- |
| Raw Electron webview | Generic SDK instructions did not cover guest content or shared partitions. Static lint did not reject this construction. | Review actual embedding API and sandbox; catalog-policy tests require SDK SandboxedFrame. |
| Automatic agent guidance | Note sharing was reviewed, but guidance was a separate draft mutation without opt-out. | Inventory every draft mutation; test default-off, independent sharing, locale and removal of stale guidance. |
| French runtime text | Bundles existed, but errors, prompts, confirmations, bridge messages and formatting defaults bypassed them. | Audit text outside bundles; test English/French, automatic locale and overrides. Key parity alone cannot detect hardcoded text. |
| Remote images | Local image containment was reviewed; remote Markdown images still made browser requests. | Inventory network sources; verify actual request counts and source preservation before/after opt-in and opt-out. |
| Windows platform claim | Empty platforms were treated as unspecified rather than all. Desktop host and Unix/WSL gateway support were conflated. | Verify public catalog semantics, shell requirements and documented host/gateway combinations. |
| Development Git left behind | Public release was pushed, but local development changes were not committed/pushed. | Verify both repositories separately and record their commit IDs. Local edits are not a remote update. |

Previous suites established file integrity and UI behavior, not complete catalog compliance. Schema-valid metadata can make false claims; mocked imports and launches do not prove real SDK/native behavior. Static lint checks only its listed patterns. Review current requirements and behavior explicitly.

## Official references

Current local development review (2026-10-07): SDK documentation, catalog policy/schema and Desktop validator were reviewed at Hermes upstream commit `90a7cccb1a243af60c5dfdf44868803d9da8ebec`. The workspace and composer changes use only the documented public `host.state`, `host.openWorkspace`, `host.paneVisibility` and `host.composer.insertText` surfaces. This records source review only; validator and live-Hermes results remain separate evidence.

Reviewed on 2026-09-28 against Hermes commit `6d42313deee63b13dbf2f262d9a31cf603d3f1bc`:

- [SDK documentation and external web content](https://github.com/NousResearch/hermes-agent/blob/6d42313deee63b13dbf2f262d9a31cf603d3f1bc/website/docs/developer-guide/desktop-plugin-sdk.md).
- [Catalog admission and platform semantics](https://github.com/NousResearch/hermes-agent/blob/6d42313deee63b13dbf2f262d9a31cf603d3f1bc/plugin-catalog/README.md).
- [Static Desktop lint and its coverage](https://github.com/NousResearch/hermes-agent/blob/6d42313deee63b13dbf2f262d9a31cf603d3f1bc/hermes_cli/plugin_validate_desktop.py).
- [Maintainer's five requests](https://github.com/NousResearch/hermes-agent/pull/125661#issuecomment-5864953923) and [platform analysis](https://github.com/NousResearch/hermes-agent/pull/125661#issuecomment-5860636213).

Pinned links preserve the reviewed evidence. Inspect current upstream rules before the next submission; this snapshot is not permanently current. Maintainer review remains required.

## Candidate verification

1. Identify exact candidate public commit, entry points, SDK minimum and current upstream rules commit.
2. Review the five behavior areas above, including imperative code outside React.
3. Run `node tests/verify.cjs` for core checks; use `node tests/verify.cjs --browser` with Playwright/Chromium for browser and actual network checks. Core-only success does not include browser validation.
4. Run official plugin, current Desktop surface and catalog validators against this candidate. Read warnings and understand their coverage.
5. Perform relevant live Hermes/native checks or record each unperformed check and limit compatibility claims. WSL tests do not establish native Windows gateway support.
6. Record date, commit, configuration, command/result and limitations in RELEASE-REVIEW.md. Do not carry “completed” status forward from an earlier candidate.

## Publication handoff

A correction does not automatically create a release. Follow the user's explicit versioning/publication request. For authorized publication, verify development push, curated public push, tag/release, exact catalog/index pins and local installation separately. Distinguish pending maintainer merges from available catalog entries, and installed files from the running Hermes module. Exclude all private data from public artifacts.
