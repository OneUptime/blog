# Validation Summary: How to Fix Flux CD Not Picking Up New Helm Chart Versions

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- HelmRelease
- HelmRepository
- HelmChart
- OCIRepository
- Helm
- Kubernetes
- SemVer constraints

## Sources Consulted
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux CLI documentation for `flux reconcile source helm`: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Flux CLI documentation for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Helm CLI documentation for `helm search repo`: https://helm.sh/docs/helm/helm_search_repo/
- Masterminds semver constraint documentation: https://github.com/Masterminds/semver

## Issues Found
- The HelmRepository "last updated" diagnostic used `.status.conditions[0].lastTransitionTime`, which is not a reliable indication of when the repository index artifact was last fetched. Changed it to `.status.artifact.lastUpdateTime`, matching the HelmRepository status artifact documented by Flux.
- The OCI example treated an OCI HelmRepository like an HTTP HelmRepository that refreshes on an interval. Flux documents OCI HelmRepository as a data container with no `index.yaml` artifact/status, and its `interval` is ignored. Updated the section to recommend `OCIRepository`, use `source.toolkit.fluxcd.io/v1`, configure `ref.semver` and `layerSelector` for Helm charts, and reference it from HelmRelease with `chartRef`.

## Review Notes
The remaining HelmRelease, HelmRepository, HelmChart, Flux CLI, and Helm CLI examples are consistent with current Flux and Helm documentation. The local environment did not have `flux` or `helm` installed, so CLI verification was performed against official command documentation rather than local `--help` output.
