# Validation Summary: How to Fix 'conflict' Error When Multiple Kustomizations Manage Same Resource

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD Kustomizations
- Kubernetes server-side apply
- Kubernetes managedFields and field managers
- kubectl apply
- HorizontalPodAutoscaler
- Kustomize overlays

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation for `flux tree kustomization`: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux kustomize-controller source code: https://github.com/fluxcd/kustomize-controller
- Kubernetes server-side apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes `kubectl apply` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- The post incorrectly stated that Flux sets the server-side apply field manager to the Kustomization name. Updated this to say Flux-managed objects are typically applied by the kustomize-controller field manager, `kustomize-controller`.
- The example conflict message incorrectly implied conflicts between two Kustomization names. Updated it to show a conflict with another field manager, such as an HPA-related manager.
- The post incorrectly recommended `.spec.force: true` for server-side apply ownership conflicts. Updated this section to explain that `.spec.force` is for recreating resources when immutable field changes cannot be patched, not for resolving SSA ownership conflicts.
- The kubectl ownership section incorrectly said `kubectl apply` always uses `kubectl` as the field manager. Updated it to distinguish `kubectl-client-side-apply` for client-side apply from `kubectl` for server-side apply.
- The Flux field manager transfer command used `--field-manager=flux-system/my-app`, which is not the Flux kustomize-controller field manager. Updated it to `--field-manager=kustomize-controller`.
- The SSA annotation section incorrectly described `IfNotPresent` as applying only fields that do not already exist. Updated it to describe the resource-level behavior: Flux applies the resource only if it is not already present.
- The SSA options section incorrectly described `Merge` as the default. Added `Override` as the default and clarified what `Merge` preserves.
- The debugging workflow used `flux tree kustomization --all`, but the official command requires a Kustomization name and does not document an `--all` flag. Updated the example to `flux tree kustomization my-app -n flux-system`.

## Review Notes
The HPA guidance to remove `spec.replicas` from Deployment manifests when using HPA is consistent with Kubernetes documentation, with the caveat that removing `spec.replicas` can cause a one-time scale change if ownership is not transferred carefully.
