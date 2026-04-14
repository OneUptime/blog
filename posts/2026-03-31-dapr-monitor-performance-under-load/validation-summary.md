# Validation Summary: How to Monitor Dapr Performance Under Load

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation, pub/sub, state store)
- Prometheus (metrics scraping, relabel configs, alerting rules)
- Grafana (dashboard PromQL queries)
- Kubernetes (pod annotations, service discovery)
- Zipkin / Jaeger (distributed tracing)
- hey (HTTP load testing tool)

## Sources Consulted
- Dapr official documentation: metrics overview (https://docs.dapr.io/operations/observability/metrics/metrics-overview/)
- Dapr official documentation: tracing setup (https://docs.dapr.io/operations/observability/tracing/setup-tracing/)
- Dapr official documentation: Zipkin tracing (https://docs.dapr.io/operations/observability/tracing/zipkin/)
- Dapr official documentation: service invocation (https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/)
- Dapr source code on GitHub: `pkg/diagnostics/http_monitoring.go`, `component_monitoring.go`, `grpc_monitoring.go`, `metrics.go` for metric name verification
- Prometheus documentation: histogram_quantile function and relabel_configs

## Issues Found

1. **Prometheus relabel config: broken `__address__` replacement** — The second relabel rule set `__address__` to just the bare port number from `__meta_kubernetes_pod_annotation_dapr_io_metrics_port` (e.g., "9090"), but `__address__` requires `host:port` format. Fixed by combining `__meta_kubernetes_pod_ip` and the port annotation using `regex: (.+);(.+)` and `replacement: $1:$2`.

2. **PromQL histogram_quantile missing aggregation** — The P99 latency query used `rate()` directly inside `histogram_quantile()` without aggregating by the `le` label. Without `sum(...) by (le)`, the query produces per-series quantiles instead of a single aggregated P99. Fixed by wrapping the `rate()` call in `sum(...) by (le)`.

3. **Wrong metric name: `dapr_component_pubsub_publish_count`** — This metric does not exist in Dapr. The correct metric for pub/sub publish (egress) operations is `dapr_component_pubsub_egress_count`. Fixed in the metrics table.

4. **Wrong metric names: `dapr_component_state_get_count` and `dapr_component_state_set_count`** — Dapr does not expose separate metrics for state get and set. Instead, it uses a single metric `dapr_component_state_count` with an `operation` label (values: `get`, `set`, `delete`, `bulk_get`, `bulk_delete`, `transaction`, `query`). Fixed in the metrics table to `dapr_component_state_count{operation="get"}` and `dapr_component_state_count{operation="set"}`.

5. **Wrong metric name: `dapr_grpc_server_completed_rpcs`** — The correct Prometheus metric name is `dapr_grpc_io_server_completed_rpcs` (includes `io` from the OpenCensus internal name `grpc.io/server/completed_rpcs`). Fixed in the metrics table.

6. **Wrong label name: `status_code`** — Dapr's HTTP server request count metric uses the label `status`, not `status_code` (defined as `httpStatusCodeKey = tag.MustNewKey("status")` in source). Fixed in both the error rate PromQL query and the Prometheus alert rule expression.

## Review Notes
- The Dapr annotations (`dapr.io/enable-metrics`, `dapr.io/metrics-port`), tracing Configuration CRD, and service invocation URL format are all correct.
- The `samplingRate: "0.05"` for 5% sampling is correctly formatted as a string value between "0" and "1".
- The Zipkin endpoint address format with Jaeger collector on port 9411 is valid since Jaeger supports the Zipkin-compatible API.
- The `hey` load testing tool command syntax is correct (`-n` for total requests, `-c` for concurrency).
- Metric names were verified against the Dapr source code (`pkg/diagnostics/`). Future Dapr versions may change metric naming if they migrate from OpenCensus to OpenTelemetry natively.
