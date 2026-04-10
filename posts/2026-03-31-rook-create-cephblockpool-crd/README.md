# How to Create a CephBlockPool CRD in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephBlockPool, Kubernetes, Storage, Block Storage

Description: Step-by-step guide to creating a CephBlockPool custom resource in Rook, which provisions a Ceph RADOS pool for RBD block storage used by PersistentVolumes.

---

## What Is a CephBlockPool

A `CephBlockPool` is a Rook custom resource definition (CRD) that represents a Ceph RADOS pool configured for block storage. When you apply a `CephBlockPool` manifest, the Rook operator creates a corresponding pool in the Ceph cluster and makes it available for use via a StorageClass. PersistentVolumeClaims that reference that StorageClass provision RBD images inside the pool.

## Minimal CephBlockPool Example

The simplest possible block pool uses three-way replication with a host-level failure domain:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
```

Apply it with:

```bash
kubectl apply -f cephblockpool.yaml
```

Verify the pool is created and healthy:

```bash
kubectl -n rook-ceph get cephblockpool replicapool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls detail | grep replicapool
```

## Key Spec Fields

The `CephBlockPool` spec supports several important fields:

```yaml
spec:
  # Failure domain: host, osd, rack, zone
  failureDomain: host

  # Replicated pool configuration
  replicated:
    size: 3                  # Total copies (1 primary + 2 replicas)
    requireSafeReplicaSize: true  # Prevents size=1 without explicit override

  # Optional: target specific device class
  deviceClass: ssd

  # Optional: compression
  parameters:
    compression_mode: passive

  # Optional: quota
  quotas:
    maxSize: "10Gi"
    maxObjects: 1000000
```

## Checking Pool Status

After creation, inspect the pool status through the CRD:

```bash
kubectl -n rook-ceph describe cephblockpool replicapool
```

Look for the `Status.Phase` field, which should show `Ready`. You can also check Ceph directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool all
```

## Creating a StorageClass for the Pool

A CephBlockPool alone does not provision volumes. You also need a StorageClass that references it:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Testing with a PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-block-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: rook-ceph-block
```

```bash
kubectl apply -f pvc.yaml
kubectl get pvc test-block-pvc
```

The PVC should reach `Bound` status within a few seconds once the pool is healthy.

## Deleting a CephBlockPool

Before deleting a CephBlockPool, ensure no PVCs reference it. If active volumes still exist, the resource enters a `Terminating` state and the Rook finalizer prevents actual removal until the pool is clean:

```bash
kubectl -n rook-ceph delete cephblockpool replicapool
```

## Summary

Creating a `CephBlockPool` CRD in Rook is the first step toward provisioning RBD block storage in Kubernetes. The resource maps directly to a Ceph RADOS pool and supports replicated or erasure-coded configurations, device class targeting, compression, and quotas. Pair it with a StorageClass to make the pool available to workloads through standard PVC provisioning.
