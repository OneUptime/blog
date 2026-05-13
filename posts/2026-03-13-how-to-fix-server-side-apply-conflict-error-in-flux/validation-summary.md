# Validation Summary: How to Fix server-side apply conflict Error in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux Kustomize Controller
- Kubernetes Server-Side Apply
- Kubernetes managedFields and field managers
- kubectl
- Horizontal Pod Autoscaler

## Sources Consulted
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux reconcile kustomization command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The post incorrectly stated that Flux Kustomization `spec.force: true` force-applies SSA conflicts and takes ownership of conflicting fields. Flux documents `.spec.force` and `kustomize.toolkit.fluxcd.io/force` as resource replacement mechanisms for immutable field changes, not SSA conflict ownership. Replaced this with a one-time `kubectl apply --server-side --force-conflicts --field-manager=kustomize-controller` example.
- The field ownership transfer command omitted `--force-conflicts`, so it would not reliably take ownership when another manager already owned a conflicting field with a different value. Added `--force-conflicts` and clarified when to use it.
- The managed fields cleanup example attempted to delete a selected `managedFields` entry and pipe the object back through `kubectl apply`. Kubernetes documents clearing `managedFields` by overwriting the field with a list containing one empty entry using a non-apply write. Replaced the command with a merge patch using `{"metadata":{"managedFields":[{}]}}`.
- The post referred to a non-existent `fieldManagerPolicy` field in Flux Kustomization and showed a Kustomization snippet that did not configure any such policy. Replaced it with the documented Flux resource annotation `kustomize.toolkit.fluxcd.io/ssa: merge`, and clarified that it only preserves non-overlapping fields.
- The post claimed that multiple Flux Kustomizations managing the same resource necessarily conflict through field managers. Adjusted the wording to describe Flux ownership or reconciliation conflicts more generally and recommend a single Kustomization owner per resource.

## Review Notes
- The general explanation of Kubernetes Server-Side Apply conflicts and managed field ownership is accurate.
- The HPA guidance to omit `spec.replicas` from Flux-managed Deployment manifests is consistent with Kubernetes documentation, with the caveat that removing `spec.replicas` can cause a one-time fallback to the default replica count if not handled carefully.
- `flux reconcile kustomization my-app --with-source` is a valid Flux command for reconciling the source and then applying the Kustomization, but it only retries reconciliation; it does not by itself resolve field ownership conflicts.
