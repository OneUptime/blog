# Validation Summary: How to Create Dashboard Variables Based on Other Variables in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard variables
- Grafana Prometheus data source template variables
- Prometheus
- PromQL
- kube-state-metrics Kubernetes metrics
- cAdvisor container metrics

## Sources Consulted
- Grafana documentation: Prometheus template variables, including query variable types, `query_result()`, regex extraction, refresh options, multi-value behavior, and classic `label_values()` syntax: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation: Add variables, including linked variable detection, automatic refresh behavior, refresh settings, and variable ordering guidance: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana documentation: Variable syntax and advanced formatting options, including `:raw` and regex formatting: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Prometheus documentation: Querying basics, including vector selectors, range selectors, and offset modifier syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- kube-state-metrics documentation: Pod metrics, including `kube_pod_info` and `kube_pod_labels`: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics documentation: Deployment metrics, including `kube_deployment_labels`: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- kube-state-metrics documentation: StatefulSet metrics, including `kube_statefulset_labels`: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/statefulset-metrics.md
- kube-state-metrics documentation: DaemonSet metrics, including `kube_daemonset_labels`: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/daemonset-metrics.md
- kube-state-metrics documentation: Job metrics, including `kube_job_labels` and its `job_name` label: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/job-metrics.md

## Issues Found
- Replaced the `active_pods` variable query. The original used `label_values(... offset 5m, pod)`, which did not actually filter by activity and relied on the classic label query helper for a time-aware metric-value use case. The updated query uses `query_result()` with `rate(...[$__rate_interval]) > 0` and adds the required regex extraction for the `pod` label.
- Corrected the chained variable ordering explanation. Grafana documentation says query variables that reference other variables become linked variables and are refreshed when linked variables change; it does not document a generic "refreshes variables in definition order" rule. The text now recommends ordering parent controls first for usability.
- Fixed the Kubernetes workload variable example. The original custom values used capitalized workload names and included `Job`, which would produce invalid or mismatched kube-state-metrics metric/label names in the dynamic `kube_${workload_type:raw}_labels` query. The options now use lowercase `deployment`, `statefulset`, and `daemonset`, which match the documented metric and label names for that dynamic pattern.

## Review Notes
The post continues to use Grafana's documented classic `label_values(metric, label)` syntax for compact examples. Current Grafana documentation marks that query type as deprecated in favor of the structured Prometheus variable query editor, so a future rewrite could convert the examples to the current `Label values` and `Query result` query types throughout.
