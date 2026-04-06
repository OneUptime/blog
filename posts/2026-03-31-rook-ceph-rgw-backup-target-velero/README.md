# How to Use Ceph RGW as Backup Target for Velero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Velero, Backup, S3, Kubernetes, Object Storage

Description: Learn how to configure Ceph RGW as an S3-compatible backup target for Velero, enabling Kubernetes cluster backups stored in your own Ceph object store.

---

## Overview

Velero is a popular Kubernetes backup tool that stores backups in object storage. Ceph RGW (RADOS Gateway) provides an S3-compatible API, making it an excellent self-hosted backup target for Velero. This guide walks through the full setup.

## Prerequisites

- A running Rook-Ceph cluster with RGW deployed
- Velero CLI installed
- kubectl access to your cluster

## Step 1 - Create an RGW User for Velero

First, create a dedicated Ceph object store user for Velero:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=velero \
  --display-name="Velero Backup User" \
  --caps="buckets=*;users=*;usage=read;metadata=read"
```

Note the `access_key` and `secret_key` from the output.

## Step 2 - Create a Bucket for Velero Backups

```bash
aws s3 mb s3://velero-backups \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80
```

## Step 3 - Create a Kubernetes Secret for Velero Credentials

```bash
cat > /tmp/velero-credentials << 'EOF'
[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
EOF

kubectl create secret generic velero-s3-credentials \
  --namespace velero \
  --from-file=cloud=./tmp/velero-credentials
```

## Step 4 - Install Velero with Ceph RGW Backend

Get the RGW service endpoint:

```bash
kubectl -n rook-ceph get svc rook-ceph-rgw-my-store
```

Install Velero pointing to Ceph RGW:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket velero-backups \
  --secret-file /tmp/velero-credentials \
  --use-volume-snapshots=false \
  --backup-location-config \
    region=us-east-1,s3ForcePathStyle=true,s3Url=http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80
```

The `s3ForcePathStyle=true` flag is required for Ceph RGW compatibility.

## Step 5 - Verify the Backup Location

```bash
velero backup-location get
```

The status should show `Available`. Run a test backup:

```bash
velero backup create test-backup --include-namespaces default
velero backup describe test-backup
```

## Step 6 - Schedule Regular Backups

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - "*"
    storageLocation: default
    ttl: 720h
```

```bash
kubectl apply -f schedule.yaml
```

## Troubleshooting

If the backup location shows `Unavailable`, check:

```bash
velero backup-location get --output yaml
kubectl -n velero logs deploy/velero
```

Common issues include incorrect endpoint URLs or wrong SSL settings. Use `s3Url` with `http://` for internal cluster access without TLS.

## Summary

Ceph RGW provides a fully S3-compatible object store that integrates seamlessly with Velero for Kubernetes backup. By using an internal RGW endpoint, backups stay within your infrastructure without egress costs. This setup gives you full control over backup storage while leveraging Velero's proven backup and restore capabilities.
