# Validation Summary: How to Monitor Dapr State Store Operation Metrics

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Dapr (state management building block)
- Prometheus (metrics collection and querying via PromQL)
- Kubernetes (kubectl commands for backend health checks)
- Redis (example backing state store)

## Sources Consulted
- Dapr source code: `pkg/diagnostics/component_monitoring.go` in `dapr/dapr` GitHub repository — defines state store metric names, labels, and recording functions
- Dapr source code: `pkg/diagnostics/service_monitoring.go` — defines shared tag keys (`componentKey`, `operationKey`, `successKey`, etc.)
- Dapr source code: `pkg/metrics/exporter.go` — confirms `DefaultMetricNamespace = "dapr"` and metric name sanitization
- Dapr internal metrics documentation: `docs/development/dapr-metrics.md` in `dapr/dapr` — lists `dapr_component_state_count` and `dapr_component_state_latencies`
- Dapr observability docs: https://docs.dapr.io/operations/observability/metrics/

## Issues Found

### 1. All metric names were fabricated (Critical)
**What was wrong:** The post listed 8 separate per-operation metrics (e.g., `dapr_component_state_get_total`, `dapr_component_state_set_failed_total`, `dapr_component_state_get_latencies_ms`) that do not exist in Dapr. Dapr emits only **two** state store metrics: `dapr_component_state_count` (counter) and `dapr_component_state_latencies` (histogram), using an `operation` label to distinguish GET/SET/DELETE and a `success` label for pass/fail.

**What was changed:** Replaced the entire metrics reference section with the correct two metrics and their labels (`app_id`, `component`, `namespace`, `operation`, `success`).

### 2. All PromQL queries referenced non-existent metrics (Critical)
**What was wrong:** Every PromQL query in the Operation Rate, Error Rate, Latency Analysis, and Alert Rules sections used the fabricated metric names.

**What was changed:** Rewrote all queries to use `dapr_component_state_count` with appropriate `operation` and `success` label filters, and `dapr_component_state_latencies_bucket` for histogram queries.

### 3. Wrong failure tracking model (Critical)
**What was wrong:** The post assumed separate `_failed_total` counter metrics for tracking failures. Dapr does not use separate failure counters — it uses a `success="false"` label on the same `dapr_component_state_count` metric.

**What was changed:** Replaced all failure queries to filter on `success="false"` instead of referencing non-existent `_failed_total` metrics.

### 4. Incorrect `_ms` suffix on latency metric (Moderate)
**What was wrong:** The post used `dapr_component_state_get_latencies_ms_bucket` (with `_ms` suffix). The actual metric is `dapr_component_state_latencies` — the unit is milliseconds but is not included in the Prometheus metric name.

**What was changed:** Corrected all latency references to use `dapr_component_state_latencies_bucket`, `_sum`, and `_count`.

### 5. Incorrect average latency calculation (Moderate)
**What was wrong:** The average latency query used `sum_over_time()` on histogram `_sum` and `_count` sub-metrics. The correct approach for computing average rate of change is `rate()` on both `_sum` and `_count`, then dividing.

**What was changed:** Replaced with `sum by (component) (rate(..._sum[5m])) / sum by (component) (rate(..._count[5m]))`.

### 6. Missing labels in documentation (Minor)
**What was wrong:** The post only mentioned `app_id` and `component` labels. It was missing `namespace`, `operation`, and `success` — all of which are essential for writing correct queries.

**What was changed:** Added all five labels with descriptions to the metrics reference section.

## Review Notes
- The post only covers GET, SET, and DELETE operations. Dapr also tracks `bulk_get`, `bulk_delete`, `query`, and `transaction` operations via the same metrics. These are mentioned in the updated labels section but dedicated query examples were not added, to keep the scope of the post focused.
- The kubectl commands in the "Correlating with Backend Health" section are reasonable but assume a specific Redis deployment topology (`deploy/redis` in the `default` namespace). Real-world setups may differ.
- The Prometheus alert rules use `> 0` threshold for error rates, which may be too sensitive for production — even a single transient failure would trigger an alert after 2 minutes. This is a judgment call rather than a technical error.
