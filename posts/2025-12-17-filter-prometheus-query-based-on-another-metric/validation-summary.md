# Validation Summary: How to Filter Prometheus Query Based on Another Metric

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus recording rules
- Grafana Prometheus variables
- kube-state-metrics

## Sources Consulted
- Prometheus query operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus subquery support announcement and syntax examples: https://prometheus.io/blog/2019/01/28/subquery-support/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- kube-state-metrics deployment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md

## Issues Found
- The threshold-based error-rate filter divided 5xx request rates by an unaggregated `http_requests_total` series. If `status` is present on both operands, the denominator can match only the same status code series instead of total traffic. I changed both numerator and denominator to `sum by (instance, job)` so the comparison is a real error-rate calculation.
- The `group_left` filtering example used `and on(instance) group_left(...)`, but Prometheus documents grouping modifiers as valid only with comparison, arithmetic, and trigonometric binary operators, not set operators such as `and`. I changed the example to use arithmetic multiplication with a 1-valued metadata metric.
- The deployment-status example aggregated `container_cpu_usage_seconds_total` by `deployment`, but standard container metrics do not normally include a `deployment` label. I changed the example to use kube-state-metrics deployment metrics and match on both `namespace` and `deployment`.
- The Grafana variable query used `label_values(up{job="$job"} == 1, instance)`. Grafana documents `label_values(metric, label)` as deprecated classic query syntax, and the documented approach for PromQL result filtering is `query_result(...)` plus a regex. I changed the variable query to `query_result(up{job="$job"} == 1)` and added the instance-label extraction regex.

## Review Notes
- Checked representative corrected PromQL expressions and the recording-rule YAML with `promtool check rules` from the official `prom/prometheus:v3.5.0` container; the checked snippets passed.
- The examples use placeholder metric names such as `node_active_status`, `service_metadata`, and `instance_metadata`. They are syntactically valid PromQL patterns, but readers must adapt them to metric names and label sets in their own Prometheus environment.
