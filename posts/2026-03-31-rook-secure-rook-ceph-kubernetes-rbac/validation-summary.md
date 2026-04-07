# Validation Summary: How to Secure Rook-Ceph with Kubernetes RBAC

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (storage orchestrator for Kubernetes)
- Kubernetes RBAC (Roles, ClusterRoles, RoleBindings, ClusterRoleBindings)
- Kubernetes NetworkPolicy
- Kubernetes ServiceAccounts
- Ceph CSI driver

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#networkpolicy-v1-networking-k8s-io
- Rook-Ceph RBAC documentation: https://rook.io/docs/rook/latest/Getting-Started/quickstart/#rbac
- Rook-Ceph Security documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/#security
- Rook CRD API reference for `ceph.rook.io` API group

## Issues Found
1. **Wrong apiVersion for NetworkPolicy (lines 91-108)**: The YAML snippet in the "Preventing Access to Rook Secrets" section used `apiVersion: rbac.authorization.k8s.io/v1` with `kind: NetworkPolicy`. NetworkPolicy is part of the `networking.k8s.io/v1` API group, not `rbac.authorization.k8s.io/v1`. This would cause a Kubernetes API error on apply.

2. **Conceptual mismatch: NetworkPolicy presented as secret access restriction**: The section was titled "Preventing Access to Rook Secrets" but the example was a NetworkPolicy, which controls network traffic between pods — it does not restrict API-level access to Kubernetes Secret resources. RBAC Roles/RoleBindings are the correct mechanism for restricting access to Secrets. Replaced the example with a proper RBAC Role/RoleBinding that restricts secret access, and moved the NetworkPolicy to a separate paragraph with corrected apiVersion and clarified purpose.

## Review Notes
- The `rook-ceph-system` service account name used in the fix is illustrative; actual Rook deployments may use `rook-ceph-operator-service-account` or similar depending on the Helm chart values or operator version. The pattern is correct.
- The ClusterRole name `rook-ceph-global` referenced in the post is valid for standard Rook deployments but may vary if using Helm with custom values.
- The `ceph.rook.io` API group and CRD resource names (`cephclusters`, `cephpools`, `cephfilesystems`, `cephobjectstores`) in the viewer ClusterRole are correct.
