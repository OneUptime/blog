# Validation Summary: How to Configure HelmRelease Chart Reference in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Flux source-controller
- Kubernetes custom resources
- Helm and Helm charts
- HelmRepository, GitRepository, Bucket, and HelmRelease resources

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI documentation for `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Flux CLI documentation for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/

## Issues Found
- The post said every HelmRelease contains `spec.chart.spec`. Flux v2 allows either `spec.chart` or `spec.chartRef`, so I changed the wording to clarify that `spec.chart.spec` applies when using a chart template.
- The OCI HelmRepository section said to use `HelmRepository` with `type: oci` without caveat. Flux documents this API as supported but in maintenance mode and recommends `OCIRepository` with `spec.chartRef` for improved OCI support, so I added that caveat.
- The OCI HelmRepository example included `interval: 1h`. The field is accepted but ignored for OCI HelmRepository sources, so I added a comment to prevent readers from thinking it controls OCI polling.
- The cross-namespace section did not mention the helm-controller `--no-cross-namespace-refs=true` setting. I added the caveat because platform administrators can disable cross-namespace source references.

## Review Notes
The remaining YAML examples use current Flux `helm.toolkit.fluxcd.io/v2` and `source.toolkit.fluxcd.io/v1` API versions. The Flux CLI was not installed locally, so CLI command validation was performed against the official Flux CLI documentation.
