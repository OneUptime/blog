# Validation Summary: How to Use the dapr run Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr run` command)
- Dapr sidecar architecture
- Dapr multi-app run (`dapr.yaml`)
- Node.js, Python, Go (as example application runtimes)

## Sources Consulted
- Dapr CLI reference for `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr multi-app run template: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr logging and troubleshooting docs: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/

## Issues Found
1. **Incorrect log level name "warning"**: The post listed valid log levels as `debug`, `info`, `warning`, and `error`. Dapr uses `warn`, not `warning`. Additionally, Dapr supports two more levels: `fatal` and `panic`. Fixed the line to read: `debug`, `info`, `warn`, `error`, `fatal`, and `panic`.

## Review Notes
- All CLI flags (`--app-id`, `--app-port`, `--dapr-http-port`, `--dapr-grpc-port`, `--enable-api-logging`, `--resources-path`, `--app-protocol`, `--log-level`) are current and correct.
- Default ports (HTTP 3500, gRPC 50001) are correct.
- The `--resources-path` flag is the current name (replacing the older `--components-path`).
- The `dapr.yaml` multi-app run format and all field names (`version`, `apps`, `appID`, `appDirPath`, `appPort`, `command`) are correct.
- The `--` separator usage is correctly explained.
- The `--app-protocol` values `http` and `grpc` shown in examples are valid (Dapr also supports `https`, `grpcs`, and `h2c`).
