# Validation Summary: How to Monitor Workflow Execution Metrics in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (workflow building block, sidecar metrics)
- Prometheus (scraping, PromQL queries, alerting rules)
- Grafana (dashboard configuration)
- Kubernetes (pod annotations, Helm deployment)

## Sources Consulted
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr workflow source code: `pkg/diagnostics/workflow_monitoring.go` in the dapr/dapr repository
- Dapr integration tests: `tests/integration/suite/daprd/metrics/workflow.go` in the dapr/dapr repository
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Helm chart values: https://github.com/dapr/dapr/tree/master/charts/dapr

## Issues Found

1. **Wrong metric name prefix**: All workflow metric names used `dapr_workflow_*` prefix. The correct prefix is `dapr_runtime_workflow_*`. Fixed all metric references throughout the post (Key Metrics section, PromQL queries, Grafana dashboard, alerting rules).

2. **Wrong status label values**: The post used uppercase `status="COMPLETED"` and `status="FAILED"`. Dapr uses lowercase values: `status="success"` and `status="failed"`. Fixed in all metric references.

3. **Configuration field name**: The Dapr Configuration resource used `metric` (singular). The correct field name is `metrics` (plural). Fixed to `metrics`.

4. **Invalid port field in Configuration**: The `port: 9090` field was included under the `metrics` spec in the Configuration resource. The metrics port is not configured in the Configuration CRD — it is set via the `dapr.io/metrics-port` annotation or the `--metrics-port` CLI argument. Removed the `port` field. (The default port 9090 mentioned elsewhere in the post is correct.)

5. **Incorrect histogram metric suffixes**: Metrics were named with `_ms_bucket` suffix (e.g., `dapr_workflow_execution_latency_ms_bucket`). The actual metric names end in `_latency`, and Prometheus automatically adds the `_bucket` suffix for histogram queries. Fixed to `_latency_bucket`.

6. **Wrong label name in P99 activity query**: The PromQL query used `activity_type` as a label. The correct label is `activity_name`. Fixed in the slowest activities query.

7. **Wrong metric for active workflow count**: `dapr_workflow_scheduled_total` does not exist. Replaced with `dapr_runtime_workflow_operation_count{operation="create_workflow"}` for the "active workflows" calculation.

## Review Notes
- The Helm chart values (`dapr_operator.logLevel`, `global.prometheus.enabled`) are correct.
- The Prometheus scrape configuration using `dapr.io/enabled` annotation and port 9090 is correct.
- The PromQL query patterns (rate, histogram_quantile, failure ratio) are structurally sound.
- The Grafana dashboard JSON is a simplified snippet — not a complete importable dashboard, but sufficient for illustration purposes.
- The alerting rules structure follows valid Prometheus alerting rule format.
