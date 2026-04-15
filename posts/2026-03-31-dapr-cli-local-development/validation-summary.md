# Validation Summary: How to Use Dapr CLI for Local Development

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr CLI
- Dapr sidecar runtime
- Dapr State API (HTTP)
- Dapr Pub/Sub API
- Dapr Service Invocation API
- Dapr Configuration (YAML)

## Sources Consulted
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference — `dapr invoke`: https://docs.dapr.io/reference/cli/dapr-invoke/
- Dapr CLI reference — `dapr publish`: https://docs.dapr.io/reference/cli/dapr-publish/
- Dapr CLI reference — `dapr stop`: https://docs.dapr.io/reference/cli/dapr-stop/
- Dapr CLI reference — `dapr list`: https://docs.dapr.io/reference/cli/dapr-list/
- Dapr CLI reference — `dapr logs`: https://docs.dapr.io/reference/cli/dapr-logs/
- Dapr CLI overview: https://docs.dapr.io/reference/cli/cli-overview/
- Dapr installation guide: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr State API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

### 1. `dapr metadata` is not a real CLI command
- **What was wrong:** The post showed `dapr metadata --app-id myapp` as a way to inspect app metadata. There is no `dapr metadata` CLI command — it does not exist in the Dapr CLI command list.
- **What was changed:** Replaced with `curl http://localhost:3500/v1.0/metadata`, which uses the Dapr HTTP Metadata API endpoint — the correct way to inspect metadata in local/self-hosted mode.
- **Why:** The Metadata API is available via HTTP at `/v1.0/metadata` but has no corresponding CLI command.

### 2. `dapr logs` does not work in local development
- **What was wrong:** The post showed `dapr logs --app-id myapp` in a local development context. While `dapr logs` is a real command, it only works in Kubernetes mode (requires the `-k` flag). It does not function in self-hosted/local mode.
- **What was changed:** Replaced with `dapr dashboard`, which opens the Dapr dashboard UI and is the appropriate way to inspect running Dapr apps locally. In local development, sidecar logs are output directly to the terminal where `dapr run` is executing.
- **Why:** The post is specifically about local development, and `dapr logs` is Kubernetes-only, making the original command misleading.

## Review Notes
- All installation commands (brew, wget, winget) are verified correct.
- All `dapr run` flags (`--app-id`, `--app-port`, `--dapr-http-port`, `--resources-path`, `--config`, `--log-level`) are correct and current.
- The `dapr invoke` command syntax with `--app-id`, `--method`, `--verb`, and `--data` flags is correct.
- The `dapr publish` command correctly uses `--publish-app-id` (not `--app-id`), which is the right flag for this command.
- The State API URL pattern `/v1.0/state/statestore/mykey` is correct for GET requests.
- The Configuration YAML format is correct: `samplingRate` is properly quoted as a string, and the `features` array structure with `name`/`enabled` fields is valid.
- The `dapr stop` command syntax is correct.
- The `HotReload` feature name in the configuration example should be verified against the specific Dapr version being targeted, as preview feature names can change between releases.
