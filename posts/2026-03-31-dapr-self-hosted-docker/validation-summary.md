# Validation Summary: How to Run Dapr in Self-Hosted Mode with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and CLI)
- Docker
- Node.js / Express
- Redis (state store and pub/sub)
- Zipkin (distributed tracing)

## Sources Consulted
- Dapr self-hosted initialization docs: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Dapr CLI installation docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI reference (dapr status vs dapr list): https://docs.dapr.io/reference/cli/
- Dapr GitHub CLI source (standalone.go): https://github.com/dapr/cli/blob/master/pkg/standalone/standalone.go

## Issues Found
1. **`dapr status` is Kubernetes-only**: The post used `dapr status` to verify the self-hosted installation, but this command only works with Kubernetes (`-k` flag). Changed to `dapr list`, which lists running Dapr instances in self-hosted mode.

2. **Missing `dapr_placement` and `dapr_scheduler` containers**: The post only listed `dapr_redis` and `dapr_zipkin` as expected Docker containers from `dapr init`. In reality, `dapr init` also creates `dapr_placement` (port 50005, for actor support) and `dapr_scheduler` (port 50006). Added both to the expected output and the init description.

3. **Non-existent `zipkin.yaml` component file**: The post listed `zipkin.yaml` as one of the default component files in `~/.dapr/components/`. Zipkin tracing is actually configured in `~/.dapr/config.yaml` under `spec.tracing.zipkin.endpointAddress`, not as a separate component file. Removed `zipkin.yaml` from the file listing and added a clarifying note.

4. **Install script command used `wget` instead of `curl`**: The official Dapr docs use `curl -fsSL` for the Linux/macOS install command. Changed from `wget -q ... -O -` to `curl -fsSL ...` to match the official documentation.

5. **Hardcoded version number**: The post showed `1.14.0` as the exact expected output of `dapr --version`. Added "(or later)" qualifier since users installing Dapr will get a newer version (current latest is 1.17.x).

## Review Notes
- The Dapr API paths for state management (`/v1.0/state/statestore`) and service invocation (`/v1.0/invoke/{appId}/method/{methodName}`) are correct.
- The default state store component name `statestore` matches what `dapr init` creates.
- The Node.js/Express sample app code is syntactically correct and functional.
- The `dapr run` command flags (`--app-id`, `--app-port`, `--dapr-http-port`) are all valid and current.
- The Windows PowerShell install command and URL are correct per official docs.
