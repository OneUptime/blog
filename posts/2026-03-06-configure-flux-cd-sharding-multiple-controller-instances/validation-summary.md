# Validation Summary: How to Configure Flux CD Sharding for Multiple Controller Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Deployments and Services
- Flux source-controller
- Flux kustomize-controller
- Prometheus Operator PodMonitor
- PromQL

## Sources Consulted
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux controller release documentation: https://fluxcd.io/flux/releases/controllers/
- Flux v2.8.7 GitHub release notes: https://github.com/fluxcd/flux2/releases/tag/v2.8.7
- Controller binary help output from `ghcr.io/fluxcd/kustomize-controller:v1.8.5 --help`
- Controller binary help output from `ghcr.io/fluxcd/source-controller:v1.8.4 --help`

## Issues Found
- The default controller selector used `--watch-label-selector=sharding.fluxcd.io/key=default`, which would only process resources explicitly labeled as `default`, not unlabeled resources. Changed it to `--watch-label-selector=!sharding.fluxcd.io/key`, matching Flux's official sharding guidance for main controllers.
- The examples used `--leader-election-id`, which is not a supported flag in the cited controller versions or the current controller versions. Removed the flag and updated the summary to refer only to unique label selectors.
- The controller image tags were outdated. Updated the kustomize-controller examples to `v1.8.5` and the source-controller example to `v1.8.4`, matching the Flux v2.8.7 component release.
- The monitoring example used a `ServiceMonitor` selector but did not define Services for each sharded controller's metrics. Changed the example to a `PodMonitor` and added matching pod labels and named metrics ports.
- The PromQL examples used invalid aggregation syntax such as `metric by (pod)`. Rewrote them as valid `sum by (...) (...)` / `count by (...) (...)` expressions.
- The resource-count metric `gotk_reconcile_condition` was not part of the current documented Flux metrics. Replaced it with a `gotk_resource_info` example from the Flux kube-state-metrics custom resource metrics documentation.

## Review Notes
The guide is technically relevant and salvageable. For production use, Flux's official sharding docs recommend generating shard manifests from `gotk-components.yaml` with Kustomize patches so shard deployments inherit the rest of the installed Flux configuration and are upgraded with the main controllers.
