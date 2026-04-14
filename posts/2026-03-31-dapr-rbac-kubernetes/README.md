# How to Use RBAC with Dapr on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, RBAC, Security, Authorization

Description: Learn how to configure Kubernetes RBAC roles for Dapr components, secrets, and configurations to enforce least-privilege access for workloads and operators.

---

## Overview

Kubernetes Role-Based Access Control (RBAC) governs who can create, read, update, and delete Dapr custom resources such as `Components`, `Configurations`, and `Subscriptions`. Properly scoped RBAC prevents application developers from accidentally or maliciously modifying shared infrastructure components or reading secrets they should not access.

## Dapr Custom Resource Definitions

Dapr registers several CRDs in Kubernetes. These are the resources you need to manage with RBAC:

- `components.dapr.io`
- `configurations.dapr.io`
- `subscriptions.dapr.io`
- `resiliencies.dapr.io`
- `httpendpoints.dapr.io`

## Read-Only Role for Developers

Allow developers to view components and configurations without modifying them:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-developer-viewer
  namespace: default
rules:
- apiGroups: ["dapr.io"]
  resources: ["components", "configurations", "subscriptions"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dapr-developer-viewer-binding
  namespace: default
subjects:
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: dapr-developer-viewer
  apiGroup: rbac.authorization.k8s.io
```

## Admin Role for Platform Engineers

Allow platform engineers to manage all Dapr resources in a namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-admin
  namespace: default
rules:
- apiGroups: ["dapr.io"]
  resources: ["components", "configurations", "subscriptions", "resiliencies", "httpendpoints"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
```

## Restricting Secret Access

Dapr reads Kubernetes secrets to resolve `secretKeyRef` values in components. Limit which secrets the Dapr service account can read:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-secret-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["redis-password", "db-credentials"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dapr-secret-reader-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: dapr-operator
  namespace: dapr-system
roleRef:
  kind: Role
  name: dapr-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Auditing RBAC Decisions

Enable Kubernetes API audit logging to record all access to Dapr resources:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  resources:
  - group: "dapr.io"
    resources: ["components", "configurations"]
```

Check who has access to Dapr CRDs:

```bash
kubectl auth can-i list components.dapr.io --as=developer1 -n default
kubectl auth can-i create components.dapr.io --as=developer1 -n default
```

## Using ClusterRoles for Multi-Namespace Access

If platform engineers manage Dapr across all namespaces, use a `ClusterRole`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dapr-cluster-admin
rules:
- apiGroups: ["dapr.io"]
  resources: ["*"]
  verbs: ["*"]
```

Bind this role only to trusted service accounts.

## Summary

Kubernetes RBAC for Dapr resources follows the same patterns as any other CRD. Granting read-only access to developers, write access to platform engineers, and tightly scoped secret access to Dapr service accounts ensures that your Dapr infrastructure is managed safely and changes are traceable through Kubernetes audit logs.
