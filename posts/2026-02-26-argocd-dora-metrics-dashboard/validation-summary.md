# Validation Summary: How to Create DORA Metrics Dashboard with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards
- DORA software delivery metrics

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/3.0/configuration/recording_rules/
- Prometheus histogram and `histogram_quantile()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- DORA metrics guide: https://dora.dev/guides/dora-metrics/

## Issues Found
- The post claimed all four DORA metrics can be derived from Argo CD native telemetry and recording rules. Argo CD metrics can provide deployment activity and useful proxies, but exact lead time and recovery metrics require Git, deployment, and incident/recovery data. Updated the wording to describe the dashboard as DORA-style and to call out proxy metrics.
- The ServiceMonitor example selected all Argo CD services with `app.kubernetes.io/part-of: argocd` and referenced a `server-metrics` port. Official Argo CD examples use separate ServiceMonitor resources for `argocd-metrics`, `argocd-server-metrics`, and `argocd-repo-server`, each scraping the `metrics` port. Updated the ServiceMonitor snippet accordingly.
- The recording rules used non-existent `argocd_app_reconcile_duration_seconds` and `argocd_app_reconcile_duration_seconds_bucket` metrics. Official Argo CD exposes the reconciliation histogram as `argocd_app_reconcile`, which produces `_bucket`, `_sum`, and `_count` series. Updated the rules and dashboard queries to use `argocd_app_reconcile_bucket`, `argocd_app_reconcile_sum`, and `argocd_app_reconcile_count`.
- The change failure rate proxy divided failures by all sync phases, including in-progress phases such as `Running` and `Terminating`. Updated the denominator to completed sync outcomes: `Succeeded`, `Failed`, and `Error`.
- The Grafana dashboard JSON was wrapped in a `dashboard` object even though the post instructs readers to import it directly and store it in a Grafana dashboard ConfigMap. Updated the JSON to use the dashboard model at the root.
- The DORA benchmark table duplicated the `16-30%` change failure rate range for both High and Medium and had outdated lead-time/recovery ranges. Updated the table to use non-overlapping, commonly used DORA-style ranges.

## Review Notes
- Argo CD sync success/failure metrics are useful operational proxies, but they are not a perfect DORA change failure rate because DORA counts production deployments that require remediation.
- Reconciliation duration is not the same as lead time for changes. For exact lead time, correlate version-control commit timestamps with production deployment timestamps.
- Application health status can indicate recovery work, but exact MTTR or failed deployment recovery time needs incident or event timing data.
