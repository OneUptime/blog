# How to Set Up Rook-Ceph with Velero for Kubernetes Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Velero, Backup, Kubernetes, Storage, CSI

Description: Step-by-step guide to integrating Rook-Ceph with Velero for full Kubernetes cluster backup, including persistent volume snapshots via the CSI snapshot driver.

---

## Overview

Rook-Ceph and Velero together provide a complete Kubernetes backup solution. Velero handles namespace and resource backups while Rook-Ceph CSI snapshots handle persistent volume data. This guide covers the full integration.

## Prerequisites

- Rook-Ceph cluster running with RBD or CephFS storage classes
- CSI snapshot controller installed in the cluster
- Velero CLI v1.12+

## Step 1 - Install the CSI Snapshot Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/v6.3.0/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

## Step 2 - Create a VolumeSnapshotClass for RBD

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-rbdplugin-snapclass
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
```

```bash
kubectl apply -f volumesnapshotclass.yaml
```

## Step 3 - Set Up RGW Object Store User

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create --uid=velero --display-name="Velero"
```

Store the credentials in a file and create the secret:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0,velero/velero-plugin-for-csi:v0.6.0 \
  --bucket velero-backups \
  --secret-file ./credentials-velero \
  --use-volume-snapshots=true \
  --features=EnableCSI \
  --backup-location-config \
    region=us-east-1,s3ForcePathStyle=true,s3Url=http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Step 4 - Take a Backup with Volume Snapshots

```bash
velero backup create full-backup \
  --include-namespaces production \
  --snapshot-volumes=true \
  --volume-snapshot-locations default
```

Monitor progress:

```bash
velero backup describe full-backup --details
```

## Step 5 - Restore from Backup

```bash
velero restore create --from-backup full-backup \
  --include-namespaces production
```

```bash
velero restore describe full-backup-restore --details
```

## Step 6 - Verify CSI Snapshot Integration

```bash
kubectl get volumesnapshot -A
kubectl get volumesnapshotcontent
```

Each PVC in the backed-up namespace should have a corresponding VolumeSnapshot created during the backup.

## Summary

Combining Rook-Ceph with Velero and the CSI snapshot plugin gives you crash-consistent backups that include both Kubernetes resource definitions and persistent volume data. The RGW object store holds metadata and resource manifests while RBD snapshots preserve PVC data efficiently using copy-on-write semantics.
