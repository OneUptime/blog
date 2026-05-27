# Validation Summary: How to Set Up Kubernetes RBAC with Roles and RoleBindings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings
- Kubernetes ServiceAccounts
- kubectl authorization checks
- jq for RBAC audit commands

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- Kubernetes ClusterRole API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/cluster-role-v1/
- Kubernetes RoleBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/role-binding-v1/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The introduction stated that every API request is authorized through RBAC. Kubernetes authorization is performed by the configured authorizer chain, and RBAC applies when the RBAC authorizer is enabled. Updated the sentence to say that clusters using the RBAC authorizer check API requests against RBAC policy.
- The developer Role granted `list` and `watch` on `pods/status`. The Pod status subresource supports named status operations such as get, replace, and patch, while normal Pod reads already include status information. Removed `pods/status` from the read-only pod/log rule.
- A Role comment said it allowed reading both ConfigMaps and Secrets, but the rule only granted ConfigMap access. Updated the comment to match the manifest and avoid implying Secret access.
- The namespace admin example described the built-in `admin` ClusterRole as full namespace control. Kubernetes documents it as broad admin access to most namespaced resources, with exceptions such as write access to ResourceQuota and the Namespace object itself. Updated the wording to avoid overstating its scope.

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI command syntax was verified against the official generated kubectl reference instead of local `kubectl --help` output.
- The CI/CD example uses `resourceNames` with `list`. This is valid RBAC syntax, but Kubernetes requires list or watch requests restricted by `resourceNames` to include a matching `metadata.name` field selector.
