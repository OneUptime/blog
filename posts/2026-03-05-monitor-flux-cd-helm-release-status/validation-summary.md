# Validation Summary: How to Monitor Flux CD Helm Release Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Flux HelmRelease resources
- kube-state-metrics custom resource metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Grafana dashboards
- Kubernetes kubectl commands and JSONPath

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux `flux get helmreleases` CLI reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux `flux events` CLI reference: https://fluxcd.io/flux/cmd/flux_events/
- Flux `flux trace` CLI reference: https://fluxcd.io/flux/cmd/flux_trace/
- Flux monitoring example kube-state-metrics configuration: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/controllers/kube-prometheus-stack/kube-state-metrics-config.yaml
- Flux monitoring example Grafana dashboard queries: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/dashboards/cluster.json
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described `gotk_reconcile_condition` and `gotk_suspend_status` as helm-controller metrics. Current Flux documentation distinguishes controller metrics from resource state metrics, and the current Flux monitoring example uses kube-state-metrics `gotk_resource_info` for Flux custom resource health. The metrics section, health queries, alerts, Grafana example, and summary were updated to use `gotk_resource_info{customresource_kind="HelmRelease"}` for readiness and suspension state.
- The alert example used `gotk_reconcile_condition{type="Stalled"}`. That metric is not part of the current Flux monitoring example, so the alert was changed to a Ready=Unknown alert using `gotk_resource_info`, which matches the available resource state metric.
- The Grafana section said to build a table panel but used a `stat` panel JSON snippet. The wording was corrected to say stat panel, and the expressions were updated to count ready and non-ready HelmReleases with `gotk_resource_info`.
- The failure-pattern note said stalled releases mean the controller has stopped retrying. Current HelmRelease documentation describes stalled as an unrecoverable state that needs intervention; the wording was updated to recommend fixing the underlying issue and resetting retries or forcing reconciliation.

## Review Notes
The Flux CLI commands and kubectl inspection examples are consistent with the current Flux CLI reference and HelmRelease status fields. `flux events` and `flux trace` are documented as preview commands by Flux, so future Flux releases may change their behavior or output format.
