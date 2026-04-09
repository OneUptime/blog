# How to Create CephFilesystemSubVolumeGroup CRDs in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, SubVolumeGroup, Kubernetes, Storage

Description: Create CephFilesystemSubVolumeGroup CRDs in Rook to organize CephFS subvolumes into groups for better management, isolation, and quota enforcement.

---

## Overview

A CephFS SubVolumeGroup is an administrative grouping mechanism for CephFS subvolumes. When Rook provisions CephFS volumes via the CSI driver, each PVC becomes a CephFS subvolume. SubVolumeGroups let you organize these subvolumes into logical groups, apply group-level size quotas, and isolate workloads.

## Why Use SubVolumeGroups

- **Organizational isolation** - Group subvolumes by namespace, tenant, or application
- **Quota management** - Apply aggregate quotas at the group level
- **Access control** - Different groups can have different access policies
- **Default group override** - Override the `csi` default group used by Rook CSI

## Create a CephFilesystemSubVolumeGroup

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystemSubVolumeGroup
metadata:
  name: group-dev
  namespace: rook-ceph
spec:
  filesystemName: myfs
  name: dev
  quota: 100Gi
  dataPoolName: myfs-replicated
  pinning:
    distributed: 1
```

Apply the manifest:

```bash
kubectl apply -f subvolumegroup-dev.yaml
```

## Fields Explained

### filesystemName

Specifies which `CephFilesystem` this group belongs to. Must match an existing `CephFilesystem` in the same namespace:

```yaml
spec:
  filesystemName: myfs
```

### name

The actual name of the subvolume group in Ceph. If omitted, defaults to the Kubernetes resource name:

```yaml
spec:
  name: dev
```

### quota

Set a size limit on the group. The value is a Kubernetes resource quantity:

```yaml
spec:
  quota: 100Gi
```

### pinning

Controls how MDS ranks are assigned to this group. The `distributed: 1` option spreads subvolumes across available MDS ranks:

```yaml
spec:
  pinning:
    distributed: 1
```

For sticky assignment to a specific rank, use:

```yaml
spec:
  pinning:
    export: 1
```

## Create Multiple Groups for Multi-Tenancy

Create separate groups for different environments:

```yaml
---
apiVersion: ceph.rook.io/v1
kind: CephFilesystemSubVolumeGroup
metadata:
  name: group-production
  namespace: rook-ceph
spec:
  filesystemName: myfs
  name: production
  quota: 1Ti
---
apiVersion: ceph.rook.io/v1
kind: CephFilesystemSubVolumeGroup
metadata:
  name: group-staging
  namespace: rook-ceph
spec:
  filesystemName: myfs
  name: staging
  quota: 100Gi
```

## Reference SubVolumeGroup in a StorageClass

Point the CephFS StorageClass to use a specific subvolume group:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs-dev
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: myfs
  pool: myfs-replicated
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  subvolumeGroup: dev
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Verify SubVolumeGroup

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs subvolumegroup ls myfs
```

## Summary

`CephFilesystemSubVolumeGroup` CRDs in Rook provide a declarative way to organize CephFS subvolumes into logical groups with quotas and MDS pinning. Each StorageClass can reference a specific subvolume group, enabling multi-tenancy and capacity management across teams or environments sharing the same CephFS filesystem.
