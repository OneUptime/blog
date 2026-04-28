# Validation Summary: How to Manage Namespace Access Control in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Kubernetes environment management)
- Kubernetes RBAC (Role, RoleBinding, ClusterRole, ServiceAccount)
- kubectl CLI (auth can-i, get rolebindings)
- Kubernetes namespaces and multi-tenancy

## Sources Consulted
- Portainer documentation on Kubernetes access control: https://docs.portainer.io/user/kubernetes/namespaces/access
- Portainer user roles documentation: https://docs.portainer.io/admin/users/roles
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes API groups reference: https://kubernetes.io/docs/reference/using-api/api-concepts/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-can-i-em-
- Kubernetes pod subresources (pods/log, pods/exec) documentation

## Issues Found
No technical issues found.

## Review Notes
- The Portainer roles described (Environment Administrator, Standard User, Readonly User) are accurate. Portainer Business Edition has additional roles (Helpdesk, Operator) not covered, but the simplified set is appropriate for an introductory guide.
- The RBAC YAML examples are syntactically valid and use correct apiVersion (`rbac.authorization.k8s.io/v1`).
- The ServiceAccount subject correctly omits `apiGroup` (the core API group is implied), and the User subject correctly includes `apiGroup: rbac.authorization.k8s.io` — both per Kubernetes RBAC requirements.
- The verbs assigned to `pods/exec` (create) and `pods/log` (get/list/watch) align with Kubernetes' actual subresource verb semantics.
- The example ClusterRole name `portainer-namespace-user` is illustrative; Portainer's actual generated resource names may differ across versions, but the post's inline comment ("Portainer's custom ClusterRole") frames it appropriately as an example.
- All `kubectl` commands and flags (`--as`, `--namespace`, `auth can-i --list`) are valid and current.
