# Validation Summary: How to Use flux create to Generate Flux Resources from CLI

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Flux CLI
- Flux CD / GitOps Toolkit
- Kubernetes custom resources
- GitRepository, HelmRepository, HelmRelease, Kustomization, OCIRepository, Bucket
- Flux notification resources
- Flux image automation resources
- Helm values YAML

## Sources Consulted
- Flux CLI reference: `flux create source git` - https://fluxcd.io/flux/cmd/flux_create_source_git/
- Flux CLI reference: `flux create source helm` - https://fluxcd.io/flux/cmd/flux_create_source_helm/
- Flux CLI reference: `flux create helmrelease` - https://fluxcd.io/flux/cmd/flux_create_helmrelease/
- Flux CLI reference: `flux create kustomization` - https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Flux CLI reference: `flux create source oci` - https://fluxcd.io/flux/cmd/flux_create_source_oci/
- Flux CLI reference: `flux create source bucket` - https://fluxcd.io/flux/cmd/flux_create_source_bucket/
- Flux CLI reference: `flux create alert-provider` - https://fluxcd.io/flux/cmd/flux_create_alert-provider/
- Flux CLI reference: `flux create alert` - https://fluxcd.io/flux/cmd/flux_create_alert/
- Flux CLI reference: `flux create image repository` - https://fluxcd.io/flux/cmd/flux_create_image_repository/
- Flux CLI reference: `flux create image policy` - https://fluxcd.io/flux/cmd/flux_create_image_policy/
- Flux CLI reference: `flux create image update` - https://fluxcd.io/flux/cmd/flux_create_image_update/
- Flux CLI reference: `flux create secret git` - https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux Helm releases guide - https://fluxcd.io/flux/guides/helmreleases/
- Flux source controller HelmRepository documentation - https://fluxcd.io/flux/components/source/helmrepositories/
- Flux notification Alert documentation - https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation - https://fluxcd.io/flux/components/notification/providers/

## Issues Found
- The OCI-based `HelmRepository` example used `oci://ghcr.io/stefanprodan/charts`, but current Flux documentation examples point the OCI Helm repository URL at the registry repository for the chart, such as `oci://ghcr.io/stefanprodan/charts/podinfo`. Updated the example URL accordingly.
- The HelmRelease values example described `--values=./redis-values.yaml` as "inline values". The Flux CLI uses `--values` for values from local YAML files, so the comment was corrected to say "values from a local YAML file".

## Review Notes
- The Flux CLI was not installed in the local environment, so validation was performed against the current official Flux CLI and component documentation.
- Several `flux create` commands used in the post are marked as preview in the Flux CLI documentation, including alert, alert-provider, OCI source, and bucket source commands. They are valid current commands, but their flags may change in future Flux releases.
