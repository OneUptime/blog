# Validation Summary: How to Use the Dapr Health API Reference

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (sidecar health API)
- Kubernetes (liveness and readiness probes)
- Bash (health check scripting)
- Python (integration test helper)
- Node.js / Express (application health endpoint)

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr sidecar health documentation: https://docs.dapr.io/operations/observability/sidecar-health/
- Dapr app health configuration: https://docs.dapr.io/operations/configuration/app-health/

## Issues Found

1. **Incorrect HTTP status code for healthy sidecar (line 25)**: The post stated the sidecar returns HTTP 200 on success. Per the official Dapr Health API reference, the endpoint returns **HTTP 204 No Content** on success. Changed "HTTP 200" to "HTTP 204".

2. **Misleading description of `/v1.0/healthz/outbound` (lines 36-37)**: The post claimed this endpoint is "more comprehensive than `/healthz` because it validates connectivity to external dependencies." This is incorrect — `/healthz/outbound` actually checks *fewer* things than `/healthz`. The key difference is that `/healthz/outbound` does not require the app channel to be established, while `/healthz` does. Rewrote the description to accurately reflect the endpoint's purpose.

3. **Missing required `dapr.io/enable-app-health-check` annotation (line 68-73)**: The app health probe annotations were missing the `dapr.io/enable-app-health-check: "true"` annotation, which is required to enable the feature. Without it, the other annotations have no effect. Added the missing annotation.

4. **Incorrect `app-health-probe-timeout` value (line 72)**: The value was set to `"5"`, but this annotation is specified in milliseconds. A 5ms timeout is unrealistically short for any health check and would cause false negatives. Changed to `"500"` (500ms), which matches the Dapr default.

5. **Python script checked wrong status code (line 123)**: The integration test helper checked `r.status_code == 200`, but the Dapr health endpoint returns 204 on success. This would cause the wait loop to never succeed. Changed to `r.status_code == 204`.

## Review Notes
- The bash script uses `curl -sf` which correctly treats any 2xx response (including 204) as success, so no fix was needed there.
- The Kubernetes probe configuration places probes on the app container targeting the sidecar's port 3500. This works because containers in the same pod share a network namespace, but note that the Dapr sidecar injector typically adds its own probes on the sidecar container automatically.
- The post correctly describes the sidecar behavior when app health checks fail (stopping pub/sub subscriptions and input bindings).
