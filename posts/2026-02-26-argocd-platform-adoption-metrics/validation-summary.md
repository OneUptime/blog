# Validation Summary: How to Measure Platform Adoption with ArgoCD Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor
- Grafana dashboards
- Python prometheus_client
- Argo CD Notifications webhooks
- DORA metrics

## Sources Consulted
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Notifications webhook documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Python client HTTP exporter documentation: https://prometheus.github.io/client_python/exporting/http/
- Prometheus Python client histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- DORA metrics guide: https://dora.dev/guides/dora-metrics/

## Issues Found
- Corrected Argo CD metric names. Replaced non-documented `argocd_app_reconcile_count`, `argocd_app_sync_status`, `argocd_app_health_status`, and `argocd_git_request_duration` references with documented current metrics such as `argocd_app_reconcile`, `argocd_app_info`, `argocd_app_labels`, and `argocd_git_request_duration_seconds`.
- Corrected the metrics endpoint description. Added the repo server metrics endpoint on port 8084 and clarified the application controller/API server/repo server split.
- Corrected the ServiceMonitor selector to match the documented `argocd-metrics` service and added a note to create matching monitors for API server and repo server metrics when needed.
- Added the required `--metrics-application-labels` controller configuration because `argocd_app_labels` is disabled by default in Argo CD.
- Fixed PromQL examples that joined on a non-existent `team` label or filtered on a non-documented `dest_namespace` label. Queries now join with `argocd_app_labels` and aggregate by `label_team`.
- Fixed the change failure rate query so vector matching applies to the combined failed/error sync counts, and clarified that it measures failed or errored Argo CD syncs.
- Corrected the MTTR section. The previous query averaged a current-state health gauge and did not measure recovery time. The post now shows current degraded applications and notes that true MTTR requires timestamp capture through notifications or custom instrumentation.
- Fixed dashboard and platform health queries to use `argocd_app_info` for health and sync state and `argocd_git_request_duration_seconds_bucket` for repo server Git latency histograms.
- Fixed Python snippets by defining `ARGOCD_SERVER` and `ARGOCD_TOKEN` from environment variables, adding a request timeout and `raise_for_status()`, and adding a concrete `parse_duration()` helper for the time-savings example.

## Review Notes
- The DORA queries are still examples and depend on local labeling conventions, especially `team` and `environment` labels being present on Argo CD Applications and enabled through `--metrics-application-labels`.
- Argo CD sync failures are a useful proxy for change failure rate, but strict DORA change failure rate should be tied to production user impact and remediation events.
