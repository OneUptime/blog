# Validation Summary: How to Use HelmRelease with Chart from OCIRepository in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- HelmRelease
- OCIRepository
- HelmRepository
- OCI registries

## Sources Consulted
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease component documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux OCIRepository component documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository component documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `get sources oci` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/

## Issues Found
- The OCIRepository examples for Helm charts omitted `spec.layerSelector`. Flux's official Helm OCI examples select the Helm chart content layer with media type `application/vnd.cncf.helm.chart.content.v1.tar+gzip` and `operation: copy`, so this was added to each OCIRepository example that is used as a Helm chart source.
- The Flux CLI examples used `flux get source oci`, but the current documented command is `flux get sources oci`. The commands were updated.
- The HelmRelease status command used `flux get helmrelease`, but the current documented command is `flux get helmreleases`. The command was updated.

## Review Notes
The `HelmRepository` with `type: oci` alternative is technically valid, but Flux documentation notes that OCI HelmRepository support is in maintenance mode and recommends OCIRepository for improved OCI Helm chart support. The post already presents OCIRepository with `chartRef` as the preferred approach.
