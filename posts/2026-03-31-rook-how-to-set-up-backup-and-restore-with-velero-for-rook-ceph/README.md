# How to Set Up Backup and Restore with Velero for Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Velero, Backup, Restore, Kubernetes

Description: Set up Velero with Rook-Ceph to back up Kubernetes resources and persistent volumes using CSI snapshots stored in Rook Object Storage.

---

## Overview

Velero provides application-level backups for Kubernetes, capturing both resource manifests and persistent volume data. When integrated with Rook-Ceph, Velero uses CSI volume snapshots for PV backup and stores the backup catalog in Rook's S3-compatible object store. This gives you a fully self-contained backup solution within your Kubernetes cluster.

## Architecture

```text
Velero Backup Flow:
Application Namespace -> Velero -> VolumeSnapshot (via CSI) -> Ceph RBD Snapshot
                      -> Velero Backup Metadata -> Rook Object Store (S3)
```

## Step 1 - Create a Bucket for Velero in Rook

Create an `ObjectBucketClaim` for Velero:

```yaml
apiVersion: objectbucket.io/v1alpha1
kind: ObjectBucketClaim
metadata:
  name: velero-backup-bucket
  namespace: velero
spec:
  generateBucketName: velero-backup
  storageClassName: rook-ceph-bucket
```

Apply and retrieve the credentials:

```bash
kubectl apply -f velero-bucket.yaml

BUCKET_NAME=$(kubectl -n velero get cm velero-backup-bucket -o jsonpath='{.data.BUCKET_NAME}')
BUCKET_HOST=$(kubectl -n velero get cm velero-backup-bucket -o jsonpath='{.data.BUCKET_HOST}')
ACCESS_KEY=$(kubectl -n velero get secret velero-backup-bucket -o jsonpath='{.data.AWS_ACCESS_KEY_ID}' | base64 -d)
SECRET_KEY=$(kubectl -n velero get secret velero-backup-bucket -o jsonpath='{.data.AWS_SECRET_ACCESS_KEY}' | base64 -d)
```

## Step 2 - Create Velero Credentials File

```bash
cat > /tmp/velero-credentials <<EOF
[default]
aws_access_key_id=$ACCESS_KEY
aws_secret_access_key=$SECRET_KEY
EOF
```

## Step 3 - Install Velero

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0,velero/velero-plugin-for-csi:v0.7.0 \
  --bucket $BUCKET_NAME \
  --secret-file /tmp/velero-credentials \
  --use-volume-snapshots=true \
  --features=EnableCSI \
  --backup-location-config region=us-east-1,s3ForcePathStyle=true,s3Url=http://$BUCKET_HOST
```

## Step 4 - Create VolumeSnapshotClass for Velero

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
deletionPolicy: Retain
```

Apply:

```bash
kubectl apply -f vsclass.yaml
```

## Step 5 - Create a Backup

Back up a namespace including PVCs:

```bash
velero backup create my-app-backup \
  --include-namespaces my-app \
  --snapshot-volumes \
  --wait
```

List backups:

```bash
velero backup get
```

## Step 6 - Restore from Backup

Restore to the same namespace:

```bash
velero restore create my-app-restore \
  --from-backup my-app-backup \
  --wait
```

Restore to a different namespace:

```bash
velero restore create my-app-restore-dr \
  --from-backup my-app-backup \
  --namespace-mappings my-app:my-app-restored \
  --wait
```

## Step 7 - Schedule Regular Backups

```bash
velero schedule create daily-app-backup \
  --schedule="0 2 * * *" \
  --include-namespaces my-app \
  --snapshot-volumes \
  --ttl 720h
```

This creates daily backups retained for 30 days.

## Verify Backup Integrity

```bash
velero backup describe my-app-backup --details
velero backup logs my-app-backup
```

## Summary

Velero with Rook-Ceph provides a complete in-cluster backup solution: PVC data is captured via Ceph CSI snapshots and backup metadata is stored in Rook's S3-compatible object store. The setup requires creating an OBC for Velero's storage, installing Velero with the CSI plugin, and creating a VolumeSnapshotClass annotated for Velero. Schedule backups with `velero schedule create` and restore entire namespaces or specific resources with `velero restore create`.
