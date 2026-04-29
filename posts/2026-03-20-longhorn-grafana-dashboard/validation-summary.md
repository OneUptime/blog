# Validation Summary: How to View Longhorn Dashboard in Grafana

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Grafana
- Prometheus
- Helm
- `kubectl`
- PromQL

## Sources Consulted
- Longhorn monitoring setup docs: https://longhorn.io/docs/latest/monitoring/prometheus-and-grafana-setup/
- Longhorn metrics reference: https://longhorn.io/docs/latest/monitoring/metrics/
- Grafana dashboard import docs: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana alert-rule-to-panel docs: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/link-alert-rules-to-panels/
- Grafana Helm installation docs: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- Kubernetes `kubectl create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Verified Grafana dashboard download endpoint: https://grafana.com/api/dashboards/17626/revisions/latest/download

## Issues Found
- The Grafana Helm install section used an outdated repository/chart path. I changed it from `grafana/grafana` with `https://grafana.github.io/helm-charts` to `grafana-community/grafana` with `https://grafana-community.github.io/helm-charts` to match current Grafana installation docs.
- The dashboard import instructions referenced dashboard ID `16888`, but the current Longhorn docs point to dashboard `17626`. I updated both the import-by-ID instructions and the JSON download URL.
- The ConfigMap GitOps example embedded an empty placeholder dashboard JSON, so it would not provision the Longhorn dashboard described in the post. I replaced it with a `kubectl create configmap --from-file` flow that packages the downloaded dashboard JSON and applies the required `grafana_dashboard=1` label.
- The volume robustness PromQL was incorrect. `longhorn_volume_robustness` uses a `state` label with active series set to `1`, not numeric state values in the metric expression. I updated the queries to use `state="healthy"`, `state="degraded"`, and `state="faulted"`.
- The disk-usage PromQL referenced non-existent metrics (`longhorn_disk_storage_available_bytes` and `longhorn_disk_storage_maximum_bytes`). I replaced them with the current documented disk metrics: `longhorn_disk_usage_bytes` and `longhorn_disk_capacity_bytes`.
- The throughput PromQL incorrectly wrapped `longhorn_volume_read_throughput` and `longhorn_volume_write_throughput` in `rate(...)`, even though Longhorn already exposes those metrics as bytes-per-second values. I removed the `rate(...)` calls.
- The backup panel used undocumented metrics (`longhorn_manager_backup_volume_count` and `longhorn_manager_backup_count`). I replaced them with documented metrics: `longhorn_volume_last_backup_at` and `longhorn_backup_state`.
- The alerting YAML example was not a valid current Grafana alert-rule definition and the UI steps were outdated. I replaced it with a valid PromQL condition and the current Grafana flow: panel menu → `More` → `New alert rule` for a time series panel.
- The multi-cluster variable section assumed a `cluster` label always exists on Longhorn metrics. I clarified that this only works when the Prometheus setup adds that label.
- The export-to-ConfigMap example claimed to support automated provisioning but did not apply the dashboard label. I added the `grafana_dashboard=1` label to keep it consistent with the provisioning method shown earlier.

## Review Notes
- The ConfigMap-based provisioning approach is environment-dependent. It works only when Grafana is already configured to load labeled dashboard ConfigMaps, so the post now states that explicitly.
- Longhorn `latest` docs currently resolve to version `1.11.1` as of April 29, 2026, and they reference dashboard `17626`. Future Longhorn releases may change the recommended dashboard ID or metric set.
