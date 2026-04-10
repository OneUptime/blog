# How to Configure Rook-Ceph for Multi-Tenant Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Multi-Tenant, Kubernetes, RBAC, Namespace, Security

Description: Configure Rook-Ceph for multi-tenant Kubernetes clusters with namespace isolation, per-tenant storage classes, quotas, and RBAC to prevent cross-tenant data access.

---

## Multi-Tenancy Goals

In a multi-tenant Kubernetes cluster, different teams or customers share the same Rook-Ceph backend but must be isolated from each other. Goals include: separate storage pools per tenant, namespace-scoped access, quotas to prevent one tenant starving others, and audit trails.

## Create Per-Tenant Pools

```yaml
# Tenant A pool
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: tenant-a-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  quotas:
    maxSize: "10Ti"   # 10 TiB quota for tenant A
---
# Tenant B pool
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: tenant-b-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  quotas:
    maxSize: "5Ti"    # 5 TiB quota for tenant B
```

## Create Per-Tenant Storage Classes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-tenant-a
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: tenant-a-pool
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
allowedTopologies: []
allowVolumeExpansion: true
```

## Restrict Storage Class Access via RBAC

```yaml
# Restrict visibility of tenant-a storage class (use with ResourceQuota or an admission controller like OPA Gatekeeper to enforce usage)
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: use-tenant-a-storage
rules:
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses"]
    resourceNames: ["ceph-tenant-a"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-a-storage-access
  namespace: tenant-a
subjects:
  - kind: Group
    name: tenant-a-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: use-tenant-a-storage
  apiGroup: rbac.authorization.k8s.io
```

## Apply Namespace Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: tenant-a
spec:
  hard:
    requests.storage: "2Ti"
    persistentvolumeclaims: "50"
    ceph-tenant-a.storageclass.storage.k8s.io/requests.storage: "2Ti"
```

## CephFS Subvolume Groups for Filesystem Isolation

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystemSubVolumeGroup
metadata:
  name: tenant-a-subvolumegroup
  namespace: rook-ceph
spec:
  filesystemName: cephfs
  quota: "1Ti"
```

## Audit Cross-Tenant Access Attempts

```bash
# Monitor which namespaces are creating PVCs
kubectl get pvc --all-namespaces | grep tenant

# Check per-tenant pool usage and quota enforcement
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd pool get-quota tenant-a-pool
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd pool stats tenant-a-pool

# Review Ceph auth capabilities for tenant isolation
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph auth ls | grep -A 5 tenant
```

## Summary

Multi-tenant Rook-Ceph isolation requires per-tenant Ceph pools with size quotas, dedicated StorageClasses with namespace-scoped RBAC bindings, and Kubernetes ResourceQuotas to prevent storage exhaustion. CephFS subvolume groups add filesystem-level quotas and isolation for shared filesystem workloads.
