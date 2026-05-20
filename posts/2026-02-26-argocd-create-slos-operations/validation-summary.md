# Validation Summary: How to Create SLOs for ArgoCD Operations

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Prometheus
- Prometheus Operator PrometheusRule
- PromQL
- Grafana
- SLOs and error budgets

## Sources Consulted
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD application controller metrics source: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics.go
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/#prometheusrule

## Issues Found
- The sync success-rate explanation overstated the failure allowance for a 99.5% target with 100 syncs per day. Updated it to roughly 15 failed syncs over 30 days.
- The post defined reconciliation latency as time from Git commit to ArgoCD detecting a change, but Argo CD's `argocd_app_reconcile` metric is a reconciliation duration histogram. Updated the SLO wording, heading, dashboard label, and alert label to describe reconciliation duration.
- The sync duration PromQL used a non-existent histogram metric, `argocd_app_sync_total_duration_seconds_bucket`, and claimed a P95 target. Argo CD exposes `argocd_app_sync_duration_seconds_total` as a counter, so the SLO and query were changed to average sync duration.
- The API availability query filtered `grpc_service=~".*ArgoCD.*"` and treated non-5xx-style gRPC codes as success. Argo CD's documented API server metric is `grpc_server_handled_total`, and successful gRPC calls should use `grpc_code="OK"`. Updated the PromQL and added a note that API server gRPC metrics must be enabled and scraped.

## Review Notes
- The PrometheusRule structure matches the Prometheus Operator `monitoring.coreos.com/v1` `PrometheusRule` format.
- The reconciliation P95 query uses the documented Prometheus histogram pattern with `histogram_quantile()` over `_bucket` series.
- The API availability query may need additional scrape labels in a shared Prometheus environment to restrict it to the Argo CD API server metrics target.
