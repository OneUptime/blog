# Validation Summary: How to Monitor Dapr API Call Latency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus (metrics collection and querying)
- PromQL (Prometheus Query Language)
- Grafana (visualization)
- Jaeger (distributed tracing)
- OpenCensus (Dapr's internal metrics library)

## Sources Consulted
- Dapr source code on GitHub (`pkg/diagnostics/http_monitoring.go`, `pkg/diagnostics/grpc_monitoring.go`, `pkg/diagnostics/component_monitoring.go`, `pkg/metrics/exporter.go`) for actual metric name definitions
- Dapr metrics documentation at https://docs.dapr.io/operations/observability/metrics/
- Prometheus documentation for `histogram_quantile` usage at https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus alerting rules documentation at https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Jaeger API documentation at https://www.jaegertracing.io/docs/apis/

## Issues Found

1. **All metric names had a fabricated `_ms` suffix.** Dapr metric names do not include `_ms` in their Prometheus names. The unit (milliseconds) is stored in OpenCensus metadata, not in the metric name. Fixed all occurrences:
   - `dapr_http_server_latency_ms` → `dapr_http_server_latency`
   - `dapr_http_client_roundtrip_latency_ms` → `dapr_http_client_roundtrip_latency`
   - `dapr_component_pubsub_ingress_latencies_ms` → `dapr_component_pubsub_ingress_latencies`
   - All `_bucket`, `_sum`, `_count` suffixed variants updated accordingly throughout all PromQL queries.

2. **gRPC metric name was completely wrong.** The post used `dapr_grpc_server_io_latency_ms` but the actual metric is `dapr_grpc_io_server_server_latency`. The internal OpenCensus name is `grpc.io/server/server_latency`, which sanitizes to `grpc_io_server_server_latency` with the `dapr_` namespace prefix. Fixed in both the metric list and PromQL queries.

3. **State store metric name was wrong.** The post used `dapr_component_state_get_latencies_ms` implying a GET-specific metric. The actual metric is `dapr_component_state_latencies` with an `operation` label (values: `get`, `set`, `delete`, `transaction`, `query`, `bulk_get`, `bulk_delete`). Fixed the name and added clarification about the `operation` label.

4. **HTTP status code label name was wrong.** The error correlation query used `status_code` as the label name, but the actual Dapr HTTP metric label is `status`. Fixed in the PromQL query.

## Review Notes
- The PromQL patterns (`histogram_quantile`, `rate`, average calculation) are all correct and follow best practices.
- The Prometheus alerting rule YAML structure is valid.
- The Jaeger API query URL format is correct.
- The conceptual explanation of Prometheus histograms (`_bucket`, `_sum`, `_count`) is accurate.
- The overall approach and methodology described in the post is sound — the errors were limited to specific metric and label names.
