# Validation Summary: How Flux CD Handles Eventual Consistency in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Flux source-controller
- Flux kustomize-controller
- Flux notification-controller Receiver resources
- Kubernetes server-side apply
- Horizontal Pod Autoscaler

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux webhook Receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI documentation for `flux reconcile`: https://fluxcd.io/flux/cmd/flux_reconcile/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI documentation for `flux reconcile source`: https://fluxcd.io/flux/cmd/flux_reconcile_source/
- Kubernetes ConfigMap Pod usage documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The drift detection section overstated server-side apply field ownership by saying only fields Flux has set are tracked and corrected. Flux's default `Override` policy reconciles resources toward the desired manifests and can remove fields added by other tools unless the `Merge` policy or documented `flux-client-side-apply` field manager behavior is used. Updated the wording to distinguish HPA-managed omitted fields from fields affected by Flux's apply policy.

## Review Notes
- The Flux `Kustomization` examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields including `interval`, `dependsOn`, `sourceRef`, `path`, `prune`, `wait`, `retryInterval`, and `force`.
- The `flux reconcile source git` and `flux reconcile kustomization` commands are valid, though `flux reconcile kustomization <name> --with-source` is also available when the source and downstream Kustomization should be reconciled together.
- The webhook discussion is accurate: Flux Receiver resources should trigger source kinds, and downstream Kustomizations are then notified when source artifacts change.
