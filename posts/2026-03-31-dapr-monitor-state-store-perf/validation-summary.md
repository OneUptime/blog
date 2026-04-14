# Validation Summary: How to Monitor State Store Performance in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, state management building block)
- Prometheus (metrics scraping, PromQL queries, alerting rules)
- Grafana (dashboard configuration)
- OpenTelemetry / distributed tracing (Zipkin, Jaeger)
- Kubernetes (pod annotations, service discovery)
- Redis (monitoring commands)

## Sources Consulted
- Dapr Metrics Documentation: https://docs.dapr.io/operations/observability/metrics/
- Dapr Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Tracing Configuration: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr OpenTelemetry Collector Integration: https://docs.dapr.io/operations/observability/tracing/otel-collector/open-telemetry-collector/
- Dapr Runtime Metrics Source (pkg/diagnostics/component_monitoring.go): https://github.com/dapr/dapr
- Prometheus Relabeling Documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config

## Issues Found

### 1. Incorrect state operation counter metric name
- **Wrong:** `dapr_component_state_operations_total`
- **Fixed to:** `dapr_component_state_count`
- **Why:** Dapr uses OpenTelemetry-based metric names. The actual counter metric for state operations is `dapr_component_state_count`, not the Prometheus-convention `_total` suffix name. This affected the metrics table, all PromQL queries, Grafana dashboard expressions, alerting rules, and the summary paragraph.

### 2. Incorrect state latency histogram metric name
- **Wrong:** `dapr_component_state_operation_duration_milliseconds`
- **Fixed to:** `dapr_component_state_latencies`
- **Why:** The actual histogram metric for state operation latency is `dapr_component_state_latencies`, not the verbose `_operation_duration_milliseconds` form. This affected the metrics table, PromQL queries (including `_bucket` suffix references), Grafana dashboard expressions, and alerting rules.

### 3. Incorrect error filtering label
- **Wrong:** `{status="error"}` / `{status='error'}`
- **Fixed to:** `{success="false"}` / `{success='false'}`
- **Why:** Dapr's state metrics use a `success` label with values `"true"` or `"false"`, not a `status` label with `"error"`. This affected the error rate PromQL query, Grafana error rate panel, and the alerting rule for high error rate.

### 4. Incorrect tracing span names
- **Wrong:** `CallLocal/statestore/get` and `CallLocal/statestore/set`
- **Fixed to:** `GET /v1.0/state/statestore/{key}` and `POST /v1.0/state/statestore`
- **Why:** The `CallLocal` prefix is used in Dapr for service-to-service invocation spans, not state operations. State operation spans follow the Dapr HTTP API path structure.

### 5. Updated metric table descriptions
- Revised description for `dapr_component_state_count` to accurately reflect its labels (component, operation, success).
- Revised description for `dapr_component_state_latencies` to note it measures latency in milliseconds.

## Review Notes
- The Prometheus scrape configuration's second relabel rule (setting `__metrics_path__` to `/metrics`) is technically redundant since `/metrics` is already the default scrape path in Prometheus, but it is not incorrect.
- The `dapr_http_server_request_count` and `dapr_http_server_latency` metric names were verified as correct.
- The default metrics port (9090), endpoint path (/metrics), and `dapr.io/metrics-port` annotation are all correct.
- The tracing configuration (`otel.endpointAddress`, `otel.protocol`) fields are correct per Dapr docs.
- The Redis monitoring commands are all valid and correct.
- The Grafana dashboard JSON is a simplified snippet for illustration; a production dashboard would need additional fields (datasource, panel IDs, grid positions, etc.).
