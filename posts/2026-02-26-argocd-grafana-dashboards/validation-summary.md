# Validation Summary: How to Create Grafana Dashboards for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Prometheus and PromQL
- Grafana dashboards and variables
- Kubernetes ConfigMaps
- kube-prometheus-stack / Grafana dashboard sidecar
- Kubernetes container metrics

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD application controller metrics source: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics.go
- Argo CD repo-server metrics source: https://github.com/argoproj/argo-cd/blob/master/reposerver/metrics/metrics.go
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Grafana.com dashboard 14584 page: https://grafana.com/grafana/dashboards/14584-argocd/

## Issues Found
- The Grafana navigation used the older "Configuration > Data Sources" path. Updated it to "Connections > Data sources" to match current Grafana documentation.
- The sync duration panel used `argocd_app_sync_total`, which counts sync operations rather than duration. Replaced it with an average duration calculation using `argocd_app_sync_duration_seconds_total` divided by successful sync count.
- The Git duration histogram queries did not aggregate buckets. Updated them to use `sum(rate(..._bucket[5m])) by (le, request_type)` before `histogram_quantile`.
- The Git failure examples used an undocumented `grpc_code` label on `argocd_git_request_total`. Replaced them with the documented `argocd_git_fetch_fail_total` counter.
- The controller row described `argocd_app_reconcile_count` as queue depth. Changed it to a reconciliation rate query and updated the dashboard overview label.
- The reconciliation duration query used the nonexistent `argocd_app_reconcile_duration_seconds_bucket` metric. Replaced it with the documented histogram series `argocd_app_reconcile_bucket`.
- The repo-server request examples used nonexistent `argocd_repo_server_request_duration_seconds_bucket` and `argocd_repo_server_request_total` metrics. Replaced them with documented Git request duration and count metrics.
- The ConfigMap example used an API-style `"dashboard"` wrapper and `grafana_dashboard: "true"`. Updated the example to contain raw dashboard JSON and use the common kube-prometheus-stack sidecar label value `grafana_dashboard: "1"`, with wording that the sidecar must be enabled and label configuration must match.

## Review Notes
The `dest_namespace` label is present in the Argo CD application controller source for `argocd_app_info`, even though the stable metrics documentation's generic label table does not list it. The post's use of that label was left intact.
