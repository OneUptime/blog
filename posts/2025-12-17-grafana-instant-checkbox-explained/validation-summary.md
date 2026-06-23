# Validation Summary: How to Understand the 'Instant' Checkbox in Grafana

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana
- Prometheus
- PromQL
- Prometheus HTTP API
- Kubernetes kube-state-metrics

## Sources Consulted
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana query and transform data documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- Grafana's current Prometheus query editor uses a Type setting with Both, Range, and Instant modes, and Both is documented as the default. Updated the post to avoid saying that unchecked Instant means the default Range query path, and clarified that Range uses `/api/v1/query_range` while the default Both mode runs both query types.
- The running pod count example used `kube_pod_info{phase="Running"}`, but kube-state-metrics documents `phase` on `kube_pod_status_phase`, not `kube_pod_info`. Changed the example to `count(kube_pod_status_phase{phase="Running"} == 1)`.
- The section "When Range Queries are Necessary" conflated Prometheus range queries with PromQL range vector selectors. Updated it to "When Range Selectors are Necessary" and clarified that functions like `rate()`, `increase()`, and `avg_over_time()` need range vector selectors even when evaluated by an instant query.
- Updated older boolean-style examples such as `Instant: true` and `Instant: false` to the current `Type: Instant` and `Type: Range` terminology where they describe Grafana query configuration.

## Review Notes
The PromQL and HTTP API examples are otherwise syntactically valid and consistent with Prometheus documentation. The post still uses the older "Instant checkbox" wording in the title and description, which is acceptable as a search-friendly framing, but the body now explains the current Grafana Type control.
