# Validation Summary: How to Benchmark Flux Reconciliation Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- Prometheus
- Grafana
- Bash
- kubectl
- Flux CLI

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI `get sources all` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubebuilder/controller-runtime metrics reference: https://book.kubebuilder.io/reference/metrics-reference

## Issues Found
- The reconciliation duration explanation incorrectly said `gotk_reconcile_duration_seconds_*` is broken down by reconciliation result. Current Flux documentation lists labels for kind, name, namespace, and `le` for buckets, but not result. Updated the text to describe the actual labels.
- The post listed `gotk_reconcile_condition` as a current built-in Flux controller metric. Current Flux monitoring documentation instead documents `gotk_resource_info` as an example resource-state metric collected through kube-state-metrics custom resource metrics. Updated the metric and clarified the kube-state-metrics requirement.
- The baseline command used `kubectl exec ... curl` inside the Flux controller container. This depends on `curl` being present in the controller image and is less reliable than using the exposed metrics endpoint. Updated the example to use `kubectl port-forward` and local `curl`.
- The "last hour" wording for raw `/metrics` output was inaccurate because those counters are cumulative for the controller process. Updated the wording to describe cumulative duration counters.
- The full reconciliation trigger command listed Kustomizations across all namespaces but annotated them with `-n flux-system`, which would fail or target the wrong namespace for Kustomizations outside `flux-system`. Replaced it with `kubectl annotate ... --all --all-namespaces`.
- The dashboard average and P99 PromQL examples did not aggregate correctly for cluster-wide values. Updated the average to divide summed rates and updated the P99 query to aggregate bucket rates by `le`, as required for classic histogram aggregation.
- The automated script also depended on `curl` inside controller containers and could parse Prometheus HELP/TYPE lines for `controller_runtime_active_workers`. Updated it to port-forward, read metrics locally, filter actual metric samples, and sum active worker values.

## Review Notes
- `flux get sources all` is documented by Flux as preview and under development, so future Flux releases may change that command.
- `gotk_resource_info` requires kube-state-metrics custom resource metrics and is not exported directly by Flux controllers.
