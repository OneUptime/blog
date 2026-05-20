# Validation Summary: How to Build Executive Dashboards for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana dashboards, annotations, snapshots, and reporting

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD Notifications webhook documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Sprig string functions: https://masterminds.github.io/sprig/strings.html
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Annotations HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/annotations/
- Grafana Snapshot HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/snapshot/
- Grafana Reporting documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/create-reports/

## Issues Found
- The post described the Tier 2 panels as showing all four DORA metrics, but the examples only implement deployment-oriented DORA-style metrics from Argo CD sync data. Changed the wording to avoid overstating what the snippets calculate.
- The deployment success-rate panel divided by `sum(increase(argocd_app_sync_total[30d]))` directly, which can produce an empty or invalid result when there are no syncs in the range. Added `clamp_min(..., 1)` to match the safer recording-rule pattern used later in the post.
- The per-project PromQL examples used `sum(increase(...)) by (project)`, which is not valid PromQL aggregation syntax. Changed them to `sum by (project) (increase(...))`.
- The Argo CD Notifications example used `truncate`, but Argo CD templates expose Sprig functions and the Sprig string truncation function is `trunc`. Changed the template to use `trunc 8`.
- The Argo CD Notifications webhook snippet omitted the required `service.webhook.grafana` registration. Added a minimal service definition with Grafana URL and headers so the template is actionable.
- The Scheduled Reports section implied Grafana reporting is generally available in Grafana. Updated it to state that scheduled reports are a Grafana Cloud or Grafana Enterprise feature and that Enterprise requires the image renderer service.
- The snapshot API example was described as generating and emailing a snapshot, but the curl command only creates the snapshot. Updated the wording to say the generated snapshot must be emailed separately.

## Review Notes
- The Argo CD metrics used in the dashboard snippets are current application-controller metrics and labels, including `argocd_app_info`, `argocd_app_sync_total`, `health_status`, `phase`, and `project`.
- The Grafana annotation and snapshot API examples use legacy `/api` endpoints that remain supported, though Grafana documentation notes that newer APIs are moving under `/apis` where equivalents exist.
