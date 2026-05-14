# Validation Summary: How to Structure Kustomize Base and Overlays for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Kustomize bases and overlays
- Kubernetes manifests
- GitOps repository structure

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI documentation for `flux diff kustomization`: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The layered base example used `../../bases/microservice` from `apps/user-service/base`, which resolves under `apps/` instead of the repository root. Changed it to `../../../bases/microservice` in the directory comments and YAML snippet.
- The rule "One Flux Kustomization per Overlay" was too absolute and contradicted the multi-cluster pattern where several clusters may point to the same shared overlay. Reworded it to "One Flux Kustomization per Deployed Overlay" and noted that multi-cluster repositories may reuse an overlay.
- The validation loop claimed to validate all overlays but only covered `apps/*/overlays/*/`. Updated it to include `infrastructure/overlays/*/` and guard against missing glob matches.

## Review Notes
The Flux Kustomization API examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields including `interval`, `path`, `prune`, `sourceRef`, `dependsOn`, and `postBuild.substitute`. The Kustomize snippets use current fields such as `resources`, `replicas`, `images`, and `patches`.
