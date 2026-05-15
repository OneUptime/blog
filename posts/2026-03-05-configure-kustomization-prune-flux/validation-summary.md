# Validation Summary: How to Configure Kustomization Prune in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Kubernetes manifests
- Kustomize
- Flux CLI
- kubectl
- Kubernetes garbage collection

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux kustomize-controller source, reconciliation and prune implementation: https://github.com/fluxcd/kustomize-controller/blob/main/internal/controller/kustomization_controller.go
- Flux kustomize-controller source, inventory implementation: https://github.com/fluxcd/kustomize-controller/blob/main/internal/inventory/inventory.go
- Flux pkg server-side apply delete implementation: https://github.com/fluxcd/pkg/blob/main/ssa/manager_delete.go
- Flux pkg server-side apply sort order: https://github.com/fluxcd/pkg/blob/main/ssa/sort.go

## Issues Found
No technical issues found.

## Review Notes
The post uses the current `kustomize.toolkit.fluxcd.io/v1` API and accurately describes `spec.prune`, `.status.inventory`, per-resource `kustomize.toolkit.fluxcd.io/prune: disabled`, `spec.deletionPolicy: Orphan`, `flux events --for Kustomization/<name>`, and deletion behavior. The reverse deletion-order claim is supported by the current Flux delete implementation, which sorts resources in reverse of Flux's reconciliation order before deleting them.
