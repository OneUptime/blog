# Validation Summary: How to Set Up Multi-Tenant RBAC on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes RBAC
- Kubernetes namespaces
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- kubectl
- jq

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes multi-tenancy documentation: https://kubernetes.io/docs/concepts/security/multi-tenancy/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy task guide: https://kubernetes.io/docs/tasks/administer-cluster/declare-network-policy/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Talos Linux / Sidero documentation: https://docs.siderolabs.com/talos/

## Issues Found
- The read-only viewer Role used `resources: ["*"]` across the core API group, which granted read access to Secrets. Kubernetes RBAC is additive and has no deny or exclude rule, so the later comment did not remove Secret access. I replaced the wildcard with explicit non-secret resources.
- The cluster-scoped access example used `resourceNames: []` with a comment saying it would be set per tenant via binding. Kubernetes bindings cannot set `resourceNames`; that restriction belongs in the Role or ClusterRole rule. I changed the example to a per-tenant ClusterRole with `resourceNames: ["team-frontend"]` and added a matching ClusterRoleBinding.
- The post stated that NetworkPolicies prevent cross-tenant traffic without noting the CNI requirement. Kubernetes NetworkPolicy objects only affect traffic when the cluster uses a network plugin that enforces them. I added that caveat and included TCP 53 along with UDP 53 for DNS egress.
- The intro claimed the guide covered both soft and hard multi-tenancy. Namespace-scoped RBAC, quotas, and NetworkPolicies are useful building blocks, but hard multi-tenancy usually requires additional data-plane and/or control-plane isolation. I adjusted the claim to describe the guide as namespace-scoped controls for soft multi-tenancy and one layer in harder isolation designs.

## Review Notes
The standalone fenced YAML snippets parse successfully. `kubectl` was not installed in the local workspace, so CLI behavior was checked against official Kubernetes command references rather than local execution.
