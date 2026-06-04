# Validation Summary: How to implement Grafana alerting rules with PromQL expressions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Alerting
- Prometheus
- PromQL
- kube-state-metrics
- Alertmanager silences API
- SLO burn-rate alerting

## Sources Consulted
- Grafana documentation: Grafana Alerting overview - https://grafana.com/docs/grafana/latest/alerting/
- Grafana documentation: Configure alert rules - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/
- Grafana documentation: Configure Grafana-managed alert rules - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- Grafana documentation: No Data and Error states - https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/state-and-health/
- Grafana documentation: Template annotations and labels - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/
- Grafana documentation: Annotation and label template reference - https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/reference/
- Grafana documentation: Group alert notifications - https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/group-alert-notifications/
- Grafana documentation: Configure notification policies - https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-notification-policy/
- Prometheus documentation: Querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Operators - https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Histograms and summaries - https://prometheus.io/docs/practices/histograms/
- Kubernetes documentation: kube-state-metrics overview - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics documentation: Pod metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Alertmanager API v2 model references for silences - https://pkg.go.dev/github.com/prometheus/alertmanager/api/v2/models

## Issues Found
- The pod availability alert used `count by (namespace) (kube_pod_status_phase{phase="Running"})`, which counts matching time series, including zero-valued `Running` phase series, instead of counting pods that are actually running. Changed it to `sum by (namespace) (kube_pod_status_phase{phase="Running"} == 1)` so the numerator counts only running pods.
- The latency anomaly example passed raw classic histogram bucket rates to `histogram_quantile()`. This can produce per-series quantiles instead of the intended fleet-level quantile when multiple label dimensions are present. Changed both current and offset expressions to `sum by (le) (...)`, matching Prometheus guidance for aggregating classic histogram buckets.
- The request-rate change example used `deriv(sum(rate(...))[5m:]) > 100`, which checks a per-second slope of the request-rate time series rather than an increase of more than 100 requests/sec over five minutes. Replaced it with a direct comparison between the current request rate and the request rate offset by five minutes.
- The SLO burn-rate threshold used `(0.001 * 2 / 30)`, which inverts the 30-day SLO window and 2-day exhaustion window. Changed it to `(0.001 * 30 / 2)`, representing a 15x burn rate for a 30-day error budget exhausted in 2 days.
- The annotation template used `humanizePercentage` on a CPU query that returns values in the 0-100 percentage range. Grafana's `humanizePercentage` expects a ratio between 0 and 1. Changed it to `humanize` followed by `%`.

## Review Notes
The Grafana UI/configuration examples are illustrative rather than full provisioning YAML. The corrected post is technically consistent with Grafana-managed alerting concepts, PromQL operator/function behavior, Grafana annotation templating, notification grouping, and the Alertmanager silence API shape.
