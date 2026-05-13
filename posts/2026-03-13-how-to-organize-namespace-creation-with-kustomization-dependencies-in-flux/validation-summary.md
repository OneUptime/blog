# Validation Summary: How to Organize Namespace Creation with Kustomization Dependencies in Flux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux Kustomization custom resources
- Flux CLI
- Kubernetes namespaces
- Kubernetes ResourceQuota and LimitRange
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Admission namespace labels
- Kustomize kustomization files

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `get kustomizations` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Standards namespace labels documentation: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes well-known labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes `kubectl get` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The verification examples used `flux get kustomization`, but the current Flux CLI documentation lists the get command as `flux get kustomizations`. Updated both examples to use the documented plural subcommand.
- The `kubectl get namespaces -l purpose=application` comment said it listed all namespaces managed by Flux. The command only filters namespaces by label, so the comment now says it lists application namespaces.
- The per-resource Flux prune annotation was written as `flux.kustomize.toolkit.fluxcd.io/prune`. The official annotation key is `kustomize.toolkit.fluxcd.io/prune`, so the snippet was corrected.

## Review Notes
The Kubernetes namespace, ResourceQuota, LimitRange, NetworkPolicy, Pod Security label, and Flux Kustomization examples are otherwise consistent with current official documentation. The `scheduler.alpha.kubernetes.io/node-selector` annotation is listed in the Kubernetes well-known annotations reference, but it only has scheduling effect when the relevant admission plugin is enabled.
