# Validation Summary: How to Use Strategic Merge Patches in Post-Renderer in HelmRelease

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- HelmRelease
- Kubernetes
- Helm
- Kustomize
- Strategic merge patches
- JSON 6902 patches
- kubectl
- Flux CLI

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation, post renderers section: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux v2.3 GA announcement and API migration notes: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Kustomize `patches` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kubernetes strategic merge patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
- The post used `spec.postRenderers[].kustomize.patchesStrategicMerge` with `apiVersion: helm.toolkit.fluxcd.io/v2`. Flux removed `patchesStrategicMerge` from the HelmRelease v2 API and replaced it with `kustomize.patches`. Updated all examples to use `kustomize.patches` with inline strategic merge patch content.
- The prerequisites said Flux v2.0 or later while the examples use the GA `helm.toolkit.fluxcd.io/v2` HelmRelease API. Updated the prerequisite to require a Flux version with that API, such as Flux v2.3 or later.
- The introduction and conclusion described strategic merge patches as generally merging arrays. Kubernetes strategic merge patch behavior depends on the field's patch strategy, and some lists are replaced. Updated the wording to clarify that arrays are merged only for fields that define merge semantics.
- Verified all YAML code blocks parse successfully after the changes.

## Review Notes
The examples now use current Flux v2 syntax while still demonstrating strategic merge patch payloads. For older Flux installations using `v2beta1` or `v2beta2`, users may still encounter legacy examples with `patchesStrategicMerge`, but the current `helm.toolkit.fluxcd.io/v2` API should use `kustomize.patches`.
