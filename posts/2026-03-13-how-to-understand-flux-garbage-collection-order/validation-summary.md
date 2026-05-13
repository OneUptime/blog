# Validation Summary: How to Understand Flux Garbage Collection Order

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD v2
- Flux kustomize-controller
- Flux Kustomization resources
- Kubernetes garbage collection and finalizers
- Kubernetes CustomResourceDefinitions
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux server-side apply package documentation: https://pkg.go.dev/github.com/fluxcd/pkg/ssa
- Flux `ssa` source for reconcile ordering and `DeleteAll`: https://github.com/fluxcd/pkg/blob/main/ssa/sort.go and https://github.com/fluxcd/pkg/blob/main/ssa/manager_delete.go
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Custom Resources documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/

## Issues Found
- The post's default Flux apply order was inaccurate. Flux's current built-in `ReconcileOrder` places CRDs before Namespaces, includes several cluster-level classes, does not list DaemonSets, Jobs, Ingresses, or PVCs in the explicit order, and treats most custom resources as unlisted kinds sorted by group and kind. Updated the order and the reverse garbage-collection explanation to match Flux's `ssa` package.
- The post stated that Namespaces are the last resources deleted. In Flux's reverse order, CRDs are after Namespaces, so CRDs are deleted last among the explicitly ordered foundational resources. Updated the text accordingly.
- The post implied that deleting a CRD before custom resources creates unmanaged orphans. Kubernetes removes the API endpoint for the custom resource type during CRD deletion, and finalizers on remaining custom resources can block clean termination. Updated the explanation to describe the actual failure mode more accurately.
- The post described `dependsOn` as guaranteeing reverse deletion order when multiple Kustomization objects are removed together. Flux documents `dependsOn` as an apply/readiness dependency, not a deterministic cross-Kustomization deletion scheduler. Updated the cross-Kustomization and tiered-cleanup sections to recommend pruning in reverse tier order for predictable deletion.
- The resource category list included resources in positions that are not part of Flux's explicit built-in order, such as PVCs and Ingresses. Updated the list to distinguish explicitly ordered kinds from unlisted kinds.

## Review Notes
The YAML snippets use the current `kustomize.toolkit.fluxcd.io/v1` Kustomization API and valid fields. The `kubectl events --for ... --watch`, `flux reconcile kustomization`, `kubectl logs`, `jsonpath`, and JSON patch examples are syntactically valid. The finalizer removal command is technically valid but should remain a last-resort operational action because it can bypass controller cleanup.
