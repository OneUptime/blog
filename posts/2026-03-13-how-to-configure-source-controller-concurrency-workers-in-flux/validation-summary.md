# Validation Summary: How to Configure Source Controller Concurrency Workers in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Kustomize
- Prometheus metrics
- controller-runtime metrics

## Sources Consulted
- Flux source-controller documentation: https://fluxcd.io/flux/components/source/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Kubebuilder controller-runtime metrics reference: https://book.kubebuilder.io/reference/metrics-reference
- Flux source-controller Dockerfile: https://github.com/fluxcd/source-controller/blob/main/Dockerfile

## Issues Found
- The post described `--concurrent` as setting workers "across all source kinds." Flux documents this flag as "the number of concurrent reconciles per controller," so the wording was corrected.
- The metrics command used `kubectl exec` with `curl` inside the source-controller container. The upstream source-controller image does not install curl, so the example was changed to port-forward the metrics port and run `curl` locally.

## Review Notes
- The sample Kustomize patches use current Kubernetes API versions and valid Kustomize `patches` syntax.
- The `controller_runtime_active_workers` metric is a controller-runtime metric exported by Flux alongside its documented controller metrics.
