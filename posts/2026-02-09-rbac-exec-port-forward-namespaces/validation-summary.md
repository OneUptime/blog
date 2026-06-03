# Validation Summary: How to Configure RBAC Roles That Allow Exec

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Roles and RoleBindings
- kubectl exec
- kubectl port-forward
- kubectl auth can-i
- Kubernetes audit logs
- Kubernetes ephemeral debug containers

## Sources Consulted
- Kubernetes documentation: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes API reference: RoleBinding v1 - https://kubernetes.io/docs/reference/kubernetes-api/rbac/role-binding-v1/
- Kubernetes kubectl reference: kubectl auth can-i - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Kubernetes kubectl reference: kubectl port-forward - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Kubernetes kubectl reference: kubectl debug - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Ephemeral Containers - https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- Updated `kubectl port-forward mypod` to `kubectl port-forward pod/mypod` to match the official command form that uses a resource type/name. The Kubernetes reference notes that the resource type defaults to pod if omitted, so the original would commonly work, but the explicit form is clearer and current.
- Updated `kubectl auth can-i create pods/exec` examples to `kubectl auth can-i create pods --subresource=exec`. The current official `kubectl auth can-i` documentation shows subresource checks with the `--subresource` flag.
- Changed the audit helper comment from "List users with exec permissions" to "List roles with exec permissions" because the command lists Role and ClusterRole objects that grant `pods/exec`; it does not resolve RoleBindings to users or groups.
- Quoted the namespace variable in the shell loop to avoid word-splitting issues in the generated `kubectl auth can-i` command.
- Clarified the `kubectl debug` permissions note. Adding an ephemeral container requires `update` on `pods/ephemeralcontainers`; `create` on `pods/exec` is needed only when execing into that debug container later.

## Review Notes
The RBAC manifests use current `rbac.authorization.k8s.io/v1` APIs and valid Role/RoleBinding structure. The time-based access example correctly relies on annotations plus an external controller; Kubernetes does not enforce RoleBinding expiry annotations by itself.
