# Validation Summary: How to Use the dapr version Command

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr CLI
- Dapr runtime
- Kubernetes (Dapr control plane)
- Homebrew (macOS package manager)
- Bash scripting with jq

## Sources Consulted
- Dapr CLI `version` command reference: https://docs.dapr.io/reference/cli/dapr-version/
- Dapr CLI `upgrade` command reference: https://docs.dapr.io/reference/cli/dapr-upgrade/
- Dapr CLI `status` command reference: https://docs.dapr.io/reference/cli/dapr-status/
- Dapr CLI install docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr support/release policy: https://docs.dapr.io/operations/support/support-release-policy/
- Dapr CLI source code (`cmd/dapr.go`, `cmd/version.go`): https://github.com/dapr/cli
- Dapr CLI e2e version tests: https://github.com/dapr/cli/blob/master/tests/e2e/standalone/version_test.go
- Dapr Homebrew tap: https://github.com/dapr/homebrew-tap

## Issues Found

1. **Incorrect JSON output keys**: The post showed JSON keys as `"Cli"` and `"Runtime"` (PascalCase, no spaces). The actual Dapr CLI JSON output uses `"Cli version"` and `"Runtime version"` (with spaces), as confirmed by the `daprVersion` struct definition in `cmd/dapr.go` and the e2e tests. Fixed the sample JSON output and the CI script's `jq` selectors to use the correct keys (e.g., `jq -r '."Cli version"'`).

2. **Fabricated version mismatch warning**: The post claimed that `dapr version` prints "WARNING: mismatched CLI and runtime versions" when versions differ. No such warning logic exists in the Dapr CLI source code — the `version` command simply prints both versions without comparing them. Removed the fabricated warning example and reworded the section to accurately describe manual version comparison.

3. **Incorrect Homebrew formula name**: The post used `brew upgrade dapr-cli`, but the correct Homebrew formula name including the tap prefix is `dapr/tap/dapr-cli`. Fixed to `brew upgrade dapr/tap/dapr-cli`.

4. **Wrong code fence language for terminal output**: The version mismatch example used a `yaml` code fence for what was terminal output. This was removed along with the fabricated warning (issue #2).

## Review Notes
- The `dapr version` text output format and the `--output json` flag are correctly documented.
- The `dapr upgrade --kubernetes --runtime-version` command is correct per official docs.
- The Linux install script URL using the `master` branch is correct (the dapr/cli repo still uses `master` as its default branch).
- The `dapr status --kubernetes` command correctly shows per-component versions in the Dapr control plane.
- The support/release policy URL is valid and resolves to the correct page.
