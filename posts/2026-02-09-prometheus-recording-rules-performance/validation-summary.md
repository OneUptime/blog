# Validation Summary: How to Configure Prometheus Recording Rules for Query Performance Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus Operator PrometheusRule CRD
- Kubernetes kubectl
- kube-state-metrics
- node_exporter metrics

## Sources Consulted
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus recording rule naming best practices: https://prometheus.io/docs/practices/rules/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/#prometheusrule
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The naming convention example for `instance:node_cpu_utilization:rate5m` used `rate(node_cpu_seconds_total[5m])`, which preserved `cpu` and `mode` labels and did not actually record an instance-level CPU usage series. Changed it to aggregate away `cpu` and `mode` while excluding idle CPU time.
- The hierarchical latency example recorded pod-level p95 values and then averaged those p95 values at service level. Averaging percentiles is not a valid way to aggregate histogram quantiles. Changed the layer 1 recording rule to record bucket rates and the layer 2 rule to compute `histogram_quantile()` after summing buckets by `namespace`, `service`, and `le`.
- The requests-per-replica example grouped `kube_pod_info` by `service`, but `kube_pod_info` does not expose a `service` label by default. Changed the denominator to derive the same example `service` label from the pod name with `label_replace()` before counting replicas.
- The `slo:error_budget:remaining` expression calculated the consumed error budget fraction for better-than-target availability cases instead of the remaining error budget fraction. Removed the leading `1 -` so the expression matches the metric name and comment.
- The interval tuning example for `instance:cpu:rate1m` used raw `rate(node_cpu_seconds_total[1m])`, preserving per-CPU and per-mode series despite the instance-level recording rule name. Changed it to aggregate non-idle CPU time consistently with the earlier CPU example.

## Review Notes
- The PrometheusRule CRD structure, `groups`, `interval`, `record`, `expr`, alerting fields, `/api/v1/rules` endpoint, PromQL comments, `rate()`, and `histogram_quantile()` usage are aligned with current official documentation.
- The examples that infer a service name from a Kubernetes pod name are technically valid PromQL, but they depend on deployment-style pod naming conventions and may need adjustment for StatefulSets, DaemonSets, Jobs, or applications that already expose a reliable `service` label.
- Dependent recording rules are shown in separate groups. Prometheus evaluates rules sequentially within a group; separate groups are not a strict ordering mechanism, so tightly dependent rules can be one evaluation behind unless grouped or interval-offset deliberately.
