# Validation Summary: How to Debug Dapr State Store Query Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar, state management API, query API, configuration, profiling)
- Prometheus (metrics scraping)
- Zipkin (distributed tracing)
- Redis (state store backend, slowlog, connection pooling)
- PostgreSQL (state store backend, query logging)
- Kubernetes (port-forwarding, pod annotations)
- Go pprof (CPU profiling)

## Sources Consulted
- Dapr Metrics Reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Metrics Configuration: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus How-To: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Redis State Store Reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Profiling & Debugging: https://docs.dapr.io/operations/troubleshooting/profiling-debugging/
- Dapr Arguments & Annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Query How-To: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/

## Issues Found

### 1. Incorrect Prometheus metric name
- **What was wrong:** The post referenced `dapr_component_state_latency` (singular) as the metric name.
- **What was changed:** Corrected to `dapr_component_state_latencies` (plural), which is the actual histogram metric name exposed by Dapr.
- **Why:** The Dapr metrics reference documents the metric as `dapr_component_state_latencies`. All Dapr latency metrics use the plural `-latencies` suffix.

### 2. Non-existent Kubernetes service for metrics
- **What was wrong:** The post used `kubectl port-forward svc/dapr-metrics 9090:9090 -n dapr-system` suggesting a centralized metrics service exists.
- **What was changed:** Corrected to `kubectl port-forward <your-app-pod> 9090:9090` since each Dapr sidecar exposes its own metrics on port 9090. There is no `svc/dapr-metrics` service in the `dapr-system` namespace.
- **Why:** Dapr metrics are exposed per-sidecar on each application pod's port 9090 (configurable via `dapr.io/metrics-port` annotation). Prometheus discovers them via pod-level service discovery, not a centralized service.

### 3. Incorrect profiling port number
- **What was wrong:** The post used port 7778 for the Dapr pprof profiling endpoint.
- **What was changed:** Corrected to port 7777, which is the actual default profiling port for the Dapr sidecar.
- **Why:** The `--profile-port` flag on `daprd` defaults to 7777. The port 7778 is not a documented Dapr port.

## Review Notes
- The State Query API endpoint (`/v1.0-alpha1/state/{storeName}/query`) is correctly shown but remains in alpha status. The post does note that not all stores support it, which is appropriate.
- Profiling must be explicitly enabled (via `dapr.io/enable-profiling: "true"` annotation in Kubernetes or `--enable-profiling` flag in standalone mode). The post doesn't mention this prerequisite, but this is a minor omission rather than an error.
- The Redis state store component metadata fields (`redisHost`, `maxRetries`, `dialTimeout`, `readTimeout`, `poolSize`) are all correctly named and documented.
- The tracing Configuration resource, bulk state save API, Redis slowlog commands, and PostgreSQL logging configuration are all technically correct.
