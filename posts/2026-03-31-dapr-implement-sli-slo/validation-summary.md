# Validation Summary: How to Implement SLI/SLO for Dapr Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar runtime for microservices)
- Prometheus (monitoring and recording rules)
- Prometheus Operator (PrometheusRule CRD)
- Grafana (dashboard visualization)
- SLI/SLO methodology (Google SRE error budget burn rate alerting)

## Sources Consulted
- Dapr metrics source code: `pkg/diagnostics/http_monitoring.go` in dapr/dapr repository
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/
- Google SRE Workbook, Chapter 5 - Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference for PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found

### 1. Incorrect Dapr latency metric names
- **What was wrong:** The post used `dapr_http_server_request_duration_msec_bucket` and `dapr_http_server_request_duration_msec_count` as the histogram metric names for HTTP request latency.
- **What was changed:** Replaced with `dapr_http_server_latency_bucket` and `dapr_http_server_latency_count`, which are the actual metric names exposed by Dapr's HTTP monitoring diagnostics.
- **Why:** Dapr names its HTTP server latency histogram `dapr_http_server_latency`, not `dapr_http_server_request_duration_msec`. Using the wrong metric name would cause PromQL queries to return empty results.

### 2. Incorrect error budget remaining formula (two locations)
- **What was wrong:** The error budget remaining formula was `(0.999 - (1 - avg_over_time(success_rate[30d]))) / (1 - 0.999)`, which simplifies to `(success_rate - 0.001) / 0.001`. This produces wildly incorrect values (e.g., 998 when budget should be 0).
- **What was changed:** Corrected to `(avg_over_time(success_rate[30d]) - 0.999) / (1 - 0.999)`, which correctly computes `(observed_success - SLO_target) / error_budget`.
- **Why:** The correct formula for error budget remaining as a fraction is `(observed_success_rate - SLO) / (1 - SLO)`. At exactly the SLO boundary (0.999), this correctly returns 0 (budget exhausted). At perfect availability (1.0), it returns 1.0 (full budget remaining). The original formula had the SLO target and error rate terms swapped, producing values ~1000x too large. This error appeared in both the "Calculating Remaining Error Budget" section and the Grafana dashboard section.

## Review Notes
- The burn rate alert annotation says "SLO at risk within 1 hour" for the 14.4x burn rate. Technically, at 14.4x the monthly budget would be consumed in approximately 50 hours (30 days / 14.4), not 1 hour. The 14.4x factor means ~2% of monthly budget is consumed per hour. The phrasing is slightly misleading but not a formula error.
- The post mentions Pub/Sub delivery and State store reliability SLIs in the table but does not provide recording rules or alerting for them. This is not an error but could be expanded in a future update.
- The `le="500"` bucket selector assumes Dapr's histogram has a bucket boundary at 500ms. The actual bucket boundaries depend on Dapr's histogram configuration. If 500 is not an exact boundary, this label selector would return no results. Users may need to adjust based on their Dapr histogram bucket configuration.
- The `avg_over_time` on a precomputed 5-minute rate ratio is a common SRE approximation but is not mathematically identical to the true success rate over 30 days. This is standard practice and acceptable for SLO tracking.
- The burn rate alerting only implements a single-window approach (1h). The Google SRE Workbook recommends multi-window, multi-burn-rate alerts (e.g., pairing a 1h window with a 5m window) for better precision. The post's summary mentions "multi-window burn rate alerts" but only implements single-window alerts.
