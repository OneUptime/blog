# Validation Summary: How to Use Dapr Metrics for SLA Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus (metrics collection and querying)
- PromQL (Prometheus Query Language)
- Grafana (dashboarding)
- SRE practices (SLI/SLO/SLA, error budgets, burn rate alerting)

## Sources Consulted
- Dapr metrics overview documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr development metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr HTTP monitoring source code: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/http_monitoring.go
- Dapr Prometheus exporter source code: https://github.com/dapr/dapr/blob/master/pkg/metrics/exporter.go
- Google SRE Workbook — Alerting on SLOs (burn rate methodology)

## Issues Found

### 1. Incorrect latency metric name (`dapr_http_server_latency_ms` → `dapr_http_server_latency`)
The post used `dapr_http_server_latency_ms` throughout (including histogram suffixes `_bucket` and `_count`). The correct Dapr metric name is `dapr_http_server_latency` — the unit (milliseconds) is not part of the exported Prometheus metric name. Fixed in the SLI table, the latency SLI query (`dapr_http_server_latency_bucket`, `dapr_http_server_latency_count`), and the recording rules.

### 2. Incorrect status code label name (`status_code` → `status`)
The post used `status_code` as the label name for HTTP status codes in all PromQL queries and alert rules. Dapr's HTTP metrics use the label `status` (defined as `tag.MustNewKey("status")` in the source). Fixed across all 8 occurrences in availability queries, error budget calculation, recording rules, alert rules, and Grafana dashboard queries.

### 3. Error budget formula computed consumed budget instead of remaining
The formula was `1 - (error_budget - error_rate) / error_budget`, which simplifies to `error_rate / error_budget` — the *consumed* fraction. The comment said "Remaining error budget as a fraction." Removed the leading `1 -` so the formula correctly computes `(error_budget - error_rate) / error_budget`, which is the remaining fraction. Also updated the inline comment from `# SLO target` to `# error budget` for clarity.

## Review Notes
- The burn rate alerting section uses single-window checks (1h for critical, 6h for warning). Google's SRE Workbook recommends dual-window checks (long AND short window) to reduce false positives. The single-window approach is a valid simplification for a blog post but may produce more false alerts in production.
- The `rate()` function with very large ranges like `[7d]` and `[30d]` requires sufficient data retention and may be computationally expensive. In production, recording rules (as shown in the post) are the recommended approach for long-window SLI computation.
- The 43.8-minute error budget figure is correct when using an average month length of ~30.44 days (365.25/12).
