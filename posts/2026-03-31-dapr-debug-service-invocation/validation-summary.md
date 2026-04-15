# Validation Summary: How to Debug Failed Service Invocations in Dapr

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — sidecar architecture, service invocation API
- Kubernetes (kubectl commands, pod annotations, port-forwarding)
- Zipkin / Jaeger (distributed tracing)
- Dapr CLI (dapr run, dapr list)
- mTLS via Dapr Sentry service

## Sources Consulted
- Dapr Health API reference — https://docs.dapr.io/reference/api/health_api/
- Dapr Metadata API reference — https://docs.dapr.io/reference/api/metadata_api/
- Dapr annotations and arguments overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI: dapr list — https://docs.dapr.io/reference/cli/dapr-list/
- Dapr CLI: dapr run — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr mTLS documentation — https://docs.dapr.io/operations/security/mtls/
- Dapr Service Invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/

## Issues Found
- **Incorrect description of `/v1.0/healthz/outbound` endpoint**: The post described this as "Check app health via sidecar," which is misleading. According to the official Dapr Health API docs, the `/v1.0/healthz/outbound` endpoint checks whether the sidecar's outbound dependencies (components, HTTP port) are ready — it explicitly does *not* require the app channel to be established. It is designed for the app to verify sidecar outbound readiness, not for checking app health. Fixed the comment to: "Check sidecar outbound readiness (components initialized, ready for outbound calls)."

## Review Notes
- The Sentry restart command (`kubectl rollout restart deployment dapr-sentry -n dapr-system`) is correct, but the official Dapr docs recommend also restarting other control plane components (operator, placement-server, scheduler-server, sidecar-injector) when restarting Sentry for mTLS issues. The blog omits this, which could lead to incomplete resolution.
- The HTTP status codes listed as "Common Failure Modes" (404, 503, 401, 403, 408, 500) are practical observations. The official Service Invocation API reference only explicitly documents 400 (method name not given), 403 (access control denial), and 500 (request failed), noting that upstream status codes are passed through. The blog's list is reasonable as a practical guide but 404/503/401/408 are not Dapr-specific documented codes. The post also omits 400.
- All CLI commands (`dapr run`, `dapr list`, `kubectl` commands), annotations (`dapr.io/log-level`, `dapr.io/log-as-json`), API paths (`/v1.0/metadata`, `/v1.0/healthz`), and default ports (3500 for Dapr HTTP, 9411 for Zipkin) are confirmed correct.
