# How to Configure Tenant RBAC Roles in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, RBAC, Security

Description: Learn how to configure fine-grained RBAC roles for tenants in Flux CD to control what resources they can create and manage within their namespaces.

---

Role-Based Access Control (RBAC) is the primary mechanism for enforcing tenant isolation in a multi-tenant Flux CD environment. While the default setup uses `cluster-admin` within the tenant namespace, production environments often require more fine-grained permissions. This guide covers how to create custom RBAC roles that limit what resources a tenant's Flux reconciliation can manage.

## How RBAC Works in Flux CD Multi-Tenancy

When a Kustomization specifies a `serviceAccountName`, Flux impersonates that service account during reconciliation. The service account's permissions determine what Kubernetes resources Flux can create, update, or delete on behalf of the tenant. By crafting specific Roles and RoleBindings, you control exactly what each tenant can do.

## Step 1: Understand the Default RBAC Setup

The `flux create tenant` command creates a RoleBinding to the `cluster-admin` ClusterRole within the tenant namespace. This gives the tenant full control over all resources in their namespace.

```yaml
# Default RBAC created by flux create tenant
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

This is often too permissive for production. A tenant with cluster-admin in their namespace can create any resource type, including Roles and RoleBindings that could escalate their privileges.

## Step 2: Create a Restricted Tenant Role

Define a custom Role that limits the tenant to specific resource types.

```yaml
# tenants/team-alpha/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-reconciler
  namespace: team-alpha
rules:
  # Allow managing standard workload resources
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing core resources
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts", "pods"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing ingress resources
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing horizontal pod autoscalers
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Allow managing batch resources
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Read-only access to events for debugging
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
```

Notice that this role does not include permissions for RBAC resources (`roles`, `rolebindings`, `clusterroles`, `clusterrolebindings`), which prevents privilege escalation.

## Step 3: Bind the Custom Role

Replace the default cluster-admin binding with the custom role.

```yaml
# tenants/team-alpha/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: tenant-reconciler
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

## Step 4: Create a Reusable ClusterRole for Tenants

If all tenants share the same permission set, define a ClusterRole that can be reused across namespaces via RoleBindings.

```yaml
# platform/cluster-roles/tenant-reconciler.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-reconciler
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts", "pods"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["batch"]
    resources: ["jobs", "cronjobs"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

Then bind it per tenant namespace.

```yaml
# tenants/team-alpha/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-reconciler
  namespace: team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: tenant-reconciler
subjects:
  - kind: ServiceAccount
    name: team-alpha
    namespace: team-alpha
```

## Step 5: Create Tiered Permission Levels

Different tenants may need different permission levels. Create multiple ClusterRoles for different tiers.

```yaml
# platform/cluster-roles/tenant-basic.yaml
# Basic tier: only deployments and services
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-basic
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
# platform/cluster-roles/tenant-advanced.yaml
# Advanced tier: workloads, networking, and autoscaling
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-advanced
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Step 6: Test RBAC Permissions

Verify that the tenant service account has exactly the permissions you intended.

```bash
# Check if the tenant can create deployments (should be yes)
kubectl auth can-i create deployments \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-alpha

# Check if the tenant can create roles (should be no)
kubectl auth can-i create roles \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-alpha

# Check if the tenant can access other namespaces (should be no)
kubectl auth can-i get pods \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-beta

# List all permissions for the tenant service account
kubectl auth can-i --list \
  --as=system:serviceaccount:team-alpha:team-alpha \
  -n team-alpha
```

## Common Pitfalls

- Granting access to `roles` and `rolebindings` allows privilege escalation. Avoid this unless absolutely necessary.
- Flux needs `delete` permissions on resources when `prune: true` is set on the Kustomization. Without delete permissions, pruning will fail.
- If a tenant tries to create a resource type not covered by their RBAC, the Kustomization will show a reconciliation error. Check events with `kubectl describe kustomization -n team-alpha`.

## Summary

Custom RBAC roles in Flux CD give platform administrators fine-grained control over what resources tenants can manage. By replacing the default cluster-admin binding with tailored Roles or ClusterRoles, you can enforce the principle of least privilege. Use tiered ClusterRoles when you need to support different permission levels across tenants, and always verify permissions with `kubectl auth can-i` after making changes.
