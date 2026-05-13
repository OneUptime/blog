# Validation Summary: How to Monitor Edge Clusters Remotely with Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease
- Prometheus and Prometheus Operator
- kube-prometheus-stack
- Grafana dashboards
- Grafana Loki
- Grafana Alloy
- PromQL

## Sources Consulted
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Loki Promtail installation/deprecation documentation: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Grafana Loki getting started documentation: https://grafana.com/docs/loki/latest/get-started/
- Grafana Alloy Kubernetes logs documentation: https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/
- Grafana Alloy Helm chart values: https://raw.githubusercontent.com/grafana/alloy/main/operations/helm/charts/alloy/values.yaml

## Issues Found
- Flux `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux exposes those resources under `notification.toolkit.fluxcd.io/v1beta3`; updated both manifests.
- The Flux `Alert` example used deprecated `.spec.summary` with a Go-template-style string. Replaced it with `.spec.eventMetadata.summary` and static site metadata.
- The kube-prometheus-stack chart version was pinned to the old `56.x` series. Updated it to the current `84.x` series.
- The metric labeling example used remote-write relabeling to add site labels. Replaced it with `prometheusSpec.externalLabels`, which is the appropriate Prometheus mechanism for labels included with remote write.
- The federation example referenced `flux_reconcile_duration_seconds` and `flux_source_info`, which are not current Flux metric names. Replaced them with a selector for the `gotk_reconcile_duration_seconds` histogram series and `gotk_resource_info`.
- The log shipping section used Promtail, which is officially deprecated and reached EOL on March 2, 2026. Replaced the example with Grafana Alloy using the `grafana/alloy` Helm chart and a Loki pipeline.
- Several PromQL examples used invalid aggregation syntax such as appending `by (...)` to raw selectors or range functions. Rewrote the dashboard queries with valid aggregation syntax.
- The offline alert compared `time()` to `max_over_time(up[15m])`, which subtracts a 0/1 sample value rather than a sample timestamp. Rewrote it to compare `time()` with `timestamp(up)` over a range.
- Flux readiness queries used `gotk_reconcile_condition`; updated them to use the current `gotk_resource_info` custom resource metric and added a prerequisite noting that Flux custom resource metrics must be enabled in kube-state-metrics.
- The conclusion still referred to Promtail. Updated it to Alloy.

## Review Notes
- The central metrics endpoint must be Prometheus remote-write compatible; if it is a stock Prometheus server, its remote write receiver must be enabled, or a backend such as Mimir, Thanos Receive, or Cortex should be used.
- The `gotk_resource_info` readiness panels and alerts depend on kube-state-metrics custom resource configuration for Flux resources.
