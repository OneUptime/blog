# How to Create Volume Group Snapshots with Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Snapshot, Storage, Kubernetes

Description: Learn how to use VolumeGroupSnapshot to atomically snapshot multiple PersistentVolumeClaims simultaneously with Rook CSI.

---

## What are Volume Group Snapshots?

Volume Group Snapshots are a Kubernetes feature that allows multiple PersistentVolumeClaims to be snapshotted atomically at the same point in time. This is critical for stateful applications where consistency across multiple volumes is required - for example, a database with separate volumes for data and transaction logs.

Rook documents VolumeGroupSnapshot support for CephFS volumes through the `groupsnapshot.storage.k8s.io` API.

## Prerequisites

- Kubernetes 1.31 or later
- The VolumeGroupSnapshot CRDs installed:

```bash
kubectl get crd | grep groupsnapshot
```

- A recent Rook release running Ceph Squid (v19.0.0) or later with a Ceph CSI version that supports CephFS VolumeGroupSnapshots
- The snapshot controller and `external-snapshotter` deployed with group snapshot support. With `external-snapshotter` v8.2 and later, enable `--feature-gates=CSIVolumeGroupSnapshot=true`

Install the group snapshot CRDs:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v8.2.0/client/config/crd/groupsnapshot.storage.k8s.io_volumegroupsnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v8.2.0/client/config/crd/groupsnapshot.storage.k8s.io_volumegroupsnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v8.2.0/client/config/crd/groupsnapshot.storage.k8s.io_volumegroupsnapshots.yaml
```

## Create a VolumeGroupSnapshotClass

```yaml
apiVersion: groupsnapshot.storage.k8s.io/v1beta1
kind: VolumeGroupSnapshotClass
metadata:
  name: csi-cephfsplugin-groupsnapclass
driver: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/group-snapshotter-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/group-snapshotter-secret-namespace: rook-ceph
deletionPolicy: Delete
```

```bash
kubectl apply -f group-snapclass.yaml
```

## Label PVCs for Group Snapshot

Label the PVCs you want to snapshot together:

```bash
kubectl label pvc db-data app=mydb-snapshot-group
kubectl label pvc db-logs app=mydb-snapshot-group
```

## Create the VolumeGroupSnapshot

```yaml
apiVersion: groupsnapshot.storage.k8s.io/v1beta1
kind: VolumeGroupSnapshot
metadata:
  name: mydb-group-snapshot
spec:
  volumeGroupSnapshotClassName: csi-cephfsplugin-groupsnapclass
  source:
    selector:
      matchLabels:
        app: mydb-snapshot-group
```

```bash
kubectl apply -f group-snapshot.yaml
kubectl get volumegroupsnapshot mydb-group-snapshot
```

## Verify the Group Snapshot

```bash
kubectl describe volumegroupsnapshot mydb-group-snapshot
kubectl get volumesnapshot -o=jsonpath='{range .items[?(@.metadata.ownerReferences[0].name=="mydb-group-snapshot")]}{.metadata.name}{"\n"}{end}'
```

When the `VolumeGroupSnapshot` is `ReadyToUse`, the second command lists the individual `VolumeSnapshot` objects created for each PVC in the group. Each snapshot shares the same point-in-time capture.

## Restore from a Group Snapshot

To restore each volume in the group, create individual PVCs referencing each snapshot from the group:

```bash
# List individual snapshots created by the group snapshot
kubectl get volumesnapshot -o=jsonpath='{range .items[?(@.metadata.ownerReferences[0].name=="mydb-group-snapshot")]}{.metadata.name}{"\n"}{end}'
```

Then create restore PVCs for each:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data-restored
spec:
  storageClassName: rook-cephfs
  dataSource:
    name: <individual-snapshot-name>
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
```

## Summary

Volume Group Snapshots with Rook CSI provide crash-consistent backups across multiple CephFS volumes simultaneously. By labeling PVCs and creating a `VolumeGroupSnapshot` object, teams can ensure all related volumes are captured at the same instant, which is essential for multi-volume stateful applications like databases.
