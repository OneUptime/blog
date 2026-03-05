# How to Configure HelmRelease Storage Namespace in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Storage Namespace, Release Metadata

Description: Learn how to configure the storage namespace in a Flux CD HelmRelease to control where Helm stores release metadata Secrets.

---

## Introduction

When Helm installs or upgrades a release, it stores release metadata (including the rendered manifests, chart info, and values) as Kubernetes Secrets. By default, these Secrets are stored in the same namespace as the release's target namespace. The `spec.storageNamespace` field in a Flux CD HelmRelease lets you redirect this metadata to a different namespace, which is useful for centralized release management and access control.

## The spec.storageNamespace Field

The `spec.storageNamespace` field overrides the namespace where Helm stores its release metadata Secrets.

```yaml
# helmrelease.yaml - HelmRelease with storage namespace
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: apps
  # Store Helm release metadata in a separate namespace
  storageNamespace: helm-metadata
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

In this configuration:
- The HelmRelease custom resource lives in `flux-system`
- Application resources (Deployments, Services, etc.) are deployed to `apps`
- Helm release Secrets (metadata) are stored in `helm-metadata`

## Default Behavior

When `spec.storageNamespace` is not set, Helm stores release Secrets in the target namespace. The target namespace is determined by `spec.targetNamespace`, or if that is also not set, the HelmRelease resource's own namespace.

```yaml
# Without storageNamespace - release Secrets go to "apps" (the target namespace)
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: apps
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
```

## Why Use a Separate Storage Namespace

### Access Control Separation

Application teams can have full access to their application namespace while platform teams control the namespace where Helm metadata is stored. This prevents application teams from tampering with Helm release Secrets.

```yaml
# Platform team manages HelmRelease and release metadata
# Application team only sees resources in their namespace
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: team-a-app
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: team-a
  storageNamespace: helm-releases
  chart:
    spec:
      chart: web-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
```

### Centralized Release Tracking

By storing all release metadata in a single namespace, you can easily audit and manage all Helm releases from one place.

```bash
# List all Helm releases stored in the centralized namespace
kubectl get secrets -n helm-releases -l owner=helm

# Check history for a specific release
helm history my-app -n helm-releases
```

### Preventing Namespace Deletion Issues

If the target namespace is deleted (for example, during cleanup), Helm release metadata is preserved in the storage namespace. This prevents orphaned state where Helm thinks a release exists but the metadata is gone.

## Setting Up the Storage Namespace

Create the storage namespace before deploying HelmReleases that reference it.

```yaml
# namespace.yaml - Centralized Helm metadata namespace
apiVersion: v1
kind: Namespace
metadata:
  name: helm-metadata
  labels:
    app.kubernetes.io/managed-by: flux
```

## Multiple Releases with Shared Storage

You can store metadata from multiple releases in the same namespace.

```yaml
# helmrelease-frontend.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: web
  storageNamespace: helm-metadata
  chart:
    spec:
      chart: frontend
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
---
# helmrelease-backend.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: api
  storageNamespace: helm-metadata
  chart:
    spec:
      chart: backend
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
```

Both releases store their metadata Secrets in `helm-metadata`, while deploying resources to their respective namespaces.

## RBAC Considerations

The service account performing Helm operations (either the helm-controller's default or one specified by `spec.serviceAccountName`) must have permissions to create and manage Secrets in the storage namespace.

```yaml
# role.yaml - Permissions for Helm metadata in the storage namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: helm-storage-manager
  namespace: helm-metadata
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: helm-storage-manager
  namespace: helm-metadata
subjects:
  - kind: ServiceAccount
    name: helm-controller
    namespace: flux-system
roleRef:
  kind: Role
  name: helm-storage-manager
  apiGroup: rbac.authorization.k8s.io
```

## Interaction with Helm CLI

When using the Helm CLI to inspect releases stored in a non-default namespace, you must specify the storage namespace explicitly.

```bash
# List releases in the storage namespace
helm list -n helm-metadata

# View history for a release
helm history my-app -n helm-metadata

# Note: the target namespace flag does NOT affect where metadata is read from
# You must use the storage namespace with Helm CLI commands
```

## Verifying the Configuration

```bash
# Check HelmRelease status
flux get helmrelease my-app -n flux-system

# Verify resources are in the target namespace
kubectl get all -n apps

# Verify release Secrets are in the storage namespace
kubectl get secrets -n helm-metadata -l owner=helm,name=my-app

# Confirm via Helm CLI
helm list -n helm-metadata
```

## Summary

The `spec.storageNamespace` field in a Flux CD HelmRelease controls where Helm stores its release metadata Secrets, independent of where chart resources are deployed. This separation is valuable for access control (keeping release metadata away from application teams), centralized release tracking (all metadata in one namespace), and resilience (metadata survives target namespace deletion). When using `storageNamespace`, ensure the Helm operator's service account has appropriate RBAC permissions in that namespace, and remember to use the storage namespace when running Helm CLI commands.
