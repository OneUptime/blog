# Validation Summary: How to Implement Velero Backup Monitoring and Alerting Using Prometheus Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Velero
- Prometheus
- Prometheus Operator
- Alertmanager
- Grafana
- Prometheus Pushgateway
- Python prometheus_client

## Sources Consulted
- Velero troubleshooting documentation: https://velero.io/docs/v1.18/troubleshooting/
- Velero backup hooks documentation: https://velero.io/docs/v1.18/backup-hooks/
- Velero 1.18.1 metrics source: https://github.com/vmware-tanzu/velero/blob/v1.18.1/pkg/metrics/metrics.go
- Velero Helm chart metrics Service and ServiceMonitor templates: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero/templates
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The Prometheus Operator ServiceMonitor example used `app: velero` selectors and a `metrics` port name that may not match current Velero Helm chart labels and service port naming. Updated the example to use `app.kubernetes.io/name: velero`, `name: velero`, and `http-monitoring`.
- The standard Prometheus scrape config filtered on `__meta_kubernetes_pod_label_app`, which does not match current Velero Helm pod labels. Updated it to use `__meta_kubernetes_pod_label_app_kubernetes_io_name`.
- The post treated `velero_backup_duration_seconds` as a directly queryable gauge. Velero exposes it as a Prometheus histogram, so Prometheus provides `_bucket`, `_sum`, and `_count` series. Updated the metric list, alert expressions, and Grafana query to use histogram-compatible PromQL.
- The storage location metric was listed as `velero_backup_storage_location_available`, but current Velero exposes `velero_backup_location_status_gauge` with the `backup_location_name` label. Updated the metric and alert.
- The read-only storage location alert used a non-existent `phase="ReadOnly"` label on the storage location metric. Removed that unsupported alert from the storage location rules.
- The backup hook example used a standalone ConfigMap script and assumed Velero would pass a backup name argument to it. Velero backup hooks are exec commands run in selected pod containers. Replaced the example with a Deployment pod-template annotation that invokes a supported post-backup hook command.
- The Alertmanager route used deprecated `match` syntax. Updated it to current `matchers` syntax.

## Review Notes
- `promtool` was not installed in the local environment, so rule files were not executed through local `promtool` validation. The expressions and configuration patterns were checked against upstream documentation and source.
- Some alert expressions may still need threshold tuning for each environment, especially backup duration and missing scheduled backup windows.
