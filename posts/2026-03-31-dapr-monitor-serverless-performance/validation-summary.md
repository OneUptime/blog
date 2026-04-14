# Validation Summary: How to Monitor Dapr Serverless Application Performance

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus (metrics scraping and PromQL)
- Grafana (dashboard queries)
- Kubernetes (annotations, service discovery)
- OpenTelemetry / Zipkin (distributed tracing)
- Python prometheus_client library

## Sources Consulted
- [Dapr Metrics Overview / Configure Metrics](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) — verified configuration field name (`spec.metrics`, not `spec.metric`) and annotation names
- [Dapr Metrics Reference (GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) — verified all metric names for service invocation, state store, pub/sub, gRPC, and HTTP
- [Dapr Prometheus Integration](https://docs.dapr.io/operations/observability/metrics/prometheus/) — verified Prometheus scrape configuration and Kubernetes service discovery setup
- [Dapr Kubernetes Annotations Reference](https://docs.dapr.io/reference/arguments-annotations-overview/) — verified annotation names and default values

## Issues Found

### 1. Configuration field name: `spec.metric` should be `spec.metrics`
The Dapr Configuration spec uses `metrics` (plural), not `metric` (singular). Changed `spec.metric` to `spec.metrics` in the YAML configuration example.

### 2. Incorrect service invocation metric names (missing `_runtime_` prefix)
The post listed `dapr_service_invocation_req_sent_total` and `dapr_service_invocation_req_recv_total`. The correct names include the `_runtime_` prefix: `dapr_runtime_service_invocation_req_sent_total` and `dapr_runtime_service_invocation_req_recv_total`. Also added the latency metric `dapr_runtime_service_invocation_res_recv_latency_ms` since the original comment claimed these were latency metrics when they are actually counters.

### 3. Incorrect state store metric names
The post listed `dapr_state_get_total` and `dapr_state_set_total`, which do not exist. The actual metrics are `dapr_component_state_count` and `dapr_component_state_latencies`.

### 4. Incorrect pub/sub metric names
The post listed `dapr_pubsub_incoming_messages_total` and `dapr_pubsub_process_duration_milliseconds`, which do not exist. The actual metrics are `dapr_component_pubsub_ingress_count`, `dapr_component_pubsub_ingress_latencies`, and `dapr_component_pubsub_egress_count`.

### 5. Fabricated sidecar metrics
The post listed `dapr_runtime_restart_total` and `process_resident_memory_bytes` as "Sidecar resource usage" metrics. Neither appears in the official Dapr metrics reference. Replaced with actual sidecar performance metrics: `dapr_http_server_request_count` and `dapr_grpc_io_server_completed_rpcs`.

### 6. Wrong metric in average latency PromQL query
The query used `dapr_grpc_io_server_completed_rpcs_sum/_count`, but `completed_rpcs` is a counter (not a histogram) and does not have `_sum`/`_count` sub-metrics. The correct histogram for gRPC latency is `dapr_grpc_io_server_server_latency`. Changed to use `dapr_grpc_io_server_server_latency_sum` / `dapr_grpc_io_server_server_latency_count`.

### 7. Error rate query used non-existent label
The query filtered on `dapr_service_invocation_req_sent_total{success="false"}`, but this counter metric does not have a `success` label. Changed to use `dapr_http_server_response_count{status=~"5.."}` which filters HTTP responses by 5xx status codes.

### 8. State store p95 query used wrong metric name
Changed `dapr_state_get_duration_milliseconds_bucket` to `dapr_component_state_latencies_bucket` to match the actual Dapr metric.

### 9. Alert rule applied `histogram_quantile` to a counter metric
The alert used `histogram_quantile(0.99, rate(dapr_service_invocation_req_sent_total[5m]))`. The `histogram_quantile` function requires histogram bucket data (metrics ending in `_bucket`), not a `_total` counter. This would produce a Prometheus query error. Changed to use `dapr_http_server_latency_bucket` and adjusted threshold from `0.5` to `500` (the metric is in milliseconds, not seconds).

## Review Notes
- The Prometheus scrape configuration and Kubernetes relabeling rules are correct and follow standard patterns for Dapr sidecar discovery.
- The Python `prometheus_client` code example is syntactically correct and follows best practices.
- The tracing configuration in the Dapr Configuration YAML (Zipkin endpoint) is correctly structured.
- The `dapr.io/enable-metrics` annotation usage is correct per official documentation.
- Dapr metric names have changed across versions. The corrected names reflect the metrics available in Dapr 1.10+ which uses OpenTelemetry-based metrics collection.
