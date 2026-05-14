# Validation Summary: How to Create SLOs for Flux CD Reconciliation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Prometheus
- Prometheus Operator PodMonitor
- kube-state-metrics custom resource metrics
- Grafana
- SLOs, SLIs, and error-budget burn-rate alerting

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux monitoring example PodMonitor: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/podmonitor.yaml
- Flux monitoring example kube-state-metrics configuration: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/controllers/kube-prometheus-stack/kube-state-metrics-config.yaml
- controller-runtime metrics source documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/internal/controller/metrics
- Prometheus Operator PodMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus alerting and recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/ and https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The post used `gotk_reconcile_condition` as if it were a counter for successful and failed reconciliation attempts. Current Flux documentation lists reconciliation attempts under `controller_runtime_reconcile_total`, while resource readiness state is exported through kube-state-metrics custom resource metrics such as `gotk_resource_info`. Replaced the success-rate, source-fetch, error-budget, and burn-rate PromQL examples with `controller_runtime_reconcile_total` queries.
- The source fetch success-rate example used a `kind="GitRepository"` condition metric. Replaced it with the source controller's `controller="gitrepository"` reconciliation counter query.
- The reconciliation latency explanation described end-to-end time from Git change detection to cluster application, but `gotk_reconcile_duration_seconds` measures controller reconciliation processing duration. Updated the wording to match the metric.
- The PodMonitor example was valid in broad shape but less aligned with Flux's official monitoring example. Updated it to include `namespaceSelector.matchNames: flux-system` and the Flux controller `app` label `matchExpressions` used by the upstream monitoring example.
- The alerting section described multi-window burn-rate alerting, but each alert expression only checked one PromQL window. Updated the expressions to use paired long and short windows: 1 hour and 5 minutes for the 14.4x fast-burn alert, and 6 hours and 30 minutes for the 6x slow-burn alert.
- The prerequisites did not mention that Flux custom resource readiness dashboards require kube-state-metrics custom resource configuration. Added that caveat.

## Review Notes
- `promtool` was not installed in the local environment, so Prometheus rule syntax was reviewed manually against Prometheus rule documentation.
