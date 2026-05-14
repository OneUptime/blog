# Validation Summary: How to Configure HelmRelease Kustomize Post-Renderer in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Helm Controller
- HelmRelease
- Kubernetes
- Kustomize
- Strategic merge patches
- JSON 6902 patches
- Container image transformations
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation for patch semantics: https://fluxcd.io/flux/components/kustomize/kustomizations/#patches
- Flux Kustomize package API for patch selectors: https://pkg.go.dev/github.com/fluxcd/pkg/apis/kustomize
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The post stated that the HelmRelease Kustomize post-renderer supports "other Kustomize features" and can apply "any other Kustomize transformation." The current Flux v2 API reference lists `patches` and `images` for the HelmRelease post-renderer, so the wording was narrowed to strategic merge patches, JSON 6902 patches, and image transformations.
- The strategic merge patch example said it added environment variables and resource limits, but the snippet only added environment variables. Added `resources.requests` and `resources.limits` to the example container.
- The strategic merge patch explanation implied all Kubernetes lists merge by key. Added a caveat that this applies to supported Kubernetes resource types.
- The JSON 6902 annotation examples used individual annotation wording while setting the annotations map. Updated comments to "Set" annotations to avoid implying a guaranteed non-destructive merge of existing annotations.
- The target selector description omitted annotation selectors. Added annotation selectors to match the Flux selector API.

## Review Notes
The HelmRelease examples use `apiVersion: helm.toolkit.fluxcd.io/v2`, which matches the current Flux API. The debugging commands use valid `kubectl` patterns, but `flux logs --kind HelmRelease --name <name>` could be a more Flux-native troubleshooting option in a future expansion.
