# Validation Summary: ArgoCD Best Practices for Monitoring and Alerting

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- PromQL
- Grafana dashboards
- Argo CD Notifications
- Slack notifications

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD notification triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/subscriptions/
- Argo CD Slack notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD repo-server metrics source: https://github.com/argoproj/argo-cd/blob/master/reposerver/metrics/metrics.go
- Argo CD application-controller metrics source: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics.go
- Argo CD server metrics source: https://github.com/argoproj/argo-cd/blob/master/server/metrics/metrics.go
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The ServiceMonitor example used a broad `app.kubernetes.io/part-of: argocd` selector as if one manifest reliably covered every Argo CD metrics service. Updated the example to match Argo CD's documented application-controller metrics service label, `app.kubernetes.io/name: argocd-metrics`.
- The "OutOfSync for over 30 minutes" query used `offset 30m`, which only checks historical state and does not prove the application is currently and continuously out of sync. Replaced it with `min_over_time(...[30m]) == 1`.
- The sync duration query treated `argocd_app_sync_total` as a histogram. Argo CD documents it as a counter and exposes `argocd_app_sync_duration_seconds_total` for total sync duration. Replaced the histogram query with an average duration calculation.
- The sync failure query only counted `Error` phases. Argo CD documents both `Error` and `Failed` sync phases, so the query now matches both.
- The controller "queue depth" example used `argocd_app_reconcile_count`, which is the generated count series for the `argocd_app_reconcile` histogram, not a queue depth gauge. Renamed the example to reconciliation rate and used `rate(...)`.
- The repo-server "Git request failures" query used unsupported `result="error"` labels on `argocd_git_request_total`. Replaced it with the documented/source-backed `argocd_git_fetch_fail_total` metric.
- The manifest generation duration query treated `argocd_repo_pending_request_total` as a histogram. Argo CD exposes it as a gauge, so the example now shows pending repo-server requests directly.
- The API server examples used undocumented `argocd_api_request_total` and `argocd_api_request_duration_seconds_bucket` metric names. Replaced them with gRPC server metrics and noted that gRPC latency histograms require `ARGOCD_ENABLE_GRPC_TIME_HISTOGRAM=true`.
- The warning alert YAML snippet was only a partial `groups` entry. Replaced it with a complete `PrometheusRule` manifest.
- The Git fetch error alert used unsupported labels on `argocd_git_request_total`. Replaced it with `argocd_git_fetch_fail_total`.
- The Redis error alert used `result="error"`, but Argo CD Redis metrics use the `failed` label. Updated it to `failed="true"`.
- The Grafana Git fetch rate panel grouped by an unsupported `result` label. Updated it to group by `repo`.

## Review Notes
- The component-down alerts assume specific Prometheus `job` label values. Those labels can vary depending on the Prometheus Operator, Helm chart, and ServiceMonitor naming conventions, so operators should confirm them in their own Prometheus target metadata.
- The notifications snippet defines triggers and templates, but a complete deployment still needs the notification service credentials and subscriptions configured for the relevant applications or projects.
