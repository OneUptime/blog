# Validation Summary: How to Monitor Flux Receiver Webhook Call Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Flux Receiver resources
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor, PodMonitor, and PrometheusRule resources
- kube-state-metrics
- Grafana
- Grafana Loki
- PromQL

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification-controller options: https://fluxcd.io/flux/components/notification/options/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubebuilder/controller-runtime metrics reference: https://book.kubebuilder.io/reference/metrics-reference
- Grafana Labs Flux Cluster Stats dashboard listing: https://grafana.com/grafana/dashboards/14936-flux-cluster-stats/

## Issues Found
- The post treated `gotk_reconcile_condition` as a current notification-controller metric. Current Flux documentation separates controller metrics from Flux resource-state metrics and documents `gotk_resource_info` as the kube-state-metrics-backed resource-state metric. Updated Receiver readiness queries, alerting, verification, and troubleshooting to use `gotk_resource_info` where appropriate.
- The introduction implied notification-controller Prometheus metrics provide visibility into every webhook interaction. Updated the wording to clarify that controller metrics cover controller operations and per-request webhook details should be monitored through logs.
- The Prometheus verification command queried only the outdated readiness metric. Updated it to query `gotk_reconcile_duration_seconds_count` for controller metrics and `gotk_resource_info` for Receiver state when Flux custom resource metrics are enabled.
- The Grafana dashboard section labeled dashboard ID `16714` as the official Flux Control Plane dashboard. Updated the example to reference the Flux Cluster Stats dashboard ID `14936`, which matches the cited Grafana Labs listing.
- The reconciliation duration percentile query used `histogram_quantile` directly over per-series buckets. Updated it to aggregate buckets with `sum by (le)` before calculating the 95th percentile.
- The final endpoint verification grepped for `gotk_reconcile`, which could confuse controller metrics with resource-state metrics. Updated it to grep for `gotk_reconcile_duration` on the notification-controller metrics endpoint.

## Review Notes
The post still uses reconciliation metrics as a proxy for webhook-triggered activity. That is reasonable when explaining Flux Receiver monitoring, but it is not a direct per-webhook request counter. Teams that need exact delivery counts, HTTP status breakdowns, or authentication-failure rates should pair these metrics with log-based monitoring or ingress/proxy metrics.
