# How to Deploy Velero for Kubernetes Backup via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Velero, Kubernetes, Backup, Disaster Recovery

Description: Deploy Velero Kubernetes backup and restore tool via Portainer for cluster state and persistent volume backup.

## Introduction

Velero is an open-source tool for safely backing up and restoring Kubernetes cluster resources and persistent volumes. It supports AWS S3, Azure Blob Storage, GCS, and MinIO as backup backends. This guide deploys Velero into a Kubernetes cluster managed by Portainer.

## Prerequisites

- Portainer with a Kubernetes cluster connected
- `kubectl` and Velero CLI installed locally
- An S3-compatible backup bucket (AWS S3 or MinIO)

## Step 1: Install the Velero CLI

```bash
# Download Velero CLI (Linux x86_64)

VERSION=v1.18.0
curl -L https://github.com/velero-io/velero/releases/download/${VERSION}/velero-${VERSION}-linux-amd64.tar.gz \
  -o velero.tar.gz
tar -xzf velero.tar.gz
sudo mv velero-${VERSION}-linux-amd64/velero /usr/local/bin/

velero version --client-only
```

## Step 2: Create S3 Credentials

```bash
cat > /tmp/credentials-velero << 'EOF'
[default]
aws_access_key_id=your-access-key-id
aws_secret_access_key=your-secret-access-key
EOF
```

## Step 3: Install Velero into the Kubernetes Cluster

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.14.0 \
  --bucket my-velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --use-node-agent \
  --secret-file /tmp/credentials-velero
```

For MinIO (S3-compatible):
```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.14.0 \
  --bucket velero-backups \
  --backup-location-config region=minio,s3ForcePathStyle=true,s3Url=http://<minio-endpoint>:9000 \
  --use-volume-snapshots=false \
  --use-node-agent \
  --secret-file /tmp/credentials-velero
```

## Step 4: Manage Velero via Portainer

In Portainer, navigate to your Kubernetes cluster and go to **Applications**, then filter to the `velero` namespace. You will see:
- `velero` deployment (the main Velero server)
- `node-agent` DaemonSet (for file-system based volume backups)

You can view logs, check pod status, and manage ConfigMaps via Portainer's UI.

## Step 5: Create and Schedule Backups

```bash
# Create a one-time backup of all resources
velero backup create full-cluster-backup

# Back up a specific namespace
velero backup create app-backup --include-namespaces production

# Create a scheduled backup (every night at 1:00 AM UTC)
velero schedule create nightly-backup \
  --schedule="CRON_TZ=UTC 0 1 * * *" \
  --include-namespaces production,staging \
  --ttl 720h   # Keep for 30 days

# Check backup status
velero backup describe full-cluster-backup
velero backup logs full-cluster-backup
```

## Step 6: Restore from Backup

```bash
# List available backups
velero backup get

# Restore all resources from a backup
velero restore create --from-backup full-cluster-backup

# Restore a specific namespace
velero restore create --from-backup app-backup \
  --include-namespaces production

# Check restore status
velero restore get
velero restore describe <restore-name>
```

## Step 7: Backup with Volume Data (File System Backup)

```bash
# Annotate pods to include PVC data in backup
kubectl annotate pod -n production <pod-name> \
  backup.velero.io/backup-volumes=data-volume

# Or annotate the pod template in a deployment so new pods are backed up
kubectl patch deployment -n production myapp --type merge \
  -p '{"spec":{"template":{"metadata":{"annotations":{"backup.velero.io/backup-volumes":"data-volume"}}}}}'
```

## Conclusion

Velero backs up Kubernetes resource manifests (YAML) to object storage and optionally snapshots persistent volumes via CSI or cloud-native volume snapshots. The `node-agent` DaemonSet enables file-system level backup via `--use-node-agent` when CSI or native volume snapshots are unavailable. The older restic-based backup path is deprecated in current Velero releases. Schedule backups with appropriate TTL (time-to-live) to manage storage costs. Test restores regularly to verify backup validity.
