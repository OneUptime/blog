# How to Configure HelmRelease Service Account in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Service Accounts, RBAC, Security

Description: Learn how to configure a custom service account for Helm operations in a Flux CD HelmRelease to enforce least-privilege access control.

---

## Introduction

By default, the Flux helm-controller uses its own service account to perform Helm operations across all namespaces. The `spec.serviceAccountName` field in a HelmRelease allows you to specify a different service account that Helm should impersonate when installing, upgrading, or uninstalling releases. This enables namespace-scoped RBAC policies and least-privilege access control for Helm operations.

## The spec.serviceAccountName Field

The `spec.serviceAccountName` field tells the helm-controller to impersonate the specified service account when performing Helm operations for this release.

```yaml
# helmrelease.yaml - HelmRelease with custom service account
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: apps
spec:
  interval: 10m
  # Impersonate this service account for Helm operations
  serviceAccountName: helm-deployer
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  values:
    replicaCount: 2
```

When `serviceAccountName` is set, the helm-controller impersonates this service account. The Helm operation can only create, modify, or delete resources that the impersonated service account has permission to access.

## Why Use a Custom Service Account

Without `serviceAccountName`, the helm-controller uses its own service account, which typically has broad cluster-wide permissions. This means any HelmRelease can create resources in any namespace and manage any resource type.

Using a custom service account provides:

1. **Namespace isolation** -- Restrict what a HelmRelease can deploy to specific namespaces
2. **Resource type restrictions** -- Limit which Kubernetes resource types a release can create
3. **Multi-tenant clusters** -- Give each team their own service account with scoped permissions
4. **Audit trail** -- Track which service account performed each operation

## Creating the Service Account and RBAC

First, create the service account and bind it to a Role with the appropriate permissions.

```yaml
# serviceaccount.yaml - Service account for Helm operations
apiVersion: v1
kind: ServiceAccount
metadata:
  name: helm-deployer
  namespace: apps
---
# role.yaml - Permissions for the Helm deployer
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: helm-deployer
  namespace: apps
rules:
  # Permissions to manage application resources
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "pods", "serviceaccounts"]
    verbs: ["*"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["*"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["*"]
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["*"]
  - apiGroups: ["policy"]
    resources: ["poddisruptionbudgets"]
    verbs: ["*"]
  # Helm stores release metadata in Secrets
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["*"]
---
# rolebinding.yaml - Bind the role to the service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: helm-deployer
  namespace: apps
subjects:
  - kind: ServiceAccount
    name: helm-deployer
    namespace: apps
roleRef:
  kind: Role
  name: helm-deployer
  apiGroup: rbac.authorization.k8s.io
```

## Cluster-Scoped Resources

If your Helm chart creates cluster-scoped resources (like ClusterRoles, ClusterRoleBindings, or CRDs), you need a ClusterRole and ClusterRoleBinding instead of namespace-scoped ones.

```yaml
# clusterrole.yaml - Cluster-scoped permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: helm-deployer-cluster
rules:
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["clusterroles", "clusterrolebindings"]
    verbs: ["*"]
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: helm-deployer-cluster
subjects:
  - kind: ServiceAccount
    name: helm-deployer
    namespace: apps
roleRef:
  kind: ClusterRole
  name: helm-deployer-cluster
  apiGroup: rbac.authorization.k8s.io
```

## Multi-Tenant Configuration

In a multi-tenant cluster, each team gets their own service account with permissions scoped to their namespace.

```yaml
# team-a-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: team-a-app
  namespace: team-a
spec:
  interval: 10m
  serviceAccountName: team-a-deployer
  chart:
    spec:
      chart: web-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  values:
    replicaCount: 2
---
# team-b-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: team-b-app
  namespace: team-b
spec:
  interval: 10m
  serviceAccountName: team-b-deployer
  chart:
    spec:
      chart: api-service
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  values:
    replicaCount: 3
```

## Helm Controller Impersonation

For the helm-controller to impersonate a service account, it must have impersonation permissions. This is typically configured when installing Flux. The helm-controller needs the following ClusterRole permissions:

```yaml
# This is usually part of the Flux installation; shown for reference
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-helm-controller-impersonation
rules:
  - apiGroups: [""]
    resources: ["serviceaccounts"]
    verbs: ["impersonate"]
```

## Debugging Permission Issues

When a HelmRelease fails due to insufficient permissions on the impersonated service account, the error appears in the HelmRelease conditions.

```bash
# Check HelmRelease status for RBAC errors
flux get helmrelease my-app -n apps

# View detailed conditions
kubectl describe helmrelease my-app -n apps

# Test permissions with kubectl auth can-i
kubectl auth can-i create deployments --as=system:serviceaccount:apps:helm-deployer -n apps

# Check helm-controller logs
kubectl logs -n flux-system -l app=helm-controller --tail=100 | grep my-app
```

Common error messages include `is forbidden: User "system:serviceaccount:apps:helm-deployer" cannot create resource` which indicates missing RBAC rules.

## Summary

The `spec.serviceAccountName` field in a Flux CD HelmRelease enables least-privilege access control for Helm operations by making the helm-controller impersonate a specified service account. Create namespace-scoped Roles for applications that only deploy within their namespace, and ClusterRoles for charts that create cluster-wide resources. This approach is essential for multi-tenant clusters where each team should only have permissions to manage resources in their own namespace.
