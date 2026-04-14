# Validation Summary: How to Handle Timeout Errors in Dapr Service Invocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency Policies (timeouts, retries, circuit breakers)
- Dapr Python SDK (`dapr-client`)
- Prometheus metrics for Dapr
- Grafana alerting (PromQL)

## Sources Consulted
- Dapr Resiliency Spec Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry Policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Circuit Breaker Policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Python SDK source (GitHub): https://github.com/dapr/python-sdk/blob/master/dapr/clients/__init__.py
- Dapr metrics source (GitHub): https://github.com/dapr/dapr/blob/master/pkg/diagnostics/service_monitoring.go
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/

## Issues Found

### 1. Per-request timeout used a non-existent `dapr-timeout-ms` header
**What was wrong:** The "Per-Request Timeout Override" section used gRPC metadata with a header named `dapr-timeout-ms` to set per-request timeouts. This header does not exist in the Dapr specification and would be silently ignored by the Dapr sidecar.
**What was changed:** Replaced the metadata-based approach with the Dapr Python SDK's native `timeout` parameter on `invoke_method`, which accepts an integer value in seconds. Removed the unused `import grpc` and added the missing `import json`.
**Why:** The `invoke_method` function has a built-in `timeout` parameter specifically for per-request timeouts, making the metadata workaround unnecessary and incorrect.

### 2. Wrong Prometheus metric name (missing `runtime_` segment)
**What was wrong:** The blog used `dapr_service_invocation_req_sent_total` as the metric name in both the curl command and the Grafana alert rule.
**What was changed:** Corrected to `dapr_runtime_service_invocation_res_recv_total`.
**Why:** The actual Prometheus metric name includes a `runtime_` segment (e.g., `dapr_runtime_service_invocation_*`). Additionally, the `status` label used for filtering by HTTP status code only exists on response metrics (`res_recv_total`, `res_sent_total`), not on the request-sent metric. The `res_recv_total` metric is the correct one for tracking response status codes.

### 3. `status` label not available on `req_sent_total`
**What was wrong:** The PromQL queries filtered `req_sent_total` by `status="504"`, but the `status` label is not present on request-sent metrics.
**What was changed:** Switched to `res_recv_total` which does carry the `status` label.
**Why:** In Dapr's metrics implementation, the `req_sent_total` metric only has `app_id`, `dst_app_id`, and `type` labels. The `status` label is recorded on response metrics where the HTTP status code is available.

## Review Notes
- The resiliency YAML uses `consecutiveFailures >= 3` in the circuit breaker `trip` expression. While valid CEL syntax, all official Dapr examples use `>` (greater-than) rather than `>=`. This is not incorrect but deviates from convention.
- The circuit breaker configuration omits the `interval` field, which defaults to `0s` (counters never reset). This is valid but uncommon in production configurations.
- The Python SDK's `invoke_method` also provides a `.json()` convenience method on the response object, which could simplify `json.loads(response.data)` calls, but this is a style preference rather than an error.
