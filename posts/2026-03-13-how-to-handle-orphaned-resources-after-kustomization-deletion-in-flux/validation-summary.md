# Validation Summary: How to Handle Orphaned Resources After Kustomization Deletion in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization custom resources
- Kubernetes
- kubectl
- GitOps garbage collection

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux CLI `flux delete kustomization` reference: https://fluxcd.io/flux/cmd/flux_delete_kustomization/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post incorrectly implied that Flux's default deletion behavior always attempts garbage collection. Updated it to explain the documented default `deletionPolicy: MirrorPrune`, which deletes managed resources when `prune: true` and orphans them when `prune: false`.
- The deletion section described behavior only in terms of `prune`. Updated it to include `deletionPolicy` and the supported values `MirrorPrune`, `Delete`, `WaitForTermination`, and `Orphan`.
- The post presented removing the Kustomization finalizer as a normal way to intentionally orphan resources. Replaced this with the supported `deletionPolicy: Orphan` workflow.
- Some cleanup commands used only the Kustomization name label. Added the namespace label selector to avoid matching resources from a same-named Kustomization in another namespace.
- The post used `kubectl get all` in places where it could imply complete coverage of Kubernetes resource types. Replaced it with explicit common resource types and split namespaced resources from cluster-scoped RBAC resources in the broader check.
- The adoption example claimed `force: true` was needed to overwrite Flux ownership labels. Removed `force: true` from the example and clarified that `force` is for recreating resources when immutable field changes prevent patching.
- The prevention section referred only to a prune-disabled annotation. Updated it to match Flux documentation, which supports either a label or annotation.

## Review Notes
The commands remain examples and do not cover every possible Kubernetes kind installed in a cluster. For exhaustive cleanup, operators should also inspect the deleted Kustomization's `.status.inventory` before deletion or query cluster-specific API resources that support labels.
