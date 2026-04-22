# Validation Summary: How to Segment Environments with Namespace Access in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Kubernetes namespace access control
- Kubernetes namespaces
- Kubernetes RBAC (`RoleBinding`, `ClusterRole`, groups, impersonation)
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- `kubectl` CLI

## Sources Consulted
- Portainer official documentation: Manage access to a namespace — https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer official documentation: Kubernetes cluster setup — https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer official documentation: Kubernetes roles and bindings — https://docs.portainer.io/sts/advanced/kubernetes-roles-and-bindings
- Kubernetes official documentation: Network Policies — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes official documentation: Resource Quotas — https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes official documentation: RBAC Authorization — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes official documentation: User Impersonation — https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- Kubernetes official documentation: `kubectl create namespace` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Kubernetes official documentation: `kubectl label` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes official documentation: `kubectl auth can-i` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
1. **Portainer namespace access flow referenced a non-current "Namespace access mode"**: The post described a **Cluster > Setup** security option with **Shared access** and **Isolated access** choices. Current Portainer documentation manages namespace access from **Namespaces > Manage access** and notes that Kubernetes RBAC must be enabled and working. **Fix:** Replaced the mode-based steps with the documented namespace access flow.
2. **Namespace assignment steps did not match the documented Portainer UI flow**: The post said to click into a namespace and add teams or users with roles. Portainer documents using **Manage access** on the same row as the namespace, selecting users/teams, and clicking **Create access**. **Fix:** Updated the steps to match the documented flow.
3. **NetworkPolicy enforcement caveat was missing**: Kubernetes NetworkPolicy objects have no effect unless a network plugin implements NetworkPolicy. **Fix:** Added the requirement for a network plugin that supports NetworkPolicy enforcement.
4. **RBAC example implied Portainer teams map directly to Kubernetes groups**: A Kubernetes `Group` subject depends on the cluster authentication provider, not a generic Portainer team mapping. **Fix:** Changed the comment to identify `frontend-team` as a Kubernetes auth group from the identity provider.
5. **`kubectl auth can-i` checks omitted the impersonated group**: The RoleBinding grants access to a `Group`, but the verification commands only impersonated a user. Without `--as-group=frontend-team`, the positive namespace check would not validate the group binding. **Fix:** Added `--as-group=frontend-team` to both verification commands.

## Review Notes
- The `kubectl create namespace` and `kubectl label namespace` commands are valid.
- The `networking.k8s.io/v1` NetworkPolicy manifests use current API fields and the default-deny pattern is consistent with Kubernetes documentation.
- The ResourceQuota fields (`requests.cpu`, `requests.memory`, `limits.cpu`, `limits.memory`, `pods`, and `services.loadbalancers`) are valid quota resources.
- The RBAC `RoleBinding` to the built-in `edit` ClusterRole is syntactically valid; in production, consider whether Portainer-managed access policies or direct Kubernetes RBAC should be the source of truth to avoid drift.
