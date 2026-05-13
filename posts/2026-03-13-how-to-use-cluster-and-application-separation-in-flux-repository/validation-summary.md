# Validation Summary: How to Use Cluster and Application Separation in Flux Repository

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux
- Kubernetes
- Kustomize
- GitOps repository structure
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/
- Flux CLI `flux suspend kustomization` documentation: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI `flux delete kustomization` documentation: https://fluxcd.io/flux/cmd/flux_delete_kustomization/
- Kubernetes Kustomize documentation: https://v1-34.docs.kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The granular dependency example showed a standalone Flux `Kustomization` without the required `spec.interval` and `spec.prune` fields, and without a `spec.sourceRef` to identify the source artifact. Added `interval`, `prune`, and `sourceRef` so the example is valid as written.

## Review Notes
The Flux and Kustomize patterns in the post match current Flux v2 documentation. The removal workflow is accurate when the Flux `Kustomization` has `prune: true`, because Flux garbage collection runs for deleted Kustomization objects by default through the `MirrorPrune` deletion policy.
