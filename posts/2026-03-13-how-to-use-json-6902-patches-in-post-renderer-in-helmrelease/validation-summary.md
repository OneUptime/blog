# Validation Summary: How to Use JSON 6902 Patches in Post-Renderer in HelmRelease

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux HelmRelease
- Flux helm-controller
- Kubernetes
- Helm
- Kustomize post-renderers
- JSON Patch / RFC 6902
- JSON Pointer / RFC 6901 escaping
- kubectl
- Flux CLI

## Sources Consulted
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation, post-renderer example: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux 2.3 release notes for HelmRelease `helm.toolkit.fluxcd.io/v2` GA and `patches` migration: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Kubernetes Kustomize documentation for `patches`, `Json6902`, and target selectors: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902
- Flux CLI `flux get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/

## Issues Found
- The prerequisites said Flux CD v2.0 or later, but the examples use the GA `helm.toolkit.fluxcd.io/v2` HelmRelease API. Flux 2.3 promoted HelmRelease to `helm.toolkit.fluxcd.io/v2`, so the prerequisite was changed to Flux CD v2.3 or later for the API shown.
- The introduction described strategic merge patches as requiring the full path structure of the resource. Strategic merge patches use partial Kubernetes object structure and merge semantics, so that wording was corrected.
- The add, env append, and volume append examples used JSON Patch paths whose parent object or array must already exist. RFC 6902 requires the parent container to exist for nested additions, so notes were added to clarify when readers must add the parent map or array first.

## Review Notes
The current examples correctly use `.spec.postRenderers[].kustomize.patches`, which is the non-deprecated field in the Flux HelmRelease v2 API. The target selector fields and `flux get helmreleases -n default` command are consistent with the current official documentation.
