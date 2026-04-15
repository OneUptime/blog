# Validation Summary: How to Configure Dapr Logging

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar runtime)
- Kubernetes (annotations, deployments, kubectl)
- Helm (chart installation and upgrade)
- JSON structured logging
- Log aggregation platforms (ELK, Loki, Datadog)

## Sources Consulted
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr logs troubleshooting guide: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/
- Dapr Kubernetes deployment guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm chart values.yaml (GitHub): https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml

## Issues Found

1. **Invalid log level `fatal`**: The post listed `fatal` as a valid Dapr log level. Per official docs, valid levels are only `debug`, `info`, `warn`, `error`. Removed `fatal` from the list.

2. **"Max concurrency" in logging table**: The configuration table included "Max concurrency" as a logging option. This is actually `dapr.io/app-max-concurrency`, which controls concurrent request limits to the app — not a logging configuration. Removed it from the table.

3. **Incorrect Helm value `global.logLevel`**: The post used `--set global.logLevel=info` in the Helm install command. There is no `global.logLevel` in the Dapr Helm chart. Log levels are set per component (e.g., `dapr_operator.logLevel`, `dapr_sidecar_injector.logLevel`, `dapr_placement.logLevel`). Fixed to use per-component syntax.

4. **`--log-as-json` not supported with `dapr run`**: The post passed `--log-as-json` to `dapr run`, but this flag is only supported when running `daprd` directly. The official annotations reference marks it as "not supported" for the Dapr CLI. Split the self-hosted section into two examples: `dapr run` with `--log-level` only, and `daprd` directly for JSON logging.

5. **Incorrect JSON log output fields**: The example JSON log lines used fields `os` and `arch`, which are not part of Dapr's standard structured log output. Actual fields include `scope`, `type`, and `instance`. Updated the example log lines to use the correct field names and realistic values.

## Review Notes
- The Dapr version shown in the example JSON logs (`1.13.0`) is not the latest but is acceptable for illustrative purposes.
- The `kubectl logs -l dapr.io/enabled=true -c daprd --all-namespaces` command is valid but may produce very large output in production clusters; the post could note this in a future update.
- The "Common Startup Log Messages" grep patterns are reasonable but exact log message strings may vary across Dapr versions.
