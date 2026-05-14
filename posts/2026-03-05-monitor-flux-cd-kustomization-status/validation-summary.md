# Validation Summary: How to Monitor Flux CD Kustomization Status

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Flux CD
- Flux Kustomization resources
- Kubernetes
- Prometheus and PromQL
- Grafana dashboards
- PrometheusRule custom resources
- kube-state-metrics

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI `flux trace` documentation: https://fluxcd.io/flux/cmd/flux_trace/
- Flux CLI `flux logs` documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux monitoring example repository: https://github.com/fluxcd/flux2-monitoring-example

## Issues Found
- The post used older `gotk_reconcile_condition` and `gotk_suspend_status` metrics as if they were current controller metrics. Current Flux documentation lists controller reconciliation duration metrics and documents Flux resource state through kube-state-metrics using `gotk_resource_info`. Updated the key metrics, PromQL examples, Grafana panel expressions, alert rules, recording rules, and summary to use `gotk_resource_info` for readiness and suspended state.
- The `FluxKustomizationStalled` alert depended on a `gotk_reconcile_condition` Stalled metric that is not part of the current Flux monitoring example. Replaced it with a suspended Kustomization alert using `gotk_resource_info{customresource_kind="Kustomization", suspended="true"}`.
- The post described `flux trace` as showing the full dependency chain. Official CLI documentation says `flux trace` shows how objects are managed by Flux, including source and reconciliation status. Updated the wording to match the documented behavior.

## Review Notes
Flux CLI commands and flags in the post match the current official CLI documentation, but the `flux` binary was not installed in the local environment, so local `--help` validation was not possible.
