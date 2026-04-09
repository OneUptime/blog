# How to Enable RBAC and RBAC Aggregation in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, RBAC, Authorization

Description: Control RBAC and RBAC aggregation settings in the Rook-Ceph Helm chart to integrate with existing cluster authorization policies.

---

## Overview

The Rook-Ceph operator requires broad RBAC permissions to manage Ceph cluster resources. The Helm chart creates these automatically, but you can tune whether RBAC resources are created and whether ClusterRole aggregation is used.

## Default RBAC Behavior

By default, the chart creates all necessary ClusterRoles, ClusterRoleBindings, Roles, and RoleBindings. These grant the operator service account permissions to manage pods, PVCs, secrets, and CRDs across the cluster.

Check what RBAC resources the chart creates:

```bash
helm template rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph | \
  grep "^kind:" | sort | uniq -c
```

## Enabling RBAC (Default)

RBAC is enabled by default. To be explicit:

```yaml
rbacEnable: true
```

## Disabling RBAC Chart Creation

If your organization manages RBAC outside of Helm charts, disable chart-managed RBAC:

```yaml
rbacEnable: false
```

When disabled, you must manually create the required ClusterRoles before the operator can function. Extract the template to use as a base:

```bash
helm template rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --set rbacEnable=true | \
  grep -A50 "ClusterRole" > rook-rbac-base.yaml
```

## RBAC Aggregation

RBAC aggregation allows Rook ObjectBucketClaim roles to be composed with built-in cluster roles using label selectors. This is useful when admins want to grant users permissions to manage ObjectBucketClaims without creating new ClusterRoles:

```yaml
# Enable OBC aggregation (default: false)
rbacAggregate:
  enableOBCs: true
```

With aggregation enabled, the chart creates two additional ClusterRoles with aggregation labels:

```yaml
labels:
  rbac.authorization.k8s.io/aggregate-to-view: "true"
  rbac.authorization.k8s.io/aggregate-to-edit: "true"
```

These labels cause Kubernetes to automatically merge ObjectBucketClaim permissions into the built-in `view` and `edit` ClusterRoles.

## Viewing Created RBAC Resources

After installation, list all Rook-related ClusterRoles:

```bash
kubectl get clusterrole | grep rook
```

Inspect the permissions of the operator role:

```bash
kubectl describe clusterrole rook-ceph-global
```

## Auditing Operator Permissions

To see effective permissions of the Rook operator service account:

```bash
kubectl auth can-i --list \
  --as=system:serviceaccount:rook-ceph:rook-ceph-system \
  -n rook-ceph
```

This lists all allowed verbs and resources, which helps during security reviews.

## Summary

The Rook-Ceph Helm chart manages all required RBAC resources automatically with `rbacEnable: true`. For organizations with centralized RBAC management, disabling this and creating roles manually is supported. RBAC aggregation simplifies permission inheritance by allowing Rook roles to compose with built-in Kubernetes roles via label selectors.
