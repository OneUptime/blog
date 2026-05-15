# Validation Summary: How Flux CD Garbage Collection Works for Deleted Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux HelmRelease
- Kubernetes manifests and kubectl
- GitOps garbage collection

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Helm Controller documentation: https://fluxcd.io/flux/components/helm/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI documentation for `flux delete helmrelease`: https://fluxcd.io/flux/cmd/flux_delete_helmrelease/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Flux kustomize-controller source: https://github.com/fluxcd/kustomize-controller/blob/main/internal/controller/kustomization_controller.go
- Flux SSA package source: https://github.com/fluxcd/pkg/blob/main/ssa/manager_delete.go
- Flux SSA package source: https://github.com/fluxcd/pkg/blob/main/ssa/sort.go

## Issues Found
- The reconciliation flow diagram implied that Flux prunes stale resources before applying the current manifests, and skipped the apply step on the stale-resource path. Updated the diagram to show current manifests being applied before inventory diffing and pruning.
- The garbage-collection control section title referred only to labels while the example used an annotation. Updated it to state that Flux supports either a label or annotation for `kustomize.toolkit.fluxcd.io/prune: disabled`.
- The garbage-collection order section described deletion as the reverse of apply order. Updated it to the more precise reverse of Flux's reconciliation sort order.

## Review Notes
The post uses the current Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization API and `helm.toolkit.fluxcd.io/v2` HelmRelease behavior. The `kubectl events --for` command is current in Kubernetes documentation. The post does not mention `.spec.deletionPolicy`, which can further control Kustomization deletion behavior, but that omission is not a correctness issue for this guide.
