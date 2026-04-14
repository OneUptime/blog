# Validation Summary: How to Monitor Service Invocation Performance in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, sidecar metrics)
- Prometheus (scraping, PromQL queries)
- Grafana (dashboard import)
- Zipkin (distributed tracing, trace querying)
- Kubernetes (pod annotations, service discovery)

## Sources Consulted
- Dapr metrics reference: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metrics development docs: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr tracing setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Zipkin how-to: https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Grafana dashboards in repo: https://github.com/dapr/dapr/tree/master/grafana
- Grafana Dashboard Import HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Zipkin API v2 spec: https://github.com/openzipkin/zipkin-api/blob/master/zipkin2-api.yaml
- Prometheus relabeling docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config

## Issues Found

### 1. Incorrect HTTP client metric names (metric table and PromQL queries)
- **Wrong:** `dapr_http_client_request_count` (does not exist)
- **Fixed to:** `dapr_http_client_completed_count`
- **Why:** The official Dapr metric for outbound HTTP request counts is `dapr_http_client_completed_count`, not `dapr_http_client_request_count`.

### 2. Incorrect HTTP client latency metric name (metric table and PromQL queries)
- **Wrong:** `dapr_http_client_latency` (does not exist)
- **Fixed to:** `dapr_http_client_roundtrip_latency`
- **Why:** The official Dapr metric for client-side HTTP latency is `dapr_http_client_roundtrip_latency`.

### 3. Incorrect gRPC metric name
- **Wrong:** `dapr_grpc_server_io_server_latency` (wrong word order)
- **Fixed to:** `dapr_grpc_io_server_server_latency`
- **Why:** The correct prefix is `dapr_grpc_io_server_server_latency` (note the double "server"), not `dapr_grpc_server_io_server_latency`.

### 4. Incorrect Grafana dashboard filename in URL
- **Wrong:** `grafana-dapr-system-services-dashboard.json`
- **Fixed to:** `grafana-system-services-dashboard.json`
- **Why:** The actual file in the dapr/dapr repository is named `grafana-system-services-dashboard.json` (no `-dapr-` segment).

### 5. Grafana import API command missing JSON wrapper and authentication
- **Wrong:** `curl -X POST ... -d @dapr-dashboard.json` (passes raw dashboard JSON)
- **Fixed to:** Wrapped dashboard in required `{"dashboard": ...}` JSON envelope and added `Authorization: Bearer <API_KEY>` header.
- **Why:** The Grafana `/api/dashboards/import` endpoint requires the dashboard JSON to be nested inside a `"dashboard"` property, and requires authentication.

### 6. Broken Prometheus relabel configuration
- **Wrong:** The second relabel rule used only `__meta_kubernetes_pod_annotation_prometheus_io_port` as the source label and appended `:9090`, producing an address like `9090:9090` (port:port) instead of a valid `ip:port`.
- **Fixed to:** Standard pattern using both `__address__` and the port annotation as source labels, extracting the host from the existing address and combining it with the annotated port.
- **Why:** The relabel rule must preserve the pod IP from `__address__` and only replace the port portion.

## Review Notes
- The PromQL patterns themselves (rate division for average, histogram_quantile for percentiles) are correct and idiomatic.
- The Dapr Configuration CRD for tracing is correct (apiVersion, field paths, Zipkin endpoint).
- The Zipkin API query for slow traces is correct (minDuration in microseconds).
- The default metrics port (9090) and scrape path ("/") are correct for Dapr.
- The Dapr pod annotations (`dapr.io/enable-metrics`, `dapr.io/metrics-port`) are correct.
- The sampling rate explanation ("1" = 100%, "0.1" = 10%) is correct.
