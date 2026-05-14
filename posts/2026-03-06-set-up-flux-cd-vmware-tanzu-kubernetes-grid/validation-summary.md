# Validation Summary: How to Set Up Flux CD on VMware Tanzu Kubernetes Grid

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- VMware Tanzu Kubernetes Grid
- Tanzu CLI
- Kubernetes
- Kustomize
- Helm and Flux HelmRelease
- cert-manager
- ingress-nginx
- vSphere CSI StorageClass
- Flux image automation
- Flux notifications
- GitHub GitOps repositories

## Sources Consulted
- Flux bootstrap CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux image update automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Broadcom Tanzu Kubernetes Grid workload cluster reference: https://knowledge.broadcom.com/external/article/337411/unable-to-create-a-tanzu-kubernetes-grid.html

## Issues Found
- The repository setup created `infrastructure/sources`, `infrastructure/controllers`, and other directories, but later introduced `infrastructure/storage/vsphere-sc.yaml` without creating the `infrastructure/storage` directory. Added the missing directory creation command.
- The vSphere StorageClass manifest was shown but was not included in the infrastructure Kustomize resources, so Flux would not apply it as part of the infrastructure stack. Added `../../../infrastructure/storage/vsphere-sc.yaml` to the infrastructure `kustomization.yaml`.
- The cert-manager Helm values used `installCRDs: true`. Current cert-manager Helm documentation uses `crds.enabled=true` for current chart versions, including the latest chart series. Updated the HelmRelease values to `crds.enabled: true`.
- The image automation example defined an `ImageRepository` and `ImagePolicy` for `harbor.example.com/apps/tanzu-app`, but the Deployment used `nginx:1.27-alpine` and had no Flux image policy marker. Flux image automation requires setter markers in the target manifests. Updated the Deployment image to `harbor.example.com/apps/tanzu-app:1.0.0` and added the `{"$imagepolicy": "flux-system:tanzu-app"}` marker.
- The image automation commit template used `{{.NewValue}}` as a top-level template variable, but Flux exposes image changes through `.Changed` data rather than a top-level `.NewValue`. Replaced it with a static commit message to avoid a template rendering error.

## Review Notes
The post is technically relevant and remains a valid Flux-on-TKG GitOps guide after the corrections. The Tanzu CLI examples are version-sensitive because Tanzu Kubernetes Grid and Broadcom/VMware product naming and CLI behavior vary by TKG generation; readers should verify flags against the Tanzu CLI version installed in their environment.
