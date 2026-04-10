# How to Set Up Rook-Ceph for Backup and Archive Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Backup, Archive, S3, Velero, Kubernetes

Description: Learn how to configure Rook-Ceph as a durable backup and archive storage backend for Kubernetes workloads using Velero, S3-compatible APIs, and lifecycle policies.

---

Backup and archive storage requires cost-effective, durable storage that retains data reliably over long periods. Rook-Ceph's object storage (RGW) provides an S3-compatible backend that works with popular Kubernetes backup tools like Velero and standard cloud backup agents.

## Why Use Ceph for Backups

- S3-compatible API works with virtually all backup software
- Replication across OSDs provides durability without needing tape
- Object lifecycle policies automate archiving and deletion
- On-premises storage avoids cloud egress costs for large backup sets

## Setting Up a Dedicated Backup Object Store

Create a backup-specific object store with 3x replication:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: backup-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-backup-bucket
provisioner: rook-ceph.ceph.rook.io/bucket
reclaimPolicy: Retain
parameters:
  objectStoreName: backup-store
  objectStoreNamespace: rook-ceph
```

## Configuring Velero with Ceph RGW

Install Velero using the AWS plugin (compatible with Ceph RGW):

```bash
# Create credentials file
cat > /tmp/ceph-credentials <<EOF
[default]
aws_access_key_id = backup-access-key
aws_secret_access_key = backup-secret-key
EOF

kubectl create secret generic cloud-credentials \
  -n velero \
  --from-file=cloud=/tmp/ceph-credentials

# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.10.0 \
  --bucket velero-backups \
  --secret-file /tmp/ceph-credentials \
  --use-volume-snapshots=false \
  --backup-location-config \
    region=us-east-1,\
    s3ForcePathStyle=true,\
    s3Url=http://rook-ceph-rgw-backup-store.rook-ceph.svc.cluster.local
```

## Scheduling Regular Backups

Create a Velero schedule for automated backups:

```bash
# Daily backup of all namespaces
velero schedule create daily-full \
  --schedule="0 2 * * *" \
  --ttl 720h \
  --include-namespaces "*"

# Hourly backup of critical namespaces
velero schedule create hourly-critical \
  --schedule="0 * * * *" \
  --ttl 48h \
  --include-namespaces databases,monitoring
```

## Setting Object Lifecycle Policies

Automate retention with S3 lifecycle expiration rules:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket velero-backups \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "expire-old-backups",
      "Status": "Enabled",
      "Filter": {"Prefix": "backups/"},
      "Expiration": {
        "Days": 365
      }
    }]
  }' \
  --endpoint-url http://rook-ceph-rgw-backup-store.rook-ceph.svc.cluster.local
```

Note: Ceph RGW supports lifecycle expiration rules natively. Transitions between storage classes (such as AWS GLACIER) require custom storage classes to be configured in the Ceph zone group first.

## Enabling Object Lock for Immutable Backups

Protect backups from deletion with object lock:

```bash
# Enable object lock on bucket creation
aws s3api create-bucket \
  --bucket immutable-backups \
  --object-lock-enabled-for-bucket \
  --endpoint-url http://rook-ceph-rgw-backup-store.rook-ceph.svc.cluster.local

# Set default retention
aws s3api put-object-lock-configuration \
  --bucket immutable-backups \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {"DefaultRetention": {"Mode": "COMPLIANCE", "Days": 90}}
  }' \
  --endpoint-url http://rook-ceph-rgw-backup-store.rook-ceph.svc.cluster.local
```

## Summary

Rook-Ceph provides a cost-effective on-premises backup target using its S3-compatible RGW object store. Velero integrates via the AWS plugin for full Kubernetes namespace and PVC backups. S3 lifecycle policies automate retention management, and object lock (WORM mode) protects backups from accidental or malicious deletion, satisfying compliance requirements for immutable backup storage.
