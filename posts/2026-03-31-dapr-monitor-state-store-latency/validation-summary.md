# Validation Summary: How to Monitor Dapr State Store Latency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state store building block, metrics/observability)
- Prometheus (PromQL queries, alerting rules)
- Grafana (correlation dashboards)
- Redis (as Dapr state backend)
- Redis Exporter (oliver006/redis_exporter)
- Kubernetes (kubectl, Deployments, PrometheusRule CRD)

## Sources Consulted
- Dapr metrics source code: `pkg/diagnostics/component_monitoring.go` (https://github.com/dapr/dapr/blob/master/pkg/diagnostics/component_monitoring.go)
- Dapr HTTP monitoring source code: `pkg/diagnostics/http_monitoring.go` (https://github.com/dapr/dapr/blob/master/pkg/diagnostics/http_monitoring.go)
- Dapr metrics development docs (https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md)
- Dapr observability docs (https://docs.dapr.io/operations/observability/metrics/metrics-overview/)
- oliver006/redis_exporter source code: `exporter/info.go` (https://github.com/oliver006/redis_exporter)
- Redis LATENCY HISTORY command documentation (https://redis.io/commands/latency-history/)
- Prometheus `histogram_quantile` documentation

## Issues Found

### 1. All Dapr state store metric names were incorrect
**What was wrong:** The post used fabricated metric names (`dapr_state_get_duration_msec`, `dapr_state_set_duration_msec`, `dapr_state_delete_duration_msec`, `dapr_state_query_duration_msec`). These metrics do not exist in Dapr.
**What was changed:** Replaced all instances with the correct metric `dapr_component_state_latencies` with the appropriate `operation` label (e.g., `{operation="get"}`, `{operation="set"}`). Updated the metrics list section to explain that Dapr uses a single histogram with an `operation` label rather than separate metrics per operation.
**Why:** Dapr exposes state store latencies through a single histogram metric `dapr_component_state_latencies` with labels for `app_id`, `component`, `namespace`, `operation`, and `success`.

### 2. Label name `storeName` was incorrect
**What was wrong:** The post referenced a `storeName` label that does not exist on Dapr metrics.
**What was changed:** Replaced all occurrences of `storeName` with the correct label `component` in PromQL queries, alert expressions, and annotation templates.
**Why:** The actual Dapr label for the state store component name is `component`, not `storeName`.

### 3. HTTP server metric name was incorrect
**What was wrong:** The post used `dapr_http_server_request_duration_msec` in the correlation dashboard query.
**What was changed:** Replaced with the correct metric name `dapr_http_server_latency`.
**Why:** The actual Dapr HTTP server latency metric is `dapr_http_server_latency`, not `dapr_http_server_request_duration_msec`.

### 4. Redis alert rule was missing `rate()` on counters
**What was wrong:** The Redis alert expression `redis_commands_duration_seconds_total / redis_commands_total > 0.01` divided raw counters directly, which computes cumulative average latency since Redis started rather than current latency.
**What was changed:** Wrapped both counters in `rate(...[5m])` to compute average latency over a 5-minute window: `rate(redis_commands_duration_seconds_total[5m]) / rate(redis_commands_total[5m]) > 0.01`.
**Why:** Without `rate()`, the cumulative average is insensitive to recent latency spikes and the alert would rarely fire. Using `rate()` also correctly handles counter resets on Redis restarts.

## Review Notes
- The `redis-cli latency history command` command is technically correct — `command` is a Redis latency event name, not a placeholder. Readers unfamiliar with Redis latency monitoring may find this confusing. Redis latency monitoring must first be enabled via `CONFIG SET latency-monitor-threshold <milliseconds>`.
- The Redis Exporter deployment YAML is minimal (missing `selector`, `replicas`, labels). This is acceptable for a blog snippet but would not deploy as-is.
- The correlation query dividing two `histogram_quantile` results produces a ratio that may be misleading when the histograms have different bucket boundaries. This is a known limitation of Prometheus histogram math but is acceptable for a dashboard approximation.
