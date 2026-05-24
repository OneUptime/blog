# Validation Summary: How to Create Kubernetes RBAC Roles and Bindings with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (~> 2.25)
- Kubernetes RBAC (Role, ClusterRole, RoleBinding, ClusterRoleBinding)
- Kubernetes ServiceAccount
- kubectl auth subcommands
- HCL configuration language

## Sources Consulted
- HashiCorp Kubernetes provider docs (kubernetes_role, kubernetes_cluster_role, kubernetes_role_binding, kubernetes_cluster_role_binding, kubernetes_service_account): https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes API groups reference: https://kubernetes.io/docs/reference/using-api/
- Kubernetes user-facing roles (admin, edit, view): https://kubernetes.io/docs/reference/access-authn-authz/rbac/#user-facing-roles
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes pod subresources (log, exec, portforward) documentation

## Issues Found
No technical issues found.

Verified items:
- Provider block syntax and `hashicorp/kubernetes` source with `~> 2.25` constraint are valid.
- Resource schemas use the correct singular block names (`rule`, `role_ref`, `subject`) as required by the provider.
- `api_groups`, `resources`, `verbs`, and `resource_names` argument names are correct.
- Core API group is represented as `""`, matching Kubernetes conventions.
- API groups used (`apps`, `batch`, `networking.k8s.io`, `cert-manager.io`) and their associated resources are correct.
- Subresources `pods/log`, `pods/exec`, `pods/portforward` are valid RBAC subresource specifiers.
- RBAC verbs (`get`, `list`, `watch`, `create`, `update`, `patch`, `delete`) are valid.
- Built-in user-facing ClusterRoles `admin`, `edit`, and `view` exist and behave as described.
- `role_ref.api_group = "rbac.authorization.k8s.io"` is required and correct.
- Subject `api_group` is correctly set to `rbac.authorization.k8s.io` for `User`/`Group` and correctly omitted for `ServiceAccount` (which uses the core API group).
- `kubectl auth can-i`, `--as`, `--list`, and `system:serviceaccount:<ns>:<name>` impersonation syntax are correct.
- The pattern of binding a ClusterRole via a RoleBinding (to scope cluster-wide permissions to a single namespace) is a documented and supported RBAC pattern.
- HCL `for_each` usage with a map of objects and nested conditional expression for selecting built-in ClusterRoles is syntactically valid.

## Review Notes
- Provider version `~> 2.25` is older than the current 2.x line (latest is around 2.38 at the time of review), but the constraint is permissive (`~>`) and all referenced resources/attributes have remained stable. No changes needed.
- The cert-manager example grants `secrets` create/update at cluster scope; this is broadly correct for a cert-manager-style operator, but readers running real cert-manager should refer to the upstream cert-manager RBAC manifests for the exact, minimal permission set.
- The post correctly notes that binding ClusterRoles via RoleBindings (rather than ClusterRoleBindings) is the recommended pattern when reusing permission sets across specific namespaces.
