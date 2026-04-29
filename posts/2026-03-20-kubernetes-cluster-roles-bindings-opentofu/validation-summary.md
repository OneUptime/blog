# Validation Summary: How to Create Kubernetes Cluster Roles and Bindings with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes `Role`, `ClusterRole`, `RoleBinding`, and `ClusterRoleBinding`
- OpenTofu / HCL
- HashiCorp Kubernetes provider resources

## Sources Consulted
- Kubernetes RBAC Authorization reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes PKI certificates and requirements: https://kubernetes.io/docs/setup/best-practices/certificates/
- HashiCorp Kubernetes provider `kubernetes_cluster_role_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/cluster_role_v1.md
- HashiCorp Kubernetes provider `kubernetes_cluster_role_binding_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/cluster_role_binding_v1.md
- HashiCorp Kubernetes provider `kubernetes_role_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/role_v1.md
- HashiCorp Kubernetes provider `kubernetes_role_binding_v1` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/role_binding_v1.md

## Issues Found

1. **The overview overstated what a ClusterRole does.** The original text said ClusterRoles grant permissions across all namespaces, which is incomplete. A ClusterRole is cluster-scoped, but the effective scope depends on how it is bound: a `RoleBinding` can scope a `ClusterRole` to one namespace, while a `ClusterRoleBinding` grants it cluster-wide. Updated the overview to reflect the official Kubernetes RBAC model.

2. **The ConfigMap comment implied cluster-wide access from the ClusterRole definition alone.** The comment said the rule allowed managing ConfigMaps in all namespaces. That only becomes true when the ClusterRole is bound cluster-wide. Updated the comment to remove the inaccurate scope claim.

3. **The group example used `system:masters` as if it were a normal external identity-provider group.** `system:` is reserved for Kubernetes system use, and `system:masters` is the default superuser group associated with `cluster-admin`. Replaced it with `devops-team` so the example matches a realistic OIDC/LDAP-backed group without using a reserved system identity.

## Review Notes
- The `cluster-admin` binding example is technically valid, but it grants full administrative access. For least-privilege guidance, a narrower ClusterRole would be safer in a future revision.
- The wildcard rule for `myapp.example.com` resources and verbs is technically valid, but broad. It works as written; it is simply more permissive than many production RBAC policies.
