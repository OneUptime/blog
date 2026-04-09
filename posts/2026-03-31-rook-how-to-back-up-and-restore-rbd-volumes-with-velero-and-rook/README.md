# How to Back Up and Restore RBD Volumes with Velero and Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Velero, Backup, Restore, Kubernetes

Description: Learn how to use Velero with Rook-Ceph to back up and restore Kubernetes persistent volumes backed by RBD block storage.

---

## Overview

Velero is a popular Kubernetes backup tool that can take application-consistent backups including persistent volumes. When combined with Rook-Ceph RBD and the CSI snapshot capability, Velero can snapshot Ceph RBD volumes natively, store the backup metadata in an object store, and restore volumes to the same or a different cluster.

## Prerequisites

- Rook-Ceph cluster running with RBD storage
- Velero CLI installed
- An S3-compatible object store for Velero metadata (can use Rook Object Store)
- `snapshot.storage.k8s.io` CRDs installed (VolumeSnapshot, VolumeSnapshotClass, etc.)

## Install the CSI External Snapshotter

The external snapshotter enables Kubernetes volume snapshot support:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

## Create a VolumeSnapshotClass for RBD

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-rbdplugin-snapclass
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
deletionPolicy: Delete
```

The label `velero.io/csi-volumesnapshot-class: "true"` tells Velero to use this class for RBD volumes.

## Install Velero with CSI Plugin

Install Velero with S3-compatible backup storage and CSI support:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.10.0 \
  --bucket velero-backups \
  --secret-file ./credentials-velero \
  --use-volume-snapshots true \
  --features=EnableCSI \
  --backup-location-config region=us-east-1,s3ForcePathStyle=true,s3Url=http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Create a Backup

Back up a namespace including its RBD volumes:

```bash
velero backup create my-app-backup \
  --include-namespaces my-app \
  --snapshot-volumes true \
  --wait
```

Check backup status:

```bash
velero backup describe my-app-backup --details
```

## Restore from Backup

To restore the application and its volumes:

```bash
velero restore create my-app-restore \
  --from-backup my-app-backup \
  --include-namespaces my-app \
  --wait
```

Monitor the restore:

```bash
velero restore logs my-app-restore
```

## Schedule Regular Backups

Create a scheduled backup that runs daily:

```bash
velero schedule create daily-backup \
  --schedule="0 1 * * *" \
  --include-namespaces my-app \
  --snapshot-volumes true
```

## Summary

Velero with the CSI plugin integrates with Rook RBD snapshots to provide application-consistent backups. The key components are a `VolumeSnapshotClass` labeled for Velero, the CSI plugin enabled in Velero, and an object store for backup metadata. Backups trigger native RBD snapshots, which are efficient and fast, while metadata is stored in S3-compatible storage for catalog and restore operations.
