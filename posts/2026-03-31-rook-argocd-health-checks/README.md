# How to Configure Rook-Ceph Health Checks in ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, ArgoCD, Health Check, GitOps, Kubernetes

Description: Learn how to configure custom ArgoCD health checks for Rook-Ceph CRDs so ArgoCD accurately reflects CephCluster and CephBlockPool health status in sync operations.

---

## The Problem with Default Health Checks

By default, ArgoCD does not understand Rook's custom resources. A CephCluster might be `Connecting` or `Progressing` while ArgoCD reports it as `Healthy`. Custom health checks make ArgoCD accurately track Ceph resource states.

## Step 1: Configure CephCluster Health Check

Add a custom health check for the `CephCluster` resource in the ArgoCD ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.ceph.rook.io_CephCluster: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase ~= nil then
        if obj.status.phase == "Ready" then
          hs.status = "Healthy"
          hs.message = obj.status.message
          return hs
        end
        if obj.status.phase == "Progressing" then
          hs.status = "Progressing"
          hs.message = "Cluster is initializing"
          return hs
        end
        if obj.status.phase == "Failure" then
          hs.status = "Degraded"
          hs.message = obj.status.message
          return hs
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for CephCluster status"
    return hs
```

## Step 2: Configure CephBlockPool Health Check

```yaml
data:
  resource.customizations.health.ceph.rook.io_CephBlockPool: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Ready" then
        hs.status = "Healthy"
        hs.message = "Pool is ready"
        return hs
      end
      if obj.status.phase == "Failure" then
        hs.status = "Degraded"
        hs.message = obj.status.message
        return hs
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for pool status"
    return hs
```

## Step 3: Configure CephFilesystem Health Check

```yaml
data:
  resource.customizations.health.ceph.rook.io_CephFilesystem: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Ready" then
        hs.status = "Healthy"
        hs.message = "Filesystem is ready"
        return hs
      end
      if obj.status.phase == "Failure" then
        hs.status = "Degraded"
        hs.message = obj.status.message
        return hs
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for CephFilesystem"
    return hs
```

## Step 4: Apply the Configuration

```bash
kubectl -n argocd apply -f argocd-cm.yaml
kubectl -n argocd rollout restart deployment/argocd-server
kubectl -n argocd rollout restart statefulset/argocd-application-controller
```

## Verify Health Check in UI

After applying, check that the ArgoCD UI shows the correct health:

```bash
argocd app get rook-ceph
# Look for: health status: Healthy
```

## Step 5: Add Resource Ignores for Operator-Managed Fields

Prevent ArgoCD from marking the app out-of-sync due to operator-set fields:

```yaml
data:
  resource.customizations.ignoreDifferences.ceph.rook.io_CephCluster: |
    jqPathExpressions:
    - '.spec.cephVersion.image'
    - '.status'
```

## Summary

Custom ArgoCD health checks for Rook CRDs ensure that deployment pipelines accurately reflect Ceph cluster state rather than just Kubernetes resource creation. Without them, ArgoCD marks resources healthy before Ceph finishes initialization, causing downstream sync operations to proceed prematurely.
