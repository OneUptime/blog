# Validation Summary: How to Deploy Multiple Helm Controller Instances in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux helm-controller
- Kubernetes
- HelmRelease custom resources
- Kubernetes Deployments
- kubectl
- Flux CLI

## Sources Consulted
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux helm-controller options documentation: https://fluxcd.io/flux/components/helm/options/
- Flux HelmRelease management guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux v2.3 GA announcement for Helm API GA and `helm.toolkit.fluxcd.io/v2`: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Flux v2.8 GA announcement and component versions: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux v2.8.0 GitHub release notes: https://github.com/fluxcd/flux2/releases/tag/v2.8.0
- Flux installation prerequisites: https://fluxcd.io/flux/installation/

## Issues Found
- The prerequisites said Kubernetes v1.25+ and Flux CLI v2.0+, but the examples use the GA `helm.toolkit.fluxcd.io/v2` API introduced with Flux v2.3, and current Flux v2.8 documentation supports Kubernetes v1.33, v1.34, and v1.35. Updated the prerequisites to require a Kubernetes version supported by the selected Flux release and Flux CLI v2.3+.
- The controller image examples used `ghcr.io/fluxcd/helm-controller:v1.1.0`, which is older than the current Flux v2.8 component version. Updated the examples to `ghcr.io/fluxcd/helm-controller:v1.5.0`.
- The reconciliation explanation said every HelmRelease reconciliation performs live-state diffing. Updated the wording to describe template rendering, desired release comparison, and possible Helm upgrade operations without implying that live drift comparison always occurs.

## Review Notes
- The `--watch-label-selector` examples and the main controller exclusion selector match the current Flux sharding documentation.
- The HelmRelease examples use the stable `helm.toolkit.fluxcd.io/v2` API and valid `spec.chart.spec.sourceRef` structure.
- If users shard source-controller in addition to helm-controller, Flux documentation recommends labeling related source resources and generated HelmChart metadata consistently.
