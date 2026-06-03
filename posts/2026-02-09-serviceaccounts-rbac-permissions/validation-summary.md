# Validation Summary: How to Use ServiceAccounts with RBAC for Fine-Grained Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings
- kubectl authorization checks
- Kubernetes audit logging

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The introduction said ServiceAccounts have no permissions without RBAC. Kubernetes grants default API discovery permissions to authenticated users when RBAC is enabled, so this was clarified.
- The RBAC resource overview understated ClusterRole and RoleBinding behavior. It now notes that ClusterRoles can define reusable permissions for namespaced resources, cluster-scoped resources, or non-resource URLs, and that RoleBindings can bind either Roles or ClusterRoles within a namespace.
- The cross-namespace section implied ClusterRoles are always the answer for any cross-namespace access. It now specifically describes the all-namespaces pattern used by the example.
- The CI/CD role mentioned rollout status but did not grant `watch` on deployments. `watch` was added because `kubectl rollout status` watches rollout progress by default.
- The troubleshooting section described API server pod logs as audit logs. It now distinguishes API server logs from Kubernetes audit logs, which are written to a configured log file or webhook backend when audit logging is enabled.

## Review Notes
The YAML examples use current `rbac.authorization.k8s.io/v1` APIs and valid RBAC fields. The `resourceNames` example correctly limits only `get` requests; future examples that use `list` or `watch` with `resourceNames` should mention the required `metadata.name` field selector.
