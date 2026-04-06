# How to Understand the Three Rook CSI Drivers (RBD, CephFS, NFS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, Driver, Kubernetes

Description: Learn the differences between the three Rook CSI drivers - RBD, CephFS, and NFS - and when to use each for Kubernetes storage workloads.

---

## Overview of Rook CSI Drivers

Rook deploys three CSI (Container Storage Interface) drivers that expose different Ceph storage types to Kubernetes. Each driver maps to a different Ceph backend and has different access mode capabilities and performance characteristics:

- `rook-ceph.rbd.csi.ceph.com` - RADOS Block Device, block storage
- `rook-ceph.cephfs.csi.ceph.com` - CephFS, shared filesystem
- `rook-ceph.nfs.csi.ceph.com` - NFS-Ganesha, NFS protocol over CephFS

Choosing the right driver depends on your access pattern, whether you need shared access, and the protocols your application expects.

## The RBD CSI Driver

The RBD driver provisions Ceph block devices as `ReadWriteOnce` (RWO) volumes. Each PVC gets a dedicated RBD image that is mapped to exactly one node at a time.

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
reclaimPolicy: Delete
allowVolumeExpansion: true
```

Use RBD for: databases, stateful services needing a single writer, workloads requiring `ReadWriteOnce` semantics.

## The CephFS CSI Driver

The CephFS driver provisions subdirectories within a CephFS filesystem as `ReadWriteMany` (RWX) volumes. Multiple pods on different nodes can read and write simultaneously.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: my-fs
  pool: my-fs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

Use CephFS for: shared content, machine learning datasets, CI/CD artifact storage, any workload needing `ReadWriteMany`.

## The NFS CSI Driver

The NFS driver exposes NFS-Ganesha exports as Kubernetes volumes via the standard NFS protocol. Applications mount NFS without requiring Ceph kernel modules or direct Ceph client libraries.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-nfs
provisioner: rook-ceph.nfs.csi.ceph.com
parameters:
  nfsCluster: my-nfs
  server: rook-ceph-nfs-my-nfs-0.rook-ceph.svc
  share: /data
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-nfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

Use NFS for: legacy applications expecting NFS, external client access, workloads that cannot use the Ceph kernel client.

## Comparison Summary

| Feature | RBD | CephFS | NFS |
|---------|-----|--------|-----|
| Access mode | RWO | RWX | RWX |
| Protocol | Block | POSIX | NFS |
| Multi-node write | No | Yes | Yes |
| Snapshots | Yes | Yes | Limited |
| Volume expansion | Yes | Yes | Yes |
| External clients | No | No | Yes |

## Summary

Rook's three CSI drivers serve distinct use cases. RBD provides exclusive block storage for single-writer workloads like databases. CephFS delivers a POSIX shared filesystem for multi-writer workloads. NFS wraps CephFS behind the NFS protocol for compatibility with legacy systems and external clients. Select the driver based on access mode requirements, protocol constraints, and whether the workload runs inside or outside Kubernetes.
