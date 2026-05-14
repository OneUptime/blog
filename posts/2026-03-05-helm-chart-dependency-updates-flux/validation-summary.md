# Validation Summary: How to Handle Helm Chart Dependency Updates in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux helm-controller
- Kubernetes custom resources
- Helm v3 charts and dependencies
- Renovate
- OCI registries

## Sources Consulted
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux image automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CLI documentation for `flux reconcile source chart`: https://fluxcd.io/flux/cmd/flux_reconcile_source_chart/
- Helm dependency command documentation: https://helm.sh/docs/helm/helm_dependency/
- Helm dependency best practices: https://helm.sh/docs/v3/chart_best_practices/dependencies/
- Helm chart dependency alias documentation: https://helm.sh/docs/topics/charts/
- Renovate Helm v3 manager documentation: https://docs.renovatebot.com/modules/manager/helmv3/
- Renovate custom manager documentation: https://docs.renovatebot.com/modules/manager/regex/
- Flux source-controller implementation for HelmChart dependency resolution: https://github.com/fluxcd/source-controller

## Issues Found
- The remote chart example said Flux would deploy `1.3.0` under a `1.2.x` semver constraint. Changed the example version to `1.2.4`, which matches the stated constraint.
- The GitRepository dependency resolution text claimed source-controller literally runs `helm dependency build`. Updated it to describe the actual behavior: source-controller resolves missing dependencies before packaging, with `Chart.lock` taking precedence when present.
- The Renovate example used an invalid/outdated configuration shape, including `helmChart` and a deprecated regex manager pattern that did not match the post's `Chart.yaml` order. Replaced it with a current JSON example using `helmv3`, `helm-values`, and lock file maintenance.
- The Flux image automation section implied it can update Helm chart dependency entries. Updated it to clarify that Flux image automation targets container image references and that Helm chart OCI dependencies should be updated in Git with Renovate or another update tool.
- The timeout troubleshooting advice only mentioned source-controller resource limits. Updated it to include `HelmRepository.spec.timeout`, which is the relevant timeout control for dependency repository fetches.
- The manual rebuild command reconciled the GitRepository source. Replaced it with `flux reconcile source chart <chart-name> -n flux-system --with-source`, which targets the generated HelmChart artifact and its source.

## Review Notes
The Flux API versions used in the examples are current. The examples assume the generated HelmChart and dependency HelmRepository resources are in `flux-system`, which is consistent with the shown `sourceRef.namespace`.
