# How to Set Up Erasure Coded Block Storage with Kernel 4.11+ in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Erasure Coding, Block Storage, Kernel

Description: Learn how to configure erasure coded block storage in Rook-Ceph on nodes running Linux kernel 4.11 or later, combining a replicated metadata pool with an EC data pool.

---

## Overview

Erasure coding (EC) provides more storage-efficient data protection compared to full replication. A 4+2 EC scheme, for example, can tolerate 2 OSD failures while using 1.5x raw overhead rather than the 3x overhead of triple replication. Using EC for block storage (RBD) in Rook requires Linux kernel 4.11+ on all nodes because the kernel RBD (krbd) driver gained `data-pool` support in that version, which is necessary for EC RBD's two-pool architecture (a replicated metadata pool paired with an EC data pool).

## Architecture: Replicated Metadata + EC Data Pool

RBD with EC requires two pools:

1. A replicated pool for RBD image headers and metadata
2. An erasure-coded pool for the actual data blocks

```yaml
# metadata pool - standard replication
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicated-metadata-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
```

```yaml
# data pool - erasure coded
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-data-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
```

```bash
kubectl apply -f replicated-metadata-pool.yaml
kubectl apply -f ec-data-pool.yaml
```

## Verifying EC Pool Configuration

After creation, verify the erasure code profile:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool ls detail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd erasure-code-profile get ec-data-pool_ecprofile
```

## Creating the StorageClass

The StorageClass references both pools. The `dataPool` parameter points to the EC pool:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-ec
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicated-metadata-pool
  dataPool: ec-data-pool
  imageFormat: "2"
  imageFeatures: layering,exclusive-lock,object-map,fast-diff,deep-flatten
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Verifying Kernel Version

EC block storage requires kernel 4.11+ on all nodes. Check before deploying:

```bash
for node in $(kubectl get nodes -o name); do
  kubectl debug node/${node##*/} -it --image=busybox -- uname -r 2>/dev/null
done

# Or check from within pods
uname -r
```

If any node is below 4.11, the RBD kernel module will not support the required image features and mounts will fail.

## Testing EC Block Storage

Create a PVC and verify it provisions and mounts correctly:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-ec-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: rook-ceph-block-ec
```

```bash
kubectl apply -f test-ec-pvc.yaml
kubectl get pvc test-ec-pvc
```

Verify the PVC binds and check the RBD image features on the created volume:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info replicated-metadata-pool/<pvc-image-name>
```

## Summary

Erasure coded block storage in Rook requires splitting RBD images across a replicated metadata pool and an EC data pool. Linux kernel 4.11+ is mandatory because the krbd driver requires that version for `data-pool` support, which enables mapping RBD images that span a replicated metadata pool and an EC data pool. Always verify kernel versions across all worker nodes before deploying EC-backed StorageClasses to production workloads.
