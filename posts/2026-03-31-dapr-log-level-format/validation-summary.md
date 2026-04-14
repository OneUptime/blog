# Validation Summary: How to Configure Dapr Log Level and Format

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- Dapr (sidecar runtime, `daprd`)
- Kubernetes (annotations, Helm, kubectl)
- Fluent Bit (log parsing configuration)
- Grafana Loki (LogQL queries)
- Fluentd

## Sources Consulted
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr logging troubleshooting: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr logging/monitoring docs: https://docs.dapr.io/operations/monitoring/logging/logs/

## Issues Found

1. **JSON timestamp field name was incorrect**: The blog used `ts` as the JSON log timestamp field name. Dapr actually uses `time`. Fixed in the JSON sample and the Structured Log Fields Reference table.

2. **Missing `type` field in JSON log output**: Dapr JSON logs include a `type` field (always `"log"`) that was missing from both the JSON sample and the fields reference table. Added to both locations.

3. **Incorrect Helm value path for sidecar injector log level**: The blog used `dapr_sidecar_injector.sidecarImage.logLevel` but the correct Helm path is `dapr_sidecar_injector.logLevel`. Fixed in the Helm command example.

4. **`global.logLevel` is not a documented Helm value**: The `values.yaml` example included `global.logLevel: info`, but this is not found in Dapr's official Helm chart documentation. Per-component `logLevel` values (e.g., `dapr_operator.logLevel`) are the documented approach. Removed from the example.

5. **Undocumented `kubectl set env` approach for system services**: The blog suggested using `kubectl set env deployment/dapr-operator -n dapr-system LOG_LEVEL=debug` to change system service log levels, but this `LOG_LEVEL` environment variable is not documented. Replaced with the documented Helm upgrade approach (`helm upgrade dapr dapr/dapr --set dapr_operator.logLevel=debug`).

6. **Removed undocumented `component` and `error` fields from reference table**: The Structured Log Fields Reference table included `component` and `error` fields that are not part of Dapr's official JSON log schema. Removed to match the documented fields.

## Review Notes
- Dapr also supports `fatal` and `panic` log levels per the CLI reference, though these are rarely used. The blog focuses on the four common levels (`debug`, `info`, `warn`, `error`), which is a reasonable editorial choice.
- The `--log-as-json` flag is shown with `dapr run` in the blog. There is some inconsistency in Dapr's own documentation about whether this flag is supported for `dapr run` vs only for `daprd` directly. The Dapr logging docs page does show this usage, so the blog's usage was kept as-is.
- The Fluent Bit configuration uses classic INI-style format, which is valid but note that newer Fluent Bit versions also support YAML configuration.
- The Loki LogQL queries are syntactically correct and follow standard patterns.
