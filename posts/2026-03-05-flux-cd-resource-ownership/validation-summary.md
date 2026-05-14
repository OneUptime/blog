# Validation Summary: How Flux CD Manages Kubernetes Resource Ownership

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD Kustomize Controller
- Kubernetes Server-Side Apply
- Kubernetes managed fields and field managers
- Flux Kustomization resources
- Flux pruning and inventory tracking
- Horizontal Pod Autoscaler and KEDA coexistence

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize Controller options: https://fluxcd.io/flux/components/kustomize/options/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Flux Kustomization API source: https://github.com/fluxcd/kustomize-controller/blob/main/api/v1/kustomization_types.go
- Flux Kustomize Controller inventory source: https://github.com/fluxcd/kustomize-controller/blob/main/internal/inventory/inventory.go
- Flux Kustomize Controller reconciliation source: https://github.com/fluxcd/kustomize-controller/blob/main/internal/controller/kustomization_controller.go

## Issues Found
- `kubectl get ... -o yaml` was shown as if it displays `managedFields` by default. Kubernetes hides managed fields by default, so the post now adds the correct `--show-managed-fields` command.
- The post stated that each manager can only modify fields it owns. This was narrowed to server-side apply behavior: apply operations conflict when changing fields owned by another apply manager unless ownership is transferred or forced.
- The drift-detection explanation implied Flux always ignores fields it does not manage. Flux's default SSA `Override` policy reconciles desired fields from Git and can revert manual edits; the post now mentions the `Merge` SSA policy for preserving non-overlapping fields.
- The inventory location was incorrectly described as an annotation. Flux stores inventory in `.status.inventory`, so the text and example command were corrected.
- The inventory command used `jsonpath` piped to `jq`, which is less reliable for structured JSON. It now uses `-o json | jq '.status.inventory.entries'`.
- The `spec.force` section incorrectly described `force: true` as SSA conflict ownership takeover. Flux documents `spec.force` as recreating resources when patching fails due to immutable field changes, so the section now separates SSA policy from `spec.force`.
- The labels section overstated label-based garbage collection. It now explains that Flux uses inventory to find stale resources and owner labels to scope deletion.

## Review Notes
The HPA guidance to omit `spec.replicas` from Flux-managed Deployment manifests is correct, but Kubernetes documents a temporary defaulting/race caveat when transferring ownership of `replicas` to HPA on an already-running workload.
