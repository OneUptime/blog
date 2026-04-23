# Validation Summary: How to Set Up Multi-Tenant SaaS Platform on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- NetworkPolicy
- ResourceQuota
- LimitRange
- Ingress
- RBAC
- ServiceAccounts
- `kubectl`
- Python
- cert-manager

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range
- Kubernetes Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service Accounts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes service account administration: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- `kubectl create token` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/api/workflows/projects
- Rancher Project Resource Quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- Rancher v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide

## Issues Found
- The NetworkPolicy example selected `app.kubernetes.io/name: ingress-nginx` as a namespace label. `namespaceSelector` matches namespace labels, not pod labels, so I changed it to target the ingress namespace via the standard `kubernetes.io/metadata.name` label and the ingress controller pods via `podSelector`. I also added TCP port 53 because DNS may use both UDP and TCP.
- The Python provisioning example called `_apply_network_policies`, `_create_service_account`, and `_generate_kubeconfig` without defining them, so the snippet would not run as shown. I added those methods, factored manifest application into a helper, and used `kubectl create token` for current service account token generation.
- The ingress manifest in the Python example did not set `spec.ingressClassName`, which makes controller selection depend on cluster defaults. I added `ingressClassName: nginx` to match the guide's nginx ingress controller example.
- The Rancher project example used an older `/v3/projects` curl pattern. I replaced it with the current `management.cattle.io/v3` `Project` manifest pattern documented by Rancher, including `resourceQuota`, `namespaceDefaultResourceQuota`, and `containerDefaultResourceLimit`.
- The conclusion stated that NetworkPolicies prevent cross-tenant traffic without noting the enforcement dependency. I clarified that this requires a compatible CNI/network plugin that enforces NetworkPolicy.

## Review Notes
- The updated service account kubeconfig example returns a time-bounded token created with `kubectl create token`. That matches current Kubernetes guidance better than relying on auto-created long-lived Secret tokens, but operators should account for token rotation if they hand these kubeconfigs to external systems.
- Rancher's previous `/v3` API is still available, but Rancher documentation since v2.8 also documents the Rancher Kubernetes API path using `management.cattle.io/v3`, which is the more current pattern for project management.
