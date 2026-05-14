# Validation Summary: How to Use flux export to Backup Flux Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux CD / Flux v2
- Kubernetes custom resources
- kubectl
- Bash scripting
- Kubernetes CronJob
- Git

## Sources Consulted
- Flux CLI documentation: `flux export` - https://fluxcd.io/flux/cmd/flux_export/
- Flux CLI documentation: `flux export source` - https://fluxcd.io/flux/cmd/flux_export_source/
- Flux CLI documentation: `flux export source git` - https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux CLI documentation: `flux export source helm` - https://fluxcd.io/flux/cmd/flux_export_source_helm/
- Flux CLI documentation: `flux export source oci` - https://fluxcd.io/flux/cmd/flux_export_source_oci/
- Flux CLI documentation: `flux export source chart` - https://fluxcd.io/flux/cmd/flux_export_source_chart/
- Flux CLI documentation: `flux export source bucket` - https://fluxcd.io/flux/cmd/flux_export_source_bucket/
- Flux CLI documentation: `flux export kustomization` - https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux CLI documentation: `flux export helmrelease` - https://fluxcd.io/flux/cmd/flux_export_helmrelease/
- Flux CLI documentation: `flux export alert` - https://fluxcd.io/flux/cmd/flux_export_alert/
- Flux CLI documentation: `flux export alert-provider` - https://fluxcd.io/flux/cmd/flux_export_alert-provider/
- Flux CLI documentation: `flux export image repository` - https://fluxcd.io/flux/cmd/flux_export_image_repository/
- Flux CLI documentation: `flux export image policy` - https://fluxcd.io/flux/cmd/flux_export_image_policy/
- Flux CLI documentation: `flux export image update` - https://fluxcd.io/flux/cmd/flux_export_image_update/
- Flux 2 release information - https://github.com/fluxcd/flux2/releases
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease guide - https://fluxcd.io/flux/guides/helmreleases/

## Issues Found
- The post used `flux export ... --all-namespaces` throughout. Official Flux CLI docs for `flux export` expose `--all` and `--namespace`, but not `--all-namespaces`. Replaced those examples with `--all` and adjusted wording to explain that exports are namespace-scoped.
- The post used `flux export source all`, which is not a documented `flux export source` subcommand. Replaced it with separate exports for documented source types such as `git`, `helm`, and `oci`.
- The backup scripts used invalid export flags and an undefined namespace pattern after correction. Updated the scripts to use `--namespace="${NAMESPACE}" --all`, added a namespace variable, and ensured the Git backup script creates the destination directory before writing files.
- The restore ordering omitted `HelmChart` even though the post exports HelmChart sources. Added `HelmChart` to the source restore list.
- The post claimed it covered all supported Flux resource types. Current Flux exports also include resources not covered by the post, such as Receiver and artifact-related resources, so the wording was narrowed to common Flux resource types.

## Review Notes
- `flux export alert-provider` and `flux export source chart` are documented by Flux as preview commands, so future Flux releases may introduce breaking changes.
- Flux v2.8.6 is the latest release observed during review, but the post's minimum CLI prerequisite of v2.2.0 or later was not changed because the reviewed export commands are documented in current Flux CLI docs.
