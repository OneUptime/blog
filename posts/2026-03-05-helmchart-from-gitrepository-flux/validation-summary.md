# Validation Summary: How to Set Up HelmChart Source from GitRepository in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux source-controller GitRepository resources
- Flux source-controller HelmChart resources
- Flux helm-controller HelmRelease resources
- Kubernetes custom resources
- Helm charts
- kubectl
- Flux CLI

## Sources Consulted
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux CLI `flux get sources chart` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_chart/
- Flux CLI `flux create helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_create_helmrelease/
- Flux source-controller implementation and test data: https://github.com/fluxcd/source-controller
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The `valuesFiles` section said paths are relative to the chart directory specified in `spec.chart`. Flux's HelmChart API defines these as relative to the referenced source artifact, and the source-controller local chart builder merges them from the source working directory. Updated the GitRepository example to use `deploy/helm/values.yaml` and `deploy/helm/values-production.yaml`, and changed the explanatory text to say the chart path prefix is needed when the chart is not at the repository root.

## Review Notes
The HelmChart, GitRepository, and HelmRelease manifests otherwise use current Flux v2 API versions and valid fields. `reconcileStrategy: Revision` is the correct strategy for creating new artifacts from GitRepository source revision changes. The verification commands are consistent with current Flux CLI documentation.
