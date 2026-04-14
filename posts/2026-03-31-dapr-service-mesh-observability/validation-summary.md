# Validation Summary: How to Use Service Mesh Observability with Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Istio (service mesh)
- Prometheus (metrics collection and alerting)
- Jaeger (distributed tracing)
- Grafana (dashboarding)
- Envoy proxy (data plane for Istio)
- Kiali (service mesh observability)
- W3C Trace Context (distributed tracing standard)

## Sources Consulted
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr source code (`pkg/diagnostics/service_monitoring.go`): https://github.com/dapr/dapr/blob/master/pkg/diagnostics/service_monitoring.go
- Dapr metrics development docs: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr configuration reference (tracing): https://docs.dapr.io/operations/configuration/configuration-overview/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio API PR #3133 (Telemetry v1 promotion): https://github.com/istio/api/pull/3133
- Jaeger query API documentation

## Issues Found

### 1. Istio Telemetry API version outdated
- **What was wrong**: The Istio Telemetry resource used `apiVersion: telemetry.istio.io/v1alpha1`.
- **What was changed**: Updated to `apiVersion: telemetry.istio.io/v1`.
- **Why**: The Telemetry API was promoted to `v1` in Istio 1.22 (May 2024). The official Istio documentation exclusively uses `v1` in all examples. While `v1alpha1` may still be accepted for backward compatibility, new guides should use the stable API version.

### 2. Incorrect Dapr metric name (missing `runtime_` prefix)
- **What was wrong**: PromQL queries and alert rules used `dapr_service_invocation_req_sent_total`, which is not a valid Dapr metric. All Dapr runtime metrics use the `dapr_runtime_` prefix (the internal OpenCensus name `runtime/service_invocation/req_sent_total` is exported in Prometheus format with slashes converted to underscores).
- **What was changed**: Updated to `dapr_runtime_service_invocation_res_recv_total` in both the Grafana dashboard PromQL queries and the Prometheus alerting rule.
- **Why**: The metric `dapr_service_invocation_req_sent_total` does not exist in any Dapr version. The correct prefix is `dapr_runtime_`.

### 3. Wrong Dapr metric variant for status-based filtering
- **What was wrong**: The queries filtered on `{status="200"}` and `{status!="200"}` using the request-sent metric (`req_sent_total`). The `status` label only exists on response metrics (`res_recv_total` and `res_sent_total`), not on request metrics.
- **What was changed**: Changed from `req_sent_total` to `res_recv_total` (responses received by the caller), which carries the `status` label needed for success/error rate calculations.
- **Why**: Filtering by HTTP status code requires a response metric. The `req_sent_total` metric records that a request was sent but does not yet know the response status. The `res_recv_total` metric records completed round-trips with the response status code.

## Review Notes
- The Dapr Configuration resource for tracing (`apiVersion: dapr.io/v1alpha1`, `kind: Configuration`) is correct and current.
- The Dapr metrics port (9090) is correct.
- The W3C Trace Context (`traceparent` header) correlation between Dapr and Istio/Envoy is accurately described.
- The Istio metric names (`istio_requests_total`, `istio_request_duration_milliseconds_bucket`) and labels (`response_code`, `destination_service_name`) are all correct per the official Istio metrics reference.
- The Jaeger query API endpoint format (`/api/traces?service=...&limit=...`) on port 16686 is correct.
- The `pilot-agent request GET stats` command for checking Envoy stats is correct.
- The Prometheus alerting rule YAML structure is valid.
- The PromQL queries block uses a `yaml` code fence language tag, which is technically incorrect (PromQL is not YAML), but this is a minor formatting concern rather than a technical error.
