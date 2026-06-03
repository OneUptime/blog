# Validation Summary: How to Troubleshoot Kubernetes RBAC Permission Denied Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- kubectl authorization checks
- Kubernetes audit policy
- jq filtering for Kubernetes JSON output

## Sources Consulted
- Kubernetes RBAC Authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/

## Issues Found
- The commands for finding role bindings matched only `subjects[].name`, which could return users, groups, or service accounts from other namespaces with the same name. Updated the jq filters to match `kind: ServiceAccount` and the expected namespace.
- The command labeled "List built-in ClusterRoles" only listed `system:` prefixed roles and missed user-facing default roles such as `cluster-admin`, `admin`, `edit`, and `view`. Updated it to list default ClusterRoles using the official `kubernetes.io/bootstrapping=rbac-defaults` label.
- The built-in role guidance said to bind service accounts to built-in roles instead of creating custom roles. Updated it to recommend built-in roles only when they match the access requirements.
- The `resourceNames` example granted `list` on named ConfigMaps, which can be misleading because name-scoped access is intended for direct object requests such as `get`; collection requests need a matching field selector. Updated the example to use `get` for the named ConfigMaps.
- The escalation prevention section said only cluster-admin users can grant cluster-admin permissions. Kubernetes also allows users with the required referenced permissions or explicit `bind` permission to create such bindings. Updated the sentence accordingly.

## Review Notes
The RBAC API versions, Role and ClusterRole examples, RoleBinding and ClusterRoleBinding shapes, `kubectl auth can-i` usage, aggregation rule structure, custom resource permissions, wildcard syntax, and audit policy format were checked against current Kubernetes documentation and are technically valid.
