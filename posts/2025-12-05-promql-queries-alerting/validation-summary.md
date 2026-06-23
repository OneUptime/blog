# Validation Summary: How to Write PromQL Queries for Alerting

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus alerting rules
- Prometheus recording rules
- Alertmanager routing concepts
- Node Exporter metrics
- cAdvisor container metrics
- Kubernetes kube-state-metrics and kubelet volume metrics

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus cAdvisor guide: https://prometheus.io/docs/guides/cadvisor/
- kube-state-metrics deployment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The description of `expr` said it returns "a value". Prometheus alerting rules become active for each vector element returned by the expression, so I clarified that the expression returns one or more vector elements when the condition is active.
- The container memory alert divided `container_memory_usage_bytes` by `container_spec_memory_limit_bytes` without explicit vector matching or a nonzero limit guard. I added `on(namespace, pod, container)` matching and filtered `container_spec_memory_limit_bytes > 0` so containers without memory limits do not produce misleading `+Inf` ratios.
- The runbook URL was placed in `labels`, even though the post describes labels as routing metadata and annotations as human-readable information. I moved the runbook URL into `annotations`.

## Review Notes
Prometheus-specific syntax such as `rate`, `increase`, `absent`, `predict_linear`, `histogram_quantile`, alert `for` durations, `$labels`, `$value`, `printf`, and `humanizePercentage` is current and valid. No deprecated PromQL APIs were found.
