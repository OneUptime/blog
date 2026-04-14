# Validation Summary: How to Run Multiple Dapr Applications in Self-Hosted Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — CLI and self-hosted mode
- Dapr Service Invocation API (HTTP)
- Dapr State Management API
- Dapr Dashboard
- Node.js (application runtime in examples)
- Redis (default state store)
- axios (HTTP client library)

## Sources Consulted
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference — `dapr list`: https://docs.dapr.io/reference/cli/dapr-list/
- Dapr CLI reference — `dapr stop`: https://docs.dapr.io/reference/cli/dapr-stop/
- Dapr CLI reference — `dapr dashboard`: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Service Invocation how-to guide: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/

## Issues Found
No technical issues found.

All CLI flags (`--app-id`, `--app-port`, `--dapr-http-port`, `--dapr-grpc-port`) are correct and current. Default ports (HTTP 3500, gRPC 50001) are accurate. The service invocation URL pattern (`/v1.0/invoke/{app-id}/method/{method-name}`) is correct. The state store key prefix format (`app-id||key`) using `||` as separator is accurate. The state management API endpoint and JSON body format are correct. The `dapr list`, `dapr stop --app-id`, and `dapr dashboard` (default port 8080) commands are all valid.

## Review Notes
- The `dapr list` output in the blog omits the AGE column that appears in actual CLI output. This is a minor simplification for readability and does not constitute a technical error.
- Newer Dapr CLI versions recommend using `--` to separate dapr flags from the application command (e.g., `dapr run --app-id orders -- node app.js`), but the syntax without `--` shown in the post remains supported.
- The post could benefit from mentioning `dapr run -f` (multi-app run with a config file), introduced in Dapr 1.12+, which simplifies running multiple apps. This is an enhancement suggestion, not a correction.
