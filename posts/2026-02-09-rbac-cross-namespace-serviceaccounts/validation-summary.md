# Validation Summary: How to Use RBAC RoleBindings That Reference ServiceAccounts Across Namespaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kubernetes Namespaces
- Kubernetes NetworkPolicies
- kubectl
- jq

## Sources Consulted
- Kubernetes RBAC Authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RoleBinding API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/role-binding-v1/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- Kubernetes NetworkPolicies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The walkthrough created Roles and RoleBindings in `production`, `staging`, and `development` without first creating those namespaces. Added `kubectl create namespace` commands so the examples work in a fresh cluster.
- The audit `jq` command could mix subjects from the same RoleBinding and report incorrect subject namespace/name pairs. Rewrote it to iterate each ServiceAccount subject independently and compare it with the RoleBinding namespace.
- The NetworkPolicy example selected namespaces using `name: monitoring`, which is not a built-in namespace label. Changed it to the Kubernetes-managed `kubernetes.io/metadata.name: monitoring` label.

## Review Notes
- `kubectl` is not installed in the review environment, so kubectl command validation was performed against the official Kubernetes command reference rather than local `--help` output.
- The RBAC model described in the post is correct: a RoleBinding is namespaced, may reference a ServiceAccount from another namespace, and may bind either a Role in the same namespace or a ClusterRole scoped to the RoleBinding namespace.
