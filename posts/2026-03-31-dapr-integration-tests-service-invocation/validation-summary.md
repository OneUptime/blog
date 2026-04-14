# Validation Summary: How to Set Up Integration Tests for Dapr Service Invocation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.14.0)
- Docker Compose
- Go (integration testing)
- Dapr service invocation API
- Dapr health check API

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr self-hosted with Docker: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr CLI arguments reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI run reference: https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

1. **Docker Compose: Missing `network_mode` on sidecar containers (critical)** — The `caller-dapr` and `callee-dapr` sidecar containers were defined as separate services without sharing the network namespace with their respective app containers. Dapr sidecars communicate with the app via localhost, so without `network_mode: "service:<app>"` the sidecars cannot reach the apps. Added `network_mode: "service:caller"` to `caller-dapr` and `network_mode: "service:callee"` to `callee-dapr`, along with `depends_on` entries, matching the pattern shown in official Dapr Docker documentation.

2. **Docker Compose: Missing port 3500 exposure on caller service** — The test runs on the host and accesses `http://localhost:3500`, but port 3500 was not exposed. Added `ports: ["3500:3500"]` to the `caller` service (which shares the network namespace with the sidecar).

3. **Go: Missing `"strings"` import (won't compile)** — The `TestServiceInvocation` function uses `strings.NewReader` but the `"strings"` package was not imported. Added it to the import block.

4. **Go: Missing `"fmt"` and `"time"` imports (won't compile)** — The `waitForDapr` function (same file) uses `fmt.Sprintf` and `time.Sleep` but these packages were not in the import block. Added both.

5. **Go: Missing `resp.Body.Close()` in `waitForDapr` (resource leak)** — The health check loop called `http.Get` but never closed the response body on successful requests. Added `resp.Body.Close()` before checking the status code.

6. **daprd flags: Single dash instead of double dash** — The daprd command arguments used single-dash format (`-app-id`, `-app-port`, etc.) but the canonical documented form uses double-dash (`--app-id`, `--app-port`, etc.). Updated all flags to double-dash format.

## Review Notes
- The `version: "3.8"` field in Docker Compose is deprecated in Compose v2+ (it is silently ignored). Not technically wrong for the Dapr 1.14.0 timeframe but worth noting for future updates.
- The placement service is only required for Dapr actors, not for basic service invocation. Its inclusion doesn't cause issues but could be confusing for readers focused only on service invocation.
- In Docker Compose environments, Dapr's default mDNS name resolution may not work reliably since Docker networks don't support multicast by default. For production Docker Compose setups, consider configuring a DNS-based name resolution component.
