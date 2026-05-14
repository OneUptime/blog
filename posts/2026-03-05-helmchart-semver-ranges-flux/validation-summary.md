# Validation Summary: How to Configure HelmChart SemVer Ranges in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux source-controller HelmChart resources
- Kubernetes custom resources
- Helm charts
- Semantic Versioning and Masterminds/semver constraints
- kubectl
- Flux CLI

## Sources Consulted
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `flux get sources chart` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_chart/
- Helm chart documentation: https://helm.sh/docs/topics/charts/
- Helm `search repo` command documentation: https://helm.sh/docs/helm/helm_search_repo/
- Masterminds/semver constraint documentation: https://github.com/Masterminds/semver

## Issues Found
- The tilde range description said the rightmost specified version component increments. Masterminds/semver defines tilde as patch-level ranges when a minor version is specified, and major-level ranges when the minor version is missing. Updated the wording to match the documented behavior while preserving the examples.
- The wildcard example said `*` matches any version at all. In Masterminds/semver, `*` is equivalent to `>= 0.0.0`, and ordinary constraints skip prerelease versions unless a prerelease comparator is included. Updated the comment to say it matches any stable version.

## Review Notes
The HelmChart manifests use the current `source.toolkit.fluxcd.io/v1` API and valid `spec.chart`, `spec.version`, `spec.sourceRef`, and `spec.interval` fields. The Flux and Helm commands are consistent with official command documentation, but the local workspace did not have `flux` or `helm` installed, so CLI verification was done against official docs rather than local `--help` output.
