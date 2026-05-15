# Validation Summary: How to Understand Flux CD Finalizers and Resource Cleanup

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes finalizers
- Flux Kustomization resources
- Flux HelmRelease resources
- Flux source-controller resources
- `kubectl`
- Flux CLI

## Sources Consulted
- Kubernetes documentation: Finalizers - https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux documentation: Kustomize API reference v1 - https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux documentation: Helm Releases - https://fluxcd.io/flux/components/helm/helmreleases/
- Flux documentation: Flux uninstall - https://fluxcd.io/flux/installation/uninstall/
- Helm documentation: `helm uninstall` - https://docs.helm.sh/docs/helm/helm_uninstall/
- Flux source-controller documentation: Git Repositories and artifacts - https://fluxcd.io/flux/components/source/gitrepositories/

## Issues Found
- The post described Kustomization cleanup as depending only on `spec.prune: true`. Updated the text to include `.spec.deletionPolicy`, because Flux supports `MirrorPrune`, `Delete`, `WaitForTermination`, and `Orphan`; `MirrorPrune` is the default and mirrors `spec.prune`.
- The post said HelmRelease deletion removes all resources the chart created. Updated this to "normally removing the resources associated with the release" to align with Helm's uninstall behavior and avoid overstating edge cases such as resources deliberately kept by Helm policy.

## Review Notes
The `kubectl` commands, JSON patch examples, Kustomization API version, `spec.deletionPolicy: Orphan`, Flux finalizer name, and `flux uninstall` behavior are consistent with current official documentation.
