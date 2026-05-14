# Validation Summary: How to Use flux delete to Remove Flux Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux source-controller resources: GitRepository, HelmRepository, HelmChart, OCIRepository, Bucket
- Flux kustomize-controller Kustomization resources
- Flux helm-controller HelmRelease resources
- Flux notification-controller Alert and Provider resources
- Flux image automation resources
- Kubernetes kubectl
- GitOps workflows

## Sources Consulted
- Flux CLI documentation, `flux delete helmrelease`: https://fluxcd.io/flux/cmd/flux_delete_helmrelease/
- Flux CLI documentation, `flux delete source git`: https://fluxcd.io/flux/cmd/flux_delete_source_git/
- Flux CLI documentation, `flux delete source chart`: https://fluxcd.io/flux/cmd/flux_delete_source_chart/
- Flux CLI documentation, `flux delete kustomization`: https://fluxcd.io/flux/cmd/flux_delete_kustomization/
- Flux CLI documentation, `flux delete alert-provider`: https://fluxcd.io/flux/cmd/flux_delete_alert-provider/
- Flux CLI documentation, `flux delete image update`: https://fluxcd.io/flux/cmd/flux_delete_image_update/
- Flux Kustomization documentation, prune and deletion policy: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation, uninstall handling: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference, uninstall settings: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI documentation, `flux export`: https://fluxcd.io/flux/cmd/flux_export/

## Issues Found
- The introduction claimed that `flux delete` understands resource relationships. The CLI documentation describes the command as deleting Flux resources from the cluster, while cascade behavior is handled by the relevant controllers and resource specifications. Changed this to say the Flux CLI targets Flux custom resources directly and provides confirmation prompts.
- The Kustomization deletion explanation treated `spec.prune` as the only control for deleting managed resources. Current Flux documentation also defines `spec.deletionPolicy`, whose default is `MirrorPrune`. Updated the text, diagram, and safe deletion example to use `deletionPolicy: Orphan` for preserving managed resources when deleting the Kustomization.
- The HelmRelease section claimed that annotating the HelmRelease with `kustomize.toolkit.fluxcd.io/prune=disabled` prevents Flux from uninstalling the Helm release. That annotation is for Kustomization garbage collection and does not disable HelmRelease uninstall behavior. Replaced the example with suspending the HelmRelease to stop reconciliation, and clarified that deleting a HelmRelease triggers Helm uninstall. Added the supported `spec.uninstall.deletionPropagation: orphan` setting for leaving chart-created Kubernetes resources behind, while noting that this does not keep an active installed Helm release.

## Review Notes
- The Flux CLI binary was not installed in the local environment, so command validation was performed against the current official Flux CLI documentation instead of local `--help` output.
- The post's command examples match the current documented Flux command structure for the reviewed resource types.
