# Validation Summary: How to Check Livepatch Status and Applied Patches on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Ubuntu Pro Client (`pro`)
- Canonical Livepatch
- Linux kernel live patching
- systemd / journalctl
- Bash scripting
- Python JSON parsing

## Sources Consulted
- Ubuntu Livepatch documentation: https://ubuntu.com/security/livepatch/docs
- Ubuntu Livepatch client status documentation: https://ubuntu.com/security/livepatch/docs/livepatch/how-to/status
- Ubuntu Livepatch tiers documentation: https://ubuntu.com/security/livepatch/docs/livepatch/explanation/what_are_livepatch_tiers
- Ubuntu Pro Client documentation: How to manage Livepatch: https://documentation.ubuntu.com/pro-client/en/v29/howtoguides/enable_livepatch.html
- Ubuntu Pro Client status output documentation: https://documentation.ubuntu.com/pro-client/en/latest/explanations/status_columns/
- Local `pro --version` and `pro status --help` output.
- Local `snap info canonical-livepatch` output and `canonical-livepatch status --help` from the current snap package.

## Issues Found
- The status example used older fields such as `Status: active`, `Fully patched: true`, `Version`, `Machine token`, and `Patches: ... Applied`. Updated the example and explanatory text to current documented fields such as `server check-in`, `kernel state`, `patch state`, `patch version`, `tier`, `machine id`, and applied CVEs in verbose output.
- The status and patch-status value lists did not match current Canonical documentation. Replaced them with documented kernel state and patch state messages.
- The tier explanation incorrectly described `updates` as simply receiving patches when released and not stable-only. Reworded it to match Canonical's documented tier model for free and paid Ubuntu Pro users.
- The JSON examples assumed a specific `LivePatch.patches[].bugs` schema that is not documented and may not match current client output. Updated the examples to use `--verbose --format json` and to avoid hard-coding the old patch-list structure.
- The monitoring script relied on `fully_patched` and counted `patched` fields from the old assumed JSON schema. Updated it to inspect patch state and patch version fields instead.
- The journal and restart commands used the non-snap unit name `canonical-livepatchd`. Updated them to the snap unit `snap.canonical-livepatch.canonical-livepatchd`, matching Canonical's documented log guidance and the snap service naming.
- The troubleshooting section centered on `Fully patched: false`, which is no longer the documented user-facing status wording. Updated it to investigate unhealthy `patch state` output.

## Review Notes
The `canonical-livepatch status --format json` flag is current, and the installed snap help confirms `json`, `yaml`, and `humane` formats plus `--verbose`. Canonical's public status documentation describes JSON as machine-readable but does not publish a stable field-by-field schema, so future automation should first inspect output from the installed client version.
