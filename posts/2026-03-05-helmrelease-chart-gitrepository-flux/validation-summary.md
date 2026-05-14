# Validation Summary: How to Use HelmRelease with Chart from GitRepository in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- HelmRelease custom resources
- GitRepository source custom resources

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI `flux get` documentation: https://fluxcd.io/flux/cmd/flux_get/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Helm `helm list` documentation: https://helm.sh/docs/helm/helm_list/

## Issues Found
- The description and introduction incorrectly said GitRepository charts can be sourced through the newer `spec.chartRef` field. Current Flux documentation lists `spec.chartRef` support for OCIRepository, HelmChart, and ExternalArtifact references, while GitRepository-hosted charts are configured through `spec.chart.spec.sourceRef`. Updated the description and introduction to describe the chart template approach.
- The `spec.chartRef` section incorrectly stated that `spec.chartRef` supports GitRepository references. Updated it to state that Git-hosted charts should use `spec.chart.spec.sourceRef` with `kind: GitRepository`.
- A comment beside `reconcileStrategy: Revision` described it as reconciling at an interval. Updated the comment to reflect that `Revision` creates a new chart artifact when the source revision changes.
- A verification comment said `kubectl describe gitrepository` showed chart artifact details. Updated it to say it shows Git source artifact details.
- The Flux CLI examples used singular `flux get source git` and `flux get helmrelease` forms. Updated them to the current documented `flux get sources git` and `flux get helmreleases` commands.

## Review Notes
The main GitRepository and HelmRelease manifests use current Flux API versions and valid fields. The semver tag selection, branch/tag pinning, Secret reference, `flux get sources git`, `flux get helmreleases`, `kubectl describe`, and `helm list` examples are consistent with official documentation.
