# How to Create CephFS Volume Snapshots with Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Snapshot, Storage, Kubernetes

Description: Learn how to create and manage CephFS volume snapshots with Rook CSI using VolumeSnapshotClass and VolumeSnapshot resources.

---

## Overview

Rook CSI supports volume snapshots for CephFS volumes in addition to RBD. CephFS snapshots leverage Ceph's native subvolume snapshot capability, capturing a consistent point-in-time view of a shared filesystem volume. This is particularly useful for RWX (ReadWriteMany) workloads where multiple pods share the same volume.

## Prerequisites

- Kubernetes 1.20 or later with snapshot CRDs installed
- Rook 1.9 or later
- CephFS filesystem configured with the MDS daemon running
- CSI snapshotter sidecar present in the cephfs provisioner deployment

Verify snapshotter is running:

```bash
kubectl get pods -n rook-ceph -l app=csi-cephfsplugin-provisioner
kubectl logs -n rook-ceph deployment/csi-cephfsplugin-provisioner -c csi-snapshotter
```

## Create a CephFS VolumeSnapshotClass

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

Apply the class:

```bash
kubectl apply -f cephfs-snapshotclass.yaml
kubectl get volumesnapshotclass
```

## Take a Snapshot of a CephFS PVC

First, ensure you have an existing CephFS PVC:

```bash
kubectl get pvc cephfs-pvc
```

Then create a snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: cephfs-pvc-snapshot
spec:
  volumeSnapshotClassName: csi-cephfsplugin-snapclass
  source:
    persistentVolumeClaimName: cephfs-pvc
```

```bash
kubectl apply -f cephfs-snapshot.yaml
kubectl get volumesnapshot cephfs-pvc-snapshot
```

## Check Snapshot Status

```bash
kubectl describe volumesnapshot cephfs-pvc-snapshot
```

Look for the `Status` section - `readyToUse` must be `true` before you can use the snapshot as a data source.

On the Ceph side, you can verify the subvolume snapshot was created:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph fs subvolume snapshot ls myfs <subvolume-name> --group_name csi
```

## Restore a CephFS Snapshot to a New PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cephfs-pvc-restored
spec:
  storageClassName: rook-cephfs
  dataSource:
    name: cephfs-pvc-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 5Gi
```

The restored PVC will contain the exact contents from the snapshot point in time.

## Limitations and Notes

CephFS snapshots have a few considerations:

```text
- Snapshots are taken at the subvolume level, not the filesystem level
- In-flight writes at snapshot time may not be captured
- Applications should quiesce writes before snapshotting critical data
- RWX volumes allow multiple writers - coordinate snapshot timing if needed
```

## Summary

Rook CSI CephFS volume snapshots give Kubernetes workloads using shared filesystems the same point-in-time capture capabilities as block storage. By configuring the `csi-cephfsplugin-snapclass` VolumeSnapshotClass and using standard Kubernetes VolumeSnapshot objects, teams can protect RWX volumes and restore them into new PVCs on demand.
