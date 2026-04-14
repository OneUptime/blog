# Validation Summary: How to Configure Dapr Sidecar Log Verbosity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, daprd)
- Kubernetes (annotations, kubectl, deployments)
- Helm (Dapr chart configuration)
- jq (JSON log filtering)

## Sources Consulted
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr logging documentation: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr Helm chart values (GitHub): https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr logger source code (`logger/logger.go`): https://github.com/dapr/dapr/blob/master/pkg/logger/

## Issues Found

### 1. Fabricated `component` field in JSON log example
**What was wrong:** The JSON log example included a `"component": "statestore"` field. This is not a standard field in Dapr's JSON log output. The actual standard fields are: `time`, `level`, `type`, `msg`, `scope`, `instance`, `ver`, and `app_id`.
**What was changed:** Removed the `component` field from the JSON example. Added `instance` and `ver` fields to match the real Dapr log schema. Moved the component information into the `msg` field as `"component loaded. name: statestore (state.redis/v1)"`, which reflects how Dapr actually logs component initialization.

### 2. Incorrect Helm value path
**What was wrong:** The blog used `--set dapr_sidecar_injector.defaultConfig.logLevel=info` which is a non-existent Helm value path. The `defaultConfig.logLevel` key does not exist in the Dapr Helm chart. The Helm chart exposes `logLevel` directly on each system component (e.g., `dapr_sidecar_injector.logLevel`, `dapr_operator.logLevel`), but these control the system component's own log level, not the default for injected sidecars. There is no Helm value to set a default log level for all injected sidecars.
**What was changed:** Corrected the Helm command to use the actual value paths for system components (`dapr_sidecar_injector.logLevel`, `dapr_operator.logLevel`, `dapr_placement.logLevel`, `dapr_sentry.logLevel`). Updated the section description to clarify these control system component logs. Added a note that sidecar log levels are set per-pod via the `dapr.io/log-level` annotation.

### 3. Fabricated scope name `dapr.contrib`
**What was wrong:** The jq filter example used `select(.scope == "dapr.contrib")`, but `dapr.contrib` is not an actual Dapr scope name. Real scope names include `dapr.runtime`, `dapr.runtime.actors`, `dapr.runtime.processor`, etc.
**What was changed:** Replaced `dapr.contrib` with `dapr.runtime`, which is the primary scope for sidecar runtime logs.

### 4. Invalid jq filter on non-existent `.component` field
**What was wrong:** The jq filter `select(.component == "statestore")` would never match any Dapr log entries because `component` is not a field in the JSON log schema.
**What was changed:** Replaced with `select(.msg | contains("statestore"))`, which filters log messages that mention a specific component by searching the message text.

## Review Notes
- The blog omits the `panic` log level, which is documented in the Dapr CLI reference as a valid value for `--log-level`. However, `panic` is rarely useful in practice and its omission is acceptable for a guide focused on common usage.
- The `fatal` log level is listed in the blog's table. While `fatal` exists in the Dapr logger source code and CLI, it is not explicitly documented in the Kubernetes annotations reference (which only lists debug, info, warn, error). The blog's inclusion is not incorrect but readers should be aware it may not work via the annotation.
- The `--log-as-json` flag used in the CLI example is technically a global Dapr CLI flag rather than a `dapr run`-specific flag, but it works correctly in the context shown.
