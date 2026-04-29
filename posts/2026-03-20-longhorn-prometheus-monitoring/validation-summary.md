# Validation Summary: How to Monitor Longhorn with Prometheus

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Prometheus
- Prometheus Operator
- PromQL
- Grafana
- Kubernetes

## Sources Consulted
- Longhorn monitoring setup documentation: https://longhorn.io/docs/latest/monitoring/prometheus-and-grafana-setup/
- Longhorn metrics reference: https://longhorn.io/docs/latest/monitoring/metrics/
- Longhorn alert rule examples: https://longhorn.io/docs/latest/monitoring/alert-rules-example/
- Longhorn manager source for volume metrics: https://raw.githubusercontent.com/longhorn/longhorn-manager/master/metrics_collector/volume_collector.go
- Longhorn manager source for backup metrics: https://raw.githubusercontent.com/longhorn/longhorn-manager/master/metrics_collector/backup_collector.go
- Prometheus instrumentation best practices: https://prometheus.io/docs/practices/instrumentation/
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators reference: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post described `longhorn_volume_state` and `longhorn_volume_robustness` as numeric enums. Longhorn’s current exporter emits these as label-based state metrics, with one series per state and values of `1` for the current state and `0` for the others. I corrected the metric descriptions and updated the alert expressions to use the `state` label.
- The PromQL example for volume capacity utilization used `longhorn_volume_usage_bytes`, which is not part of the current Longhorn metrics set. I replaced it with `longhorn_volume_actual_size_bytes`, which is the metric Longhorn currently exports.
- The backup query assumed `longhorn_backup_state` had a `state="Completed"` label and used `increase()` on it. The exporter implements `longhorn_backup_state` as a gauge with numeric state values, and Prometheus documents `increase()` for counters only. I replaced the query with one based on `longhorn_volume_last_backup_at`, which Longhorn exports as the Unix timestamp of the last successful backup.
- The best-practice alert example `longhorn_volume_robustness != 1` was incorrect for the current label-based encoding and would match non-active state series. I replaced it with `longhorn_volume_robustness{state!="healthy"} == 1`.

## Review Notes
- Longhorn’s public documentation is internally inconsistent here: the current metrics reference and exporter source show label-based `longhorn_volume_state` and `longhorn_volume_robustness`, while the alert-rule example page still uses older numeric comparisons for those metrics. The post was corrected to match the exporter implementation and the metrics reference.
