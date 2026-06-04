# Validation Summary: How to Configure Namespace-Scoped Service Accounts with Limited Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC Roles, RoleBindings, ClusterRoles, and ClusterRoleBindings
- Projected service account tokens
- kubectl authorization checks
- Bash scripting

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Configure Service Accounts for Pods task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Projected Volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RoleBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/role-binding-v1/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors

## Issues Found
- The projected service account token example did not disable the default automatic service account token mount. I added `automountServiceAccountToken: false` to the pod template so only the explicitly projected short-lived token is mounted.
- The audit script assumed every RoleBinding references a namespaced Role. Kubernetes RoleBindings can also reference ClusterRoles while still applying only in the RoleBinding namespace, so I updated the script to read `.roleRef.kind` and fetch either the Role or ClusterRole as appropriate.
- The service account token rotation section recommended a custom controller that deleted legacy service account token Secrets. Current Kubernetes guidance recommends TokenRequest or projected tokens; projected tokens expire and are rotated automatically, while Secret-based service account tokens are legacy and not recommended. I replaced the controller example with a `kubectl create token` example for requesting a short-lived token.
- The least-privilege validation command checked `get secrets` while the Role uses `resourceNames`. To verify resource-name-scoped RBAC, the request must name the target resource. I changed the example to test `secret/database-credentials` and `secret/unrelated-secret`.

## Review Notes
The remaining Kubernetes manifests use current stable API versions and valid field names. `kubectl` is not installed in this workspace, so command behavior was verified against official Kubernetes CLI documentation rather than local command output.
