# Validation Summary: How to Configure Dapr Log Levels

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (annotations, deployments, kubectl)
- Helm (Dapr Helm chart configuration)
- Docker / container logging (daprd sidecar container)

## Sources Consulted
- Dapr Logs Troubleshooting: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr Logs Overview: https://docs.dapr.io/operations/observability/logging/logs/
- Dapr Arguments and Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Metadata API Reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr CLI `dapr run` Reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Environment Variable Reference: https://docs.dapr.io/reference/environment/
- Dapr Helm Chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr Kit Logger Package: https://pkg.go.dev/github.com/dapr/kit/logger

## Issues Found

### 1. Unsupported `DAPR_LOG_LEVEL` environment variable (line 59)
**What was wrong:** The post claimed `DAPR_LOG_LEVEL=warn` could be used as an environment variable to set the log level. This environment variable is not documented in the Dapr environment variable reference and is not a supported configuration method.
**What was changed:** Replaced with a `daprd` direct invocation example using the `--log-level` CLI flag, which is the documented approach.

### 2. Incorrect "Changing Log Level at Runtime" section (lines 62-74)
**What was wrong:** The section contained multiple errors:
- Claimed the Dapr metadata API (`/v1.0/metadata`) supports dynamic log level changes. It does not; the metadata API is for setting custom ephemeral key-value attributes only.
- Used `POST` method, but the metadata API uses `PUT`.
- Used JSON body with `Content-Type: application/json`, but the metadata API accepts `text/plain`.
- Used wrong endpoint format (`/v1.0/metadata` instead of `/v1.0/metadata/<attributeName>`).
- The verification command (`jq '.extended.daprRuntimeVersion'`) extracts the Dapr runtime version, not the log level.
**What was changed:** Rewrote the section to accurately state that Dapr does not support dynamic log level changes via the sidecar API, and provided the correct approach (update annotation + restart).

### 3. Incorrect Helm chart value `global.logLevel` (line 121-126)
**What was wrong:** The post used `--set global.logLevel=info`, but `global.logLevel` does not exist in the Dapr Helm chart. Log levels are configured per-component using keys like `dapr_operator.logLevel`, `dapr_sentry.logLevel`, `dapr_placement.logLevel`, and `dapr_sidecar_injector.logLevel`.
**What was changed:** Replaced with the correct per-component Helm value syntax for all four Dapr system components.

### 4. Incorrect summary claim about runtime log changes (line 130)
**What was wrong:** The summary stated "Dapr supports dynamic log level changes via the metadata API without pod restarts," which is incorrect.
**What was changed:** Replaced with "Log level changes require a sidecar restart."

## Review Notes
- The log levels table lists five levels (debug, info, warn, error, fatal). The Dapr CLI reference also mentions `panic` as a valid level, but omitting it is reasonable since it is rarely used in practice.
- The log output examples show `level=warning` in the warn-level grep output (line 115). This actually matches real runtime behavior (Dapr uses logrus internally, which outputs "warning" for the warn level), even though Dapr's own documentation examples show `level=warn`. The blog's output is accurate.
- The `dapr.io/log-level` annotation, `--log-level` CLI flag, and `dapr.io/log-as-json` annotation are all correctly documented.
- The Kubernetes YAML examples and kubectl commands are syntactically correct and follow standard patterns.
