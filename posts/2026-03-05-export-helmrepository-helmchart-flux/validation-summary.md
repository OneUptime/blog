# Validation Summary: How to Export HelmRepository and HelmChart Resources in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes custom resources
- HelmRepository
- HelmChart
- GitOps
- kubectl

## Sources Consulted
- Flux CLI reference: `flux export source helm` - https://fluxcd.io/flux/cmd/flux_export_source_helm/
- Flux CLI reference: `flux export source chart` - https://fluxcd.io/flux/cmd/flux_export_source_chart/
- Flux source-controller documentation: HelmRepository - https://fluxcd.io/flux/components/source/helmrepositories/
- Flux source-controller documentation: HelmChart - https://fluxcd.io/flux/components/source/helmcharts/
- Kubernetes documentation: JSONPath support - https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The "Full Cluster Export" section said the sample exported "all source types", but the script only exports HelmRepository, HelmChart, and GitRepository resources. Updated the surrounding wording and inline comment to accurately describe the source kinds included in the example.

## Review Notes
- The local environment did not have the `flux` CLI installed, so CLI syntax was verified against the current official Flux CLI documentation instead of local `--help` output.
- The official Flux documentation marks `flux export source chart` as a preview command, so its behavior may change in future Flux releases.
