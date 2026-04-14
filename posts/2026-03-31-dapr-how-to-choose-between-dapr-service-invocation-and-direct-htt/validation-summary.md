# Validation Summary: How to Choose Between Dapr Service Invocation and Direct HTTP

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (service invocation, resiliency, name resolution, mTLS)
- Node.js / JavaScript (axios, @dapr/dapr SDK)
- Python (requests library with retry adapter)
- Go (OpenTelemetry trace propagation)
- Kubernetes (DNS-based service discovery)
- Apache Bench (ab) for benchmarking

## Sources Consulted
- Dapr Service Invocation How-To: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr JavaScript Client SDK: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Resiliency Spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Configuration Spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Security Concepts (mTLS): https://docs.dapr.io/concepts/security-concept/
- Dapr mTLS Setup: https://docs.dapr.io/operations/security/mtls/
- Dapr Service Invocation Performance: https://docs.dapr.io/operations/performance-and-scalability/perf-service-invocation/
- Dapr Service Invocation Overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/

## Issues Found

1. **Dapr JS SDK `HttpMethod` enum not used** (line 52-63): The blog used a plain string `'GET'` as the third argument to `client.invoker.invoke()`. The Dapr JS SDK requires the `HttpMethod` enum (e.g., `HttpMethod.GET`), not a string literal. Fixed by importing `HttpMethod` from `@dapr/dapr` and changing `'GET'` to `HttpMethod.GET`.

2. **Resiliency retry policy missing `policy` field** (line 108-111): The retry policy definition was missing the required `policy` field that specifies the retry strategy. Added `policy: constant` to the retry policy definition, which matches the behavior implied by the `duration` field (a fixed backoff interval).

## Review Notes
- The Dapr service invocation URL format (`http://localhost:3500/v1.0/invoke/{app-id}/method/{method}`) is correct with the default HTTP port 3500.
- The name resolution configuration YAML is correct for Kubernetes deployments.
- The mTLS claim is accurate -- Dapr enables mTLS by default between sidecars via the Sentry service.
- The 1-3ms latency overhead claim is reasonable and aligns with official Dapr performance benchmarks (p90 ~1.4ms, p99 ~2.1ms).
- The network hop description (app -> sidecar -> sidecar -> app) accurately represents the Dapr service invocation flow.
- The Python retry example and Go OpenTelemetry trace propagation code are syntactically correct and use current APIs.
- The Go code snippet is missing `"net/http"` in its import block, but this is acceptable as a partial snippet showing only the tracing-relevant imports.
