# Validation Summary: How to Structure a Repo per Team for Flux CD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota and LimitRange
- Kubernetes ExternalName Services
- Bash scripting

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The RBAC example said cluster-scoped resources were explicitly denied. Kubernetes RBAC permissions are additive and do not support deny rules, so the comment was changed to say that no cluster-scoped permissions are granted.
- The Flux Kustomization example described `targetNamespace` as allowing only resources in the team's namespace. Flux uses `targetNamespace` to set or override the namespace on namespaced resources; RBAC via `serviceAccountName` is the enforcement mechanism. The comment was corrected.
- The tenant `kustomization.yaml` did not include the resource quota or network policy manifests shown later in the guide. These files were added to the resources list so the platform tenant definition actually applies them.
- The NetworkPolicy example used `namespaceSelector` for "within the namespace" traffic, which selects namespaces rather than pods in the policy's own namespace. It now uses `podSelector: {}` for same-namespace ingress and egress.
- The DNS egress rule allowed UDP 53 to every namespace. It was narrowed to typical CoreDNS pods in `kube-system` and now includes both UDP and TCP port 53.

## Review Notes
The CoreDNS selector `k8s-app: kube-dns` is common, but DNS pod labels can vary by cluster distribution. Platform teams should adjust that selector to match their installed DNS add-on.
