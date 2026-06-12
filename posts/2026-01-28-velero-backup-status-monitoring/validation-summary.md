# Validation Summary: How to Monitor Velero Backup Status

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Velero
- Kubernetes
- Prometheus
- Prometheus Operator
- Grafana
- Alertmanager
- AWS S3 CLI
- Azure CLI
- Google Cloud Storage / gsutil
- Python requests

## Sources Consulted
- Velero troubleshooting documentation: https://velero.io/docs/main/troubleshooting/
- Velero metrics source: https://raw.githubusercontent.com/vmware-tanzu/velero/main/pkg/metrics/metrics.go
- Velero Helm chart deployment/service/ServiceMonitor templates: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero/templates
- Velero Helm chart values: https://raw.githubusercontent.com/vmware-tanzu/helm-charts/main/charts/velero/values.yaml
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule/ServiceMonitor concepts: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The post listed `velero_backup_total` as a total counter and used `increase(velero_backup_total[24h])` in success-rate queries. Velero defines `velero_backup_total` as a gauge for the current number of existing backups, so I changed the denominator to `velero_backup_attempt_total` and updated the metric description.
- The post used the non-existent metric `velero_backup_storage_location_available`. Velero exposes backup storage location availability as `velero_backup_location_status_gauge` with the `backup_location_name` label, so I updated the metric list, dashboard query, alert expression, legend, and annotation label.
- The dashboard panel title said "Failed Backups (Last 7 Days)" but queried one-day increases. I changed the failure and partial-failure queries to use `[7d]`.
- The Alertmanager example used the older `match` route syntax. I changed the routes to use `matchers`, which is the current Alertmanager configuration style.
- The quick metrics check assumed the Velero container had `wget`. I changed it to use `curl` against the local port-forward shown earlier.
- The Mermaid dashboard panel diagram used unquoted subgraph titles with spaces and punctuation. I quoted the subgraph titles to keep the Mermaid syntax valid.

## Review Notes
- Velero metrics are version-dependent; the reviewed content now matches the current upstream Velero metrics source and Helm chart defaults as of 2026-06-12.
- The storage capacity script emits custom metrics but does not include a complete exporter or textfile collector setup. That is acceptable for an example, but a future revision could clarify how Prometheus should scrape or ingest those custom metrics.
