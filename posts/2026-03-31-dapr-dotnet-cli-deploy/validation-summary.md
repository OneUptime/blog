# Validation Summary: How to Deploy Dapr .NET Apps with Dapr CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr CLI
- Dapr sidecar (daprd)
- .NET (dotnet run)
- Dapr multi-app run (dapr.yaml)
- Dapr pub/sub
- Dapr service invocation
- Dapr dashboard

## Sources Consulted
- Dapr CLI source code (https://github.com/dapr/cli) — `cmd/run.go`, `cmd/invoke.go`, `cmd/publish.go`, `cmd/stop.go`, `cmd/list.go`, `cmd/logs.go`, `cmd/dashboard.go`, `cmd/init.go`
- Dapr CLI multi-app run file config (`pkg/runfileconfig/run_file_config.go`, `pkg/standalone/run.go`)
- Dapr CLI install scripts at `https://raw.githubusercontent.com/dapr/cli/master/install/install.sh` and `install.ps1`
- Dapr official documentation (https://docs.dapr.io)

## Issues Found

### 1. Deprecated `--components-path` flag in `dapr run` command
- **What was wrong:** The `--components-path` flag is deprecated in the Dapr CLI. It still works but emits a deprecation warning.
- **What was changed:** Replaced `--components-path` with `--resources-path` in the `dapr run` single-app example.
- **Why:** The Dapr CLI deprecated `--components-path` in favor of `--resources-path` to reflect the broader "resources" terminology.

### 2. Invalid `componentsPath` field in `dapr.yaml` multi-app run file
- **What was wrong:** The `componentsPath` field does not exist in the multi-app run file YAML schema. The `ComponentsPath` Go struct field has an `arg:` tag but no `yaml:` tag, meaning it is not a valid run file field.
- **What was changed:** Replaced `componentsPath: ./components` with `resourcesPaths:` followed by a list entry `- ./components` for both app definitions.
- **Why:** The correct YAML field is `resourcesPaths` (plural, type `[]string`), which maps to the `yaml:"resourcesPaths"` tag in the Dapr CLI source code.

### 3. `dapr logs` command listed as a local development tool
- **What was wrong:** The post included `dapr logs --app-id order-service` in the "Inspecting Running Services" section, implying it works during local self-hosted development. However, `dapr logs` is a Kubernetes-only command — it retrieves sidecar logs from Kubernetes pods and does not function in self-hosted mode.
- **What was changed:** Removed the `dapr logs --app-id order-service` line and its comment from the inspecting services section.
- **Why:** Including a Kubernetes-only command in a local development tutorial is misleading and would cause errors for readers following along.

## Review Notes
- The `dapr invoke` command defaults to POST if `--verb` is not specified. The post correctly shows `--verb GET` for a GET request.
- The `dapr publish` command uses `--publish-app-id` rather than `--app-id`, which is intentionally different from other Dapr CLI commands. The post correctly uses this flag.
- The install script URLs point to the `master` branch of the Dapr CLI repo and were verified as live and valid.
- `dapr init` accurately downloads daprd, sets up default components (pubsub.yaml, statestore.yaml), starts Docker containers (placement, scheduler, Redis, Zipkin), and creates a default config file.
