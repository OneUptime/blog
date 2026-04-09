# How to Plan CephFS for Shared Home Directories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Storage, Kubernetes

Description: Plan a CephFS deployment for shared home directories, covering quota management, MDS sizing, and persistent volume configuration in Rook-Ceph.

---

## Why CephFS for Home Directories

Shared home directories require POSIX-compliant shared storage with per-user quotas, strong consistency, and support for concurrent access from multiple pods or nodes. CephFS provides all of this natively via Rook on Kubernetes.

## Capacity and Quota Planning

First, estimate capacity: multiply expected users by average home directory size, then add 20-30% overhead.

Create a dedicated pool for home directories:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: homefs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: data0
      replicated:
        size: 3
  preserveFilesystemOnDelete: true
  metadataServer:
    activeCount: 1
    activeStandby: true
```

Set per-user quotas using CephFS directory quotas:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolume create homefs user-alice --size 10737418240
```

## MDS Sizing for Many Users

For home directories, MDS memory is the bottleneck. Each active MDS caches metadata. Plan at least 4 GB RAM per MDS for up to 500 concurrent users.

```yaml
metadataServer:
  activeCount: 2
  activeStandby: true
  resources:
    requests:
      memory: "4Gi"
      cpu: "2"
    limits:
      memory: "8Gi"
```

Use multiple active MDS instances only if you have separate subtree pinning or very high user counts (1000+).

## Kubernetes StorageClass and PVC Setup

Define a StorageClass for home directories:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-home
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: homefs
  pool: homefs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

Create a PVC per user:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: home-alice
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: cephfs-home
  resources:
    requests:
      storage: 10Gi
```

## Namespace and Subvolume Isolation

Use CephFS subvolume groups to isolate departments:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolumegroup create homefs engineering
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolume create homefs bob --group_name engineering --size 5368709120
```

This ensures that even if one user fills their quota, others remain unaffected.

## Monitoring Home Directory Usage

Monitor MDS cache and client counts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mds stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status homefs
```

Check quota usage per subvolume:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolume info homefs alice
```

## Summary

Planning CephFS for shared home directories involves sizing MDS memory per concurrent user count, creating per-user subvolumes with quota enforcement, and using a dedicated StorageClass with RWX access mode. Subvolume groups add an extra layer of isolation for department-level separation.
