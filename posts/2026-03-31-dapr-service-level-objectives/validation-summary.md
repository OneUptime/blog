# Validation Summary: How to Implement Service Level Objectives (SLO) for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar metrics)
- Prometheus (PromQL, recording rules, alerting rules)
- Grafana (dashboard visualization)
- Kubernetes (ConfigMap for dashboard provisioning)

## Sources Consulted
- Dapr runtime source code (`github.com/dapr/dapr/pkg/diagnostics/http_monitoring.go`) for exact metric names, types, and labels
- Dapr metrics documentation (https://docs.dapr.io/operations/observability/metrics/)
- Prometheus documentation for `histogram_quantile` function (https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile)
- Google SRE Workbook, Chapter 5: Alerting on SLOs — for multi-window burn rate alert thresholds (14.4x/1h, 6x/6h)

## Issues Found

### 1. Wrong latency histogram metric name
- **What was wrong:** The post used `dapr_http_server_request_latency_ms_bucket` and `dapr_http_server_request_latency_ms_count`. These metric names do not exist in Dapr.
- **What was changed:** Replaced with `dapr_http_server_latency_bucket` and `dapr_http_server_latency_count`. The Dapr HTTP server latency histogram is named `dapr_http_server_latency` (unit is milliseconds, but `_ms` is not part of the metric name, and there is no `request_` segment).
- **Why:** Using the wrong metric names would cause all latency-related PromQL queries to return no data.

### 2. Missing `sum by (le)` in `histogram_quantile`
- **What was wrong:** The latency alert used `histogram_quantile(0.99, rate(dapr_http_server_latency_bucket{...}[5m]))` without aggregating by the `le` label.
- **What was changed:** Added `sum by (le)` around the `rate()` expression: `histogram_quantile(0.99, sum by (le) (rate(...)))`.
- **Why:** Without `sum by (le)`, Prometheus computes a separate quantile for each individual time series (e.g., per-pod). In a multi-replica deployment this returns multiple results rather than the aggregate p99 across all instances, which is what an SLO alert needs.

## Review Notes
- The error budget math is correct: 0.1% of a 30-day window is ~43.2 minutes.
- The burn rate thresholds (14.4x for 1h fast-burn, 6x for 6h slow-burn) align with Google's SRE Workbook recommendations.
- The `dapr_http_server_request_count` metric name is correct — it is the always-registered counter in all Dapr modes (legacy and non-legacy). The alternative `dapr_http_server_response_count` only exists in legacy mode.
- Using `rate()` over a `[30d]` range in the error budget query is technically valid but expensive in production. A production deployment would typically use recording rules with shorter intervals that get aggregated. The blog acknowledges this by showing a recording rule, which is good.
- The SLO definition YAML at the top is a conceptual document (not a Dapr or Prometheus config format), which is fine for illustration purposes.
- The post counts all non-2xx responses as errors (`status!~"2.."`). This is a valid but opinionated choice — some teams exclude 4xx client errors from SLO calculations. The approach is internally consistent throughout the post.
