# How to Create and Manage CephFS Directory Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Snapshot, Data Protection, Filesystem

Description: Learn how to create and manage CephFS directory-level snapshots, enable snapshot support, use the .snap hidden directory, and restore files from snapshots.

---

## CephFS Snapshot Overview

CephFS supports per-directory snapshots that capture the state of a directory tree at a point in time. Snapshots are managed through the special `.snap` directory that appears inside any CephFS mount point.

## Prerequisites

- CephFS with snapshot support enabled
- MDS running Ceph 15.2+ (Octopus) for stable snapshot support

## Enabling Snapshots in Rook CephFilesystem

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPools:
    - name: data0
      failureDomain: host
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

Enable the snapshot module:

```bash
ceph mgr module enable snap_schedule
```

## Creating a Manual Snapshot

Mount CephFS:

```bash
mount -t ceph mon1:6789:/ /mnt/cephfs -o name=admin,secret=<key>
```

Create a snapshot of a directory by creating a subdirectory under `.snap`:

```bash
mkdir /mnt/cephfs/mydir/.snap/snapshot-20260331
```

List existing snapshots:

```bash
ls /mnt/cephfs/mydir/.snap/
```

## Creating Snapshots via CSI in Kubernetes

Create a VolumeSnapshotClass for CephFS:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-cephfsplugin-snapclass
driver: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
deletionPolicy: Delete
```

Create a VolumeSnapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: cephfs-pvc-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: csi-cephfsplugin-snapclass
  source:
    persistentVolumeClaimName: cephfs-pvc
```

## Browsing Snapshot Contents

```bash
ls /mnt/cephfs/mydir/.snap/snapshot-20260331/
```

The snapshot contains the full directory tree as it existed at snapshot creation time.

## Restoring Files from a Snapshot

Copy a specific file back from the snapshot:

```bash
cp /mnt/cephfs/mydir/.snap/snapshot-20260331/important-file.txt \
   /mnt/cephfs/mydir/important-file.txt
```

Restore an entire directory:

```bash
cp -r /mnt/cephfs/mydir/.snap/snapshot-20260331/ \
      /mnt/cephfs/mydir-restored/
```

## Deleting a Snapshot

```bash
rmdir /mnt/cephfs/mydir/.snap/snapshot-20260331
```

## Configuring Automatic Snapshot Schedules

```bash
ceph fs snap-schedule add /mydir 1d --fs myfs
ceph fs snap-schedule add /mydir 1w --fs myfs
ceph fs snap-schedule status /mydir --fs myfs
```

## Summary

CephFS directory snapshots are created by making subdirectories under the special `.snap` directory within a mounted CephFS volume. Enable the `snap_schedule` manager module for automated snapshot schedules. For Kubernetes workloads, use VolumeSnapshot objects with the CephFS CSI driver. Restore individual files by copying from the snapshot directory, or restore entire trees with a recursive copy from the `.snap` path.
