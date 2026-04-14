# Validation Summary: How to Set Up a Dapr Test Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (multi-app run, in-memory components, slim init mode)
- .NET / C# (dotnet test, health check helper)
- GitHub Actions CI/CD
- Bash scripting
- YAML configuration (Dapr components, multi-app run template, GitHub Actions workflow)

## Sources Consulted
- Dapr In-memory State Store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-inmemory/
- Dapr In-memory Pub/Sub docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-inmemory/
- Dapr Local File Secret Store docs: https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/
- Dapr Multi-App Run template docs: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr CLI install docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr self-hosted without Docker (slim mode) docs: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-no-docker/
- Dapr CLI `run` command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI `stop` command reference: https://docs.dapr.io/reference/cli/dapr-stop/

## Issues Found

### 1. Invalid `logLevel` field in multi-app run `common` section
- **What was wrong:** The `dapr-test.yaml` example placed `logLevel: warn` inside the `common` section. According to Dapr's multi-app run template documentation, the `common` section only supports `resourcesPath` and `env` fields. `logLevel` is a per-app property.
- **What was changed:** Moved `logLevel: warn` from the `common` section to each individual app entry in the `apps` array.
- **Why:** Using an unsupported field in `common` could cause a parse error or be silently ignored, either way producing incorrect behavior.

### 2. Incorrect `wget` command for Dapr CLI installation
- **What was wrong:** The CI pipeline used `wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | bash`. Without the `-O -` flag, `wget` saves the script to a local file instead of writing to stdout, so `bash` receives no input and the installation silently fails.
- **What was changed:** Fixed to `wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash`, matching the official Dapr CLI installation documentation.
- **Why:** The original command would not install the Dapr CLI, causing all subsequent `dapr` commands in the CI pipeline to fail.

## Review Notes
- All Dapr component types (`state.in-memory`, `pubsub.in-memory`, `secretstores.local.file`) are confirmed valid with correct YAML structure and apiVersion.
- The `dapr init --slim` description accurately reflects its behavior (installs daprd and placement binaries, skips Redis and Zipkin containers).
- The C# health check helper is syntactically correct and uses appropriate modern C# patterns.
- GitHub Actions versions (checkout@v4, setup-dotnet@v4, upload-artifact@v4) are current.
- The test startup script correctly uses `dapr run -f` and `dapr stop -f` for multi-app lifecycle management.
