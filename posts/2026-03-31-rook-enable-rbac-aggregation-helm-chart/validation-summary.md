# Validation Summary: How to Enable RBAC and RBAC Aggregation in Rook Helm Chart

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph operator
- Ceph storage
- Kubernetes RBAC (ClusterRoles, ClusterRoleBindings, Roles, RoleBindings)
- Helm chart templating
- RBAC aggregation via label selectors
- ObjectBucketClaims (objectbucket.io API group)

## Sources Consulted
- Rook-Ceph Helm chart `values.yaml` on GitHub (https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml) — verified `rbacEnable`, `rbacAggregate.enableOBCs` keys and defaults
- Rook-Ceph Helm chart templates: `clusterrole.yaml`, `clusterrolebinding.yaml`, `serviceaccount.yaml`, `aggregate-roles.yaml` — verified template conditionals, service account name, and aggregation labels
- Kubernetes RBAC aggregation documentation (https://kubernetes.io/docs/reference/access-authn-authz/rbac/#aggregated-clusterroles)

## Issues Found
1. **Wrong Helm value for RBAC aggregation (lines 56-59)**: The post showed `rbac: pspEnabled: false` as the way to enable aggregation. This key does not exist in the Rook-Ceph Helm chart. PSP (PodSecurityPolicy) is unrelated to RBAC aggregation. Fixed to the correct value: `rbacAggregate: enableOBCs: true`.
2. **Wrong default stated for aggregation (line 57 comment)**: The post said "default: true" but `rbacAggregate.enableOBCs` defaults to `false`. Fixed the comment to "default: false".
3. **Wrong aggregation label (line 66)**: The post listed `rbac.authorization.k8s.io/aggregate-to-admin: "true"` but the chart actually uses `rbac.authorization.k8s.io/aggregate-to-view: "true"`. Fixed to `aggregate-to-view`.
4. **Overly broad aggregation description**: The post implied aggregation applies to all Rook ClusterRoles. In reality, it only creates two additional ClusterRoles (`rook-ceph-obc-view` and `rook-ceph-obc-edit`) scoped to ObjectBucketClaim resources. Clarified the description accordingly.

## Review Notes
- The `rbacEnable: true/false` top-level value is correct and properly documented.
- The service account name `rook-ceph-system` used in the `kubectl auth can-i` command is correct.
- The `helm template` commands are syntactically correct and useful.
- The `kubectl describe clusterrole rook-ceph-global` command references a valid ClusterRole name created by the chart.
