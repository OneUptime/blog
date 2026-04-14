# Validation Summary: How to Test Dapr Service Invocation Locally Before Deploying

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (self-hosted mode)
- Dapr CLI (`dapr run`, `dapr invoke`, `dapr list`)
- Dapr Multi-App Run (`dapr.yaml` configuration)
- Dapr Service Invocation HTTP API (`/v1.0/invoke/`)
- Node.js
- Jest (testing framework)
- Axios (HTTP client)

## Sources Consulted
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference — `dapr invoke`: https://docs.dapr.io/reference/cli/dapr-invoke/
- Dapr CLI reference — `dapr list`: https://docs.dapr.io/reference/cli/dapr-list/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Multi-App Run overview: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-overview/
- Dapr name resolution — mDNS: https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-mdns/
- Dapr Security — mTLS: https://docs.dapr.io/operations/security/mtls/

## Issues Found

1. **Incorrect mTLS claim in summary** (line 119): The post stated "All invocation features including retries and mTLS work in self-hosted mode." This is misleading — in self-hosted mode, mTLS requires manually running the Sentry service and configuring certificates. It is not available out of the box as it is in Kubernetes mode. Fixed to clarify that mTLS is supported but requires Sentry service and certificate configuration.

2. **Unused import in JavaScript test example** (line 83): The test code imported `const { exec } = require('child_process')` but never used it anywhere in the example. Removed the unused import to avoid confusing readers.

## Review Notes
- All `dapr run` CLI flags (`--app-id`, `--app-port`, `--dapr-http-port`) are verified correct and current.
- The multi-app run YAML schema fields (`appID`, `appDirPath`, `appPort`, `daprHTTPPort`, `command`) are all valid.
- The service invocation HTTP API path format (`/v1.0/invoke/{app-id}/method/{method-name}`) is correct.
- The `dapr invoke` CLI flags (`--app-id`, `--method`, `--verb`, `--data`) are all valid.
- The `dapr run -f` flag for multi-app run file is correct (`-f` / `--run-file`).
- mDNS is correctly identified as the name resolution mechanism for self-hosted mode.
- The default Dapr HTTP port is 3500; the post uses custom ports (3501, 3502, 3503) which is valid and a good practice to avoid conflicts.
