# Validation Summary: How to Respond to Dapr High Latency Alerts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation, state stores, pub/sub)
- Prometheus (metrics querying, PromQL, histogram_quantile)
- Kubernetes (kubectl, pod annotations, cgroups, resource limits)
- gRPC (service invocation protocol)
- Dapr Resiliency (timeout and retry policies)

## Sources Consulted
- Dapr metrics reference and source code (pkg/diagnostics/http_monitoring.go, grpc_monitoring.go, component_monitoring.go) for actual Prometheus metric names
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Resiliency spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr timeout policies: https://docs.dapr.io/operations/resiliency/policies/timeouts/

## Issues Found

### 1. Incorrect HTTP latency metric name (Step 1)
- **Wrong:** `dapr_http_server_request_duration_seconds_bucket`
- **Fixed to:** `dapr_http_server_latency_bucket`
- **Why:** Dapr uses OpenCensus-style metric naming (`_latency` in milliseconds), not the OpenTelemetry `_duration_seconds` convention. The original name does not exist in Dapr's metric registry.

### 2. Incorrect gRPC latency metric name (Step 1)
- **Wrong:** `dapr_grpc_io_server_completed_rpcs_seconds_bucket`
- **Fixed to:** `dapr_grpc_io_server_server_latency_bucket`
- **Why:** `dapr_grpc_io_server_completed_rpcs` is a counter metric (counting completed RPCs), not a latency histogram. The actual gRPC latency histogram is `dapr_grpc_io_server_server_latency`. Appending `_seconds_bucket` to a counter metric name is invalid.

### 3. Incorrect state store metric name (Step 2)
- **Wrong:** `dapr_component_state_get_duration_seconds`
- **Fixed to:** `dapr_component_state_latencies`
- **Why:** Dapr does not have separate metrics per state operation. It uses a single `dapr_component_state_latencies` histogram with an `operation` label to distinguish `get`, `set`, `delete`, etc.

### 4. Incorrect pub/sub metric name (Step 2)
- **Wrong:** `dapr_component_pubsub_publish_duration_seconds`
- **Fixed to:** `dapr_component_pubsub_egress_latencies`
- **Why:** Dapr uses "egress" for publish operations and "ingress" for subscribe operations in its metric naming, not "publish"/"subscribe".

## Review Notes
- The cgroup path `/sys/fs/cgroup/cpu/cpu.stat` in Step 3 is for cgroups v1. Many newer Kubernetes clusters use cgroups v2, where the equivalent path is `/sys/fs/cgroup/cpu.stat`. The post does not specify the cgroup version, which could cause confusion on v2 clusters.
- Dapr's latency metrics use milliseconds as the unit, not seconds. The PromQL queries will return values in milliseconds. Readers should be aware of this when setting alerting thresholds.
- All five Kubernetes sidecar annotations (`dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-cpu-request`, `dapr.io/app-protocol`, `dapr.io/app-port`, `dapr.io/app-max-concurrency`) are correct per official Dapr documentation.
- The Resiliency spec YAML is fully correct, including the apiVersion, kind, and all field names under `spec.policies`.
