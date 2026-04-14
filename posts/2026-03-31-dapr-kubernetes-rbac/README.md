# How to Use Dapr with Kubernetes RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, RBAC, Security, Authorization

Description: Configure Kubernetes RBAC to control access to Dapr component CRDs, restrict namespace permissions, and secure the Dapr control plane service accounts.

---

## Dapr and Kubernetes RBAC

Dapr uses Kubernetes service accounts and RBAC for several purposes:
- The Dapr Operator needs permission to read/watch component CRDs cluster-wide
- Applications can use RBAC to restrict which teams can create/modify Dapr components
- Dapr mTLS handles app-to-app authentication and encryption, while Kubernetes RBAC secures the control plane

## Viewing Dapr's Built-In RBAC

```bash
# List Dapr ClusterRoles
kubectl get clusterroles | grep dapr

# Inspect the operator's permissions
kubectl describe clusterrole dapr-operator

# Check service accounts in dapr-system
kubectl get serviceaccounts -n dapr-system
```

## Restricting Who Can Create Dapr Components

Create a Role that allows developers to manage Dapr components in their namespace:

```yaml
# dapr-component-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-component-editor
  namespace: team-a
rules:
- apiGroups: ["dapr.io"]
  resources: ["components", "subscriptions", "resiliencies"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: ["dapr.io"]
  resources: ["configurations"]
  verbs: ["get", "list", "watch"]
```

```yaml
# dapr-component-rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-dapr-editors
  namespace: team-a
subjects:
- kind: Group
  name: team-a-developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: dapr-component-editor
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f dapr-component-role.yaml
kubectl apply -f dapr-component-rolebinding.yaml
```

## Read-Only Access for Dapr Resources

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dapr-viewer
rules:
- apiGroups: ["dapr.io"]
  resources: ["components", "subscriptions", "resiliencies", "configurations"]
  verbs: ["get", "list", "watch"]
```

## Restricting Secret Access for Dapr Components

Dapr components reference Kubernetes Secrets. Restrict which components can access which secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-secret-reader
  namespace: team-a
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["redis-credentials", "kafka-credentials"]
  verbs: ["get"]
```

## Service Account for Application Pods

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service-sa
  namespace: team-a
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-service-secret-access
  namespace: team-a
subjects:
- kind: ServiceAccount
  name: order-service-sa
roleRef:
  kind: Role
  name: dapr-secret-reader
  apiGroup: rbac.authorization.k8s.io
```

## Summary

Kubernetes RBAC secures access to Dapr's CRDs and the secrets referenced by components. Create namespace-scoped Roles for teams to manage their own Dapr components while restricting access to production namespaces. Use named secret access in RoleBindings to ensure components only read the secrets they need.
