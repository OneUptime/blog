# How to Use Kustomization with Cluster-Scoped Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Cluster-Scoped, RBAC, CRDs, Namespaces

Description: Learn how to manage cluster-scoped Kubernetes resources like ClusterRoles, Namespaces, and CRDs using Flux Kustomizations.

---

While most Kubernetes resources live within a namespace, certain critical resources are cluster-scoped -- they exist at the cluster level and are not confined to any single namespace. Resources like Namespaces, ClusterRoles, ClusterRoleBindings, CustomResourceDefinitions, StorageClasses, and PersistentVolumes all fall into this category. Managing them with Flux requires understanding how Kustomizations interact with cluster-scoped resources and what permissions are needed. This guide covers the patterns and best practices for managing these resources through GitOps.

## Cluster-Scoped vs Namespaced Resources

Before diving into Flux configuration, here is a quick reference of common cluster-scoped resource types.

| Resource Type | Scoped | Common Use |
|---|---|---|
| Namespace | Cluster | Tenant isolation, environment separation |
| ClusterRole | Cluster | Cluster-wide RBAC permissions |
| ClusterRoleBinding | Cluster | Binding ClusterRoles to subjects |
| CustomResourceDefinition | Cluster | Extending the Kubernetes API |
| StorageClass | Cluster | Defining storage provisioners |
| PersistentVolume | Cluster | Cluster-level storage |
| IngressClass | Cluster | Ingress controller configuration |
| PriorityClass | Cluster | Pod scheduling priority |

## Basic Kustomization for Cluster-Scoped Resources

A Kustomization that manages cluster-scoped resources looks similar to one managing namespaced resources, but with a few important differences.

```yaml
# Kustomization for cluster-scoped resources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-resources
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/cluster-resources
  prune: true
  wait: true
  # Do NOT set targetNamespace -- it would incorrectly try to
  # set namespace on cluster-scoped resources
```

The key point: do not set `spec.targetNamespace` on a Kustomization that manages cluster-scoped resources. While `targetNamespace` only affects namespaced resources, it is cleaner to keep cluster-scoped and namespaced resources in separate Kustomizations to avoid confusion.

## Managing Namespaces

Namespaces are one of the most common cluster-scoped resources to manage with Flux. Here is a typical structure.

```yaml
# clusters/production/cluster-resources/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    team: platform
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
    team: platform
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    environment: shared
    team: sre
```

Be cautious with `prune: true` when managing Namespaces. If a Namespace is accidentally removed from Git and pruning is enabled, Flux will delete the Namespace and all resources within it. Protect critical Namespaces with the prune-disabled annotation.

```yaml
# Namespace protected from accidental deletion
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    # Prevent Flux from deleting this namespace if removed from Git
    kustomize.toolkit.fluxcd.io/prune: disabled
  labels:
    environment: production
```

## Managing CRDs

CustomResourceDefinitions are another critical cluster-scoped resource. It is best practice to manage CRDs in a dedicated Kustomization that other Kustomizations depend on.

```yaml
# Kustomization for CRDs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/crds
  prune: true
  wait: true
  timeout: 5m
---
# Operators that depend on CRDs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: operators
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/operators
  prune: true
  dependsOn:
    - name: crds
```

Your CRD directory might contain CRDs installed from external sources.

```yaml
# clusters/production/crds/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # CRDs fetched from upstream projects
  - cert-manager-crds.yaml
  - prometheus-operator-crds.yaml
  - external-secrets-crds.yaml
```

## Managing RBAC Resources

ClusterRoles and ClusterRoleBindings define cluster-wide permissions. Manage them in a dedicated Kustomization for clear ownership and auditability.

```yaml
# clusters/production/cluster-resources/rbac/cluster-roles.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-reader
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dev-team-namespace-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: namespace-reader
subjects:
  - kind: Group
    name: dev-team
    apiGroup: rbac.authorization.k8s.io
```

## Managing StorageClasses and PersistentVolumes

Storage resources are cluster-scoped and typically set up early in the cluster lifecycle.

```yaml
# clusters/production/cluster-resources/storage/storage-classes.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
```

## Mixing Cluster-Scoped and Namespaced Resources

Sometimes a Kustomization needs to manage both cluster-scoped and namespaced resources -- for example, a ClusterRole and a RoleBinding that references it. This works fine as long as you do not use `targetNamespace`.

```yaml
# Kustomization managing both scopes
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-rbac
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/monitoring/rbac
  prune: true
  # No targetNamespace -- cluster-scoped resources must not have one set
```

```yaml
# infrastructure/monitoring/rbac/rbac.yaml
# Cluster-scoped: ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-reader
rules:
  - apiGroups: [""]
    resources: ["nodes", "nodes/metrics", "services", "endpoints", "pods"]
    verbs: ["get", "list", "watch"]
---
# Namespaced: ClusterRoleBinding references the ClusterRole
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus-reader-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus-reader
subjects:
  - kind: ServiceAccount
    name: prometheus
    namespace: monitoring
```

## RBAC Permissions for the Flux Controller

Managing cluster-scoped resources requires the Flux kustomize-controller to have appropriate RBAC permissions. By default, the controller has cluster-admin privileges. If you have restricted the controller's permissions (for multi-tenancy), you need to ensure it can manage the cluster-scoped resource types you need.

```yaml
# Additional ClusterRole for Flux controller to manage specific cluster resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-cluster-resources
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["rbac.authorization.k8s.io"]
    resources: ["clusterroles", "clusterrolebindings"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
```

## Recommended Repository Structure

Organize your repository to clearly separate cluster-scoped from namespaced resources.

```bash
# Recommended directory structure
clusters/
  production/
    flux-system/           # Flux bootstrap resources
    cluster-resources/     # Cluster-scoped resources
      namespaces.yaml
      storage-classes.yaml
      crds/
        kustomization.yaml
      rbac/
        kustomization.yaml
infrastructure/            # Namespaced infrastructure (operators, databases)
  cert-manager/
  monitoring/
apps/                      # Namespaced application workloads
  frontend/
  backend/
```

This structure makes it clear which Kustomization manages cluster-level resources and which manages namespaced workloads.

## Verifying Cluster-Scoped Resource Management

Use these commands to verify your cluster-scoped resources are being managed correctly.

```bash
# View all resources managed by the cluster-resources Kustomization
flux tree ks cluster-resources --namespace flux-system

# Check for any issues with cluster-scoped resources
flux events --for Kustomization/cluster-resources --namespace flux-system

# List all cluster-scoped resources with Flux labels
kubectl get clusterroles,clusterrolebindings,storageclasses,namespaces \
  -l kustomize.toolkit.fluxcd.io/name=cluster-resources
```

## Summary

Managing cluster-scoped resources with Flux requires keeping them in dedicated Kustomizations without `targetNamespace`, protecting critical resources like Namespaces with the prune-disabled annotation, and ensuring the Flux controller has appropriate RBAC permissions. Separate CRDs into their own Kustomization and use `dependsOn` to ensure they are registered before operators and custom resources are deployed. A clear repository structure that separates cluster-scoped from namespaced resources makes your GitOps setup easier to understand and maintain.
