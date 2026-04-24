# How to Manage Namespace Access Control in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, RBAC, Access Control, DevOps

Description: Learn how to configure namespace-level access control in Portainer to give teams appropriate permissions for their Kubernetes workloads.

## Introduction

Portainer Business Edition provides RBAC-aware access control for Kubernetes namespaces. You can grant users or teams access to specific namespaces, and their effective permissions depend on the Portainer role assigned to them. This guide covers configuring namespace access control in Portainer.

## Prerequisites

- Portainer BE with Kubernetes environment
- Kubernetes RBAC enabled and working
- Namespaces created
- Teams configured in Portainer

## Access Control Model

Portainer uses a role-based model with namespace granularity:

```text
Administrator → Full access to all environments and namespaces
Environment Administrator → Full access within the assigned environment
Namespace Operator / Standard User / Read-Only User → Access to assigned namespaces based on role
Users or teams with cluster-wide roles (for example, Operator) → Cannot be assigned to individual namespaces
User assigned via team → Inherits the team's namespace access
```

## Step 1: Create Teams in Portainer

Before assigning namespace access, create teams:

1. Go to **User-related → Teams**
2. Click **Add team**
3. Create teams:

```text
Team name: backend-team     Description: Backend development team
Team name: frontend-team    Description: Frontend development team
Team name: ops-team         Description: Operations team
Team name: data-team        Description: Data engineering team
```

4. Add users to teams:
   - Click on a team
   - Click **Add** next to each user you want to include

## Step 2: Assign Namespace Access

1. In Portainer, select the Kubernetes environment
2. Click **Namespaces** in the sidebar
3. Click **Manage access** on the row for the namespace (for example, **production**)

## Step 3: Configure Team Access

Assign namespace access to teams:

```text
Namespace: production
──────────────────────────────────────
Team: ops-team        → Namespace access granted
Team: backend-team    → Namespace access granted
Team: frontend-team   → Namespace access granted where needed
Team: data-team       → No namespace access
```

Effective access depends on the Portainer role already assigned to the user or team:
- **Read-Only User** - Read-only access to entitled resources
- **Standard User** - Full control over resources created by the user or their team
- **Namespace Operator** - Operational control over all existing resources in assigned namespaces
- Cluster-wide roles such as **Operator** cannot be assigned to individual namespaces

## Step 4: Understand the Kubernetes RBAC Mapping

Portainer relies on Kubernetes RBAC, so RBAC must already be enabled and working. Portainer BE documents these built-in mappings:

```text
Standard User  → portainer-basic cluster role binding
                 + portainer-edit / portainer-view on assigned namespaces
Read-Only User → portainer-basic cluster role binding
                 + portainer-view on assigned namespaces
Operator       → portainer-operator, portainer-helpdesk
                 + portainer-view on all non-system namespaces
Helpdesk       → portainer-helpdesk
                 + portainer-view on all non-system namespaces
```

## Step 5: Create Custom RBAC for Fine-Grained Control

For more specific Kubernetes-native access control, create your own RBAC resources and bind them to a real user, group, or service account:

```yaml
# Read-only role for specific resources
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-viewer
  namespace: production
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  # No create/update/delete permissions

---
# Developer role (can deploy but not delete)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: production
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
    # No delete permission
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["services"]
    verbs: ["get", "list", "watch"]
    # Can view but not modify services

---
# Bind a role to a real Kubernetes subject
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployment-viewer-binding
  namespace: production
subjects:
  - kind: User
    name: jane
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: deployment-viewer
  apiGroup: rbac.authorization.k8s.io
```

## Step 6: Test Access Control

Verify access control works as expected. For Portainer-managed namespace access, sign in as a user from the target team and confirm that only the assigned namespaces are visible. If you created a custom Kubernetes RoleBinding in Step 5, you can also test it with `kubectl auth can-i`:

```bash
# Test the custom RoleBinding above as user jane
# (Assuming you have permission to impersonate users)
kubectl auth can-i get deployments.apps \
  --namespace=production \
  --as=jane

kubectl auth can-i delete deployments.apps \
  --namespace=production \
  --as=jane
# Should be: no for the deployment-viewer role
```

## Step 7: Configure User-Level Access (Portainer BE)

In addition to team access, you can grant direct user access:

1. From **Namespaces**, click **Manage access** for the namespace
2. Select the user in the users/teams list
3. Click **Create access**

This is useful for:
- Temporarily granting access during an incident
- Giving a consultant access to a specific namespace
- Granting access to a single Portainer user without changing team membership

## Step 8: Audit Access Configuration

In Portainer, you can also use **User-related → Roles** and the Effective access viewer to confirm what a user can access.

```bash
# View all RBAC bindings in a namespace
kubectl get rolebindings -n production

# View a specific custom binding
kubectl describe rolebinding deployment-viewer-binding -n production

# Check what a bound user can do
kubectl auth can-i --list \
  --namespace=production \
  --as=jane
```

## Conclusion

Namespace access control in Portainer BE provides a clean way to implement team-based Kubernetes multi-tenancy. Teams can only see and manage their assigned namespaces, preventing accidental changes to unrelated environments. For organizations with complex permission requirements, combine Portainer's team access with custom Kubernetes RBAC roles and bindings for fine-grained control over specific resource types.
