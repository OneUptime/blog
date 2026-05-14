# Validation Summary: How to Migrate from Flux v1 to Flux v2

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux v1 / Flux Legacy
- Flux v2 / GitOps Toolkit
- Kubernetes
- Kustomize Controller and Kustomization resources
- Source Controller, GitRepository, and HelmRepository resources
- Helm Controller and HelmRelease resources
- Image Reflector Controller and Image Automation Controller
- Notification Controller alerts and providers

## Sources Consulted
- Flux official migration guide: https://fluxcd.io/flux/migration/flux-v1-migration/
- Flux official Helm Operator migration guide: https://fluxcd.io/flux/migration/helm-operator-migration/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation and API reference: https://fluxcd.io/flux/components/helm/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flux image automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/ and https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI command documentation for bootstrap, diff, get, and secret creation: https://fluxcd.io/flux/cmd/

## Issues Found
- The Flux v1 HelmRelease example used `flux.weave.works/v1beta1`; changed it to the official Helm Operator API `helm.fluxcd.io/v1`.
- The CRD cleanup command referenced incorrect legacy CRD names; changed it to remove `helmreleases.helm.fluxcd.io` and updated the checklist check to look for `helm.fluxcd.io`.
- The notification examples used `notification.toolkit.fluxcd.io/v1` for Provider and Alert. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for these resources, so the examples were updated.
- The Alert example used deprecated `.spec.summary`; moved the summary text to `.spec.eventMetadata.summary`.
- The GitHub bootstrap command used `--personal` with an organization-style owner. Removed `--personal` from the organization example.
- The HelmRelease conversion script description overstated what the script does. Updated the wording and script comment to clarify that it extracts Helm repositories, and made the `jq` expression ignore HelmReleases without `.spec.chart.repository`.
- The troubleshooting section claimed Flux v2 requires a `kustomization.yaml` in the target directory. Updated it to reflect that Flux can apply plain YAML, while Kustomize-specific behavior still requires a valid `kustomization.yaml`.
- The SSH deploy key command generated a secret file but did not show how to print the public deploy key. Added the documented `yq` command to print `.stringData."identity.pub"`.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. The local environment did not have `flux` or `kubectl` installed, so CLI validation was performed against official Flux command documentation rather than local `--help` output.
