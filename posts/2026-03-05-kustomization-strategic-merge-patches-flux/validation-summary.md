# Validation Summary: How to Configure Kustomization Strategic Merge Patches in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization resources
- Kustomize patches
- Kubernetes strategic merge patches
- Kubernetes Deployments and Pod specs
- JSON6902 patches

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux build kustomization` documentation: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Kustomize `patches` documentation: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kubernetes `kubectl patch` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes strategic merge patch task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes API concepts documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The introduction said strategic merge patches are the default patch type for Flux Kustomizations. Flux `spec.patches` supports both strategic merge and JSON6902 patches, and Kustomize determines the patch type from the patch content. Updated the wording to say strategic merge patches are commonly used, and that `spec.patches` can use strategic merge format when the patch is a partial resource document.
- The post described Kubernetes as performing the merge in the Flux examples. In Flux `spec.patches`, Kustomize performs the patching during manifest build. Updated the wording to identify Kustomize as the component doing the merge.
- The best-practice section recommended strategic merge patches as the default without qualification. Strategic merge patch behavior is strongest for built-in Kubernetes resources, while custom resources can require OpenAPI configuration or JSON6902 patches. Updated the recommendation to scope it to built-in Kubernetes resources.

## Review Notes
- The YAML examples use the current Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization API and valid `spec.patches` structure.
- The `flux build kustomization my-app` and `kubectl describe kustomization my-app -n flux-system` commands are valid, but local verification could not be run because `flux`, `kubectl`, and `kustomize` are not installed in this workspace.
