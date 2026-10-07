# Catalog review process

Use this process for every Vault View catalog candidate. Record the exact public source commit and the upstream Hermes commit reviewed in RELEASE-REVIEW.md. A schema pass or static lint result does not establish admission compliance.

## Review the public rules

- Read the current [Desktop SDK](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/desktop-plugin-sdk.md), [catalog policy](https://github.com/NousResearch/hermes-agent/blob/main/plugin-catalog/README.md), catalog entry parser and Desktop surface lint.
- Keep external web content in the SDK SandboxedFrame with its default containment. Do not inspect or rewrite Hermes-rendered DOM outside the plugin root.
- Inventory network requests and composer draft mutations. Remote note images and agent navigation guidance need separate persistent opt-ins, disabled by default. Verify opt-out removes stale plugin data while preserving user attachments and note source.
- Verify English, French, automatic Hermes locale changes and manual overrides, including imperative errors, prompts, bridge messages and formatting defaults.
- Declare the Hermes version needed for imported SDK APIs and distinguish the Desktop host from its filesystem gateway. An empty catalog platforms list means all hosts.

## Verify the exact candidate

Run `node tests/verify.cjs --browser` with Playwright/Chromium available. Review the code and behavior beyond patterns covered by those tests. Run the official plugin and catalog validators, inspect their warnings, and record any unavailable checks. Test supported gateway and native application behavior on the relevant operating systems; mocked launches are only unit evidence.

Before publishing, confirm entry-point parity, manifest and documentation version, tag target, exact catalog and image pins, and separate development and public Git states. Verify the installed files and the module actually loaded in Hermes separately. Use only synthetic notes and screenshots in public evidence.

## Current reviewed upstream

The 0.5.0 candidate was reviewed on 2026-10-07 against Hermes upstream commit `808520532cf7c48c3eccb09476fb3cde379b02e9`. Exact validator results and checks not performed are recorded in RELEASE-REVIEW.md.
