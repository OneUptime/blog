# Validation Summary: How to Collect Dapr Diagnostic Logs for Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar, control plane, CLI)
- Kubernetes (kubectl, pods, CRDs, events)
- Dapr HTTP API (metadata, health, pprof profiling)
- Bash scripting

## Sources Consulted
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI `dapr version` reference: https://docs.dapr.io/reference/cli/dapr-version/
- Dapr logs troubleshooting guide: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr profiling and debugging: https://docs.dapr.io/operations/troubleshooting/profiling-debugging/
- Debug Dapr control plane on Kubernetes: https://docs.dapr.io/developing-applications/debugging/debug-k8s/debug-dapr-services/

## Issues Found
1. **`dapr version -k` is not a valid command.** The `-k` (Kubernetes) flag does not exist for the `dapr version` subcommand. The `-k` flag is available on other Dapr CLI commands such as `dapr init -k` and `dapr status -k`, but `dapr version` only supports `--help` and `--output` flags. It reports both the CLI version and the runtime version without needing a Kubernetes flag. Changed `dapr version -k` to `dapr version` in both the "Collecting Configuration State" section and the diagnostic bundle script.

## Review Notes
- The Dapr annotations (`dapr.io/log-level`, `dapr.io/log-as-json`) are correct and current.
- The sidecar container name `daprd` is correct.
- Control plane label selectors (`app=dapr-operator`, `app=dapr-sentry`, etc.) match the standard Dapr Helm chart deployments.
- The `dapr-scheduler-server` component was introduced in Dapr 1.12+; the post handles its potential absence gracefully with `2>/dev/null || true`.
- The Dapr CRD resource names (`components`, `configurations`, `subscriptions`) are correct.
- HTTP API endpoints (`/v1.0/metadata`, `/v1.0/healthz`) and default port 3500 are correct.
- The profiling port 7777 is the correct default (`--profile-port` defaults to 7777), and the pprof endpoint path is valid.
- The diagnostic bundle script is functional and well-structured.
