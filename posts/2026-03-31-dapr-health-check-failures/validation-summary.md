# Validation Summary: How to Fix Dapr Health Check Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (probes, pod lifecycle, annotations)
- Dapr Sidecar (daprd)
- Dapr CLI
- Python (Flask health endpoint example)

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI components command reference: https://docs.dapr.io/reference/cli/dapr-components/
- Dapr sidecar concepts: https://docs.dapr.io/concepts/dapr-services/sidecar/

## Issues Found

1. **Sidecar probe annotations missing `-seconds` suffix**: The blog used `dapr.io/sidecar-liveness-probe-delay`, `dapr.io/sidecar-readiness-probe-delay`, `dapr.io/sidecar-liveness-probe-period`, `dapr.io/sidecar-readiness-probe-period`, and `dapr.io/sidecar-liveness-probe-timeout`. The correct annotation names all end in `-seconds` (e.g., `dapr.io/sidecar-liveness-probe-delay-seconds`). Fixed all five annotations to include the `-seconds` suffix per the official Dapr annotations reference.

2. **Incorrect healthz response code**: The blog stated the healthy response returns "`204` or `200`". Per the official Dapr Health API documentation, the `/v1.0/healthz` endpoint returns `204 No Content` when healthy and `500` when unhealthy. The mention of `200` was inaccurate. Fixed to state `204 No Content` only.

3. **Incorrect CLI flag for namespace**: The blog used `dapr components -k -n <namespace>`, but the `-n` flag is shorthand for `--name` (component name filter), not namespace. The correct flag for filtering by namespace is `--namespace`. Fixed the command to use `--namespace`.

4. **Misleading wording about component configuration**: The blog said "Configure the app health check in your component or via annotation." App health checks are not configured in Dapr components; they are configured via Kubernetes annotations (or Dapr configuration). Fixed to say "via annotations" only.

## Review Notes
- The blog correctly identifies port 3500 as the default Dapr HTTP port for the sidecar API.
- The app health check annotations (`dapr.io/enable-app-health-check`, `dapr.io/app-health-check-path`, etc.) are all correct per the official documentation.
- The Python Flask health endpoint example is functional and appropriate.
- The `kubectl` commands for inspecting pods and logs are standard and correct.
- Since Dapr 1.12, the readiness probe uses `/v1.0/healthz/outbound` rather than `/v1.0/healthz`, which allows apps to make outbound Dapr API calls before the app channel is fully established. The blog uses `/v1.0/healthz` throughout, which is still the correct liveness probe endpoint. This distinction could be mentioned in a future update but is not incorrect as written.
