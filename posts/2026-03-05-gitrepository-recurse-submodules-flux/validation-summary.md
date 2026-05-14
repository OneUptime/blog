# Validation Summary: How to Configure GitRepository Recurse Submodules in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux GitRepository
- Flux Kustomization
- Git submodules
- Kubernetes
- kubectl

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI documentation for `flux create source git`: https://fluxcd.io/flux/cmd/flux_create_source_git/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
No technical issues found.

## Review Notes
The post uses current Flux `source.toolkit.fluxcd.io/v1` and `kustomize.toolkit.fluxcd.io/v1` APIs. The `spec.recurseSubmodules` field and `flux create source git --recurse-submodules` flag are valid. The authentication guidance is consistent with Flux documentation, which notes that credentials used for submodules must have access to all required repositories and that per-repository deploy keys are usually not suitable for submodule setups across multiple private repositories.
