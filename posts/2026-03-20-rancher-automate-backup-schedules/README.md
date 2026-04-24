# How to Automate Backup Schedules in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Backup, Automation, etcd, Longhorn, Disaster-recovery

Description: A comprehensive guide to automating backup schedules in Rancher for etcd, Longhorn volumes, and Rancher itself, ensuring reliable disaster recovery.

## Overview

A robust backup strategy is essential for any production Kubernetes deployment. Rancher environments require backing up at multiple levels: the Rancher management server itself, etcd data in managed clusters, and application persistent volumes (Longhorn). This guide covers automating all three backup types with scheduling, retention policies, and verification.

## Level 1: Back Up the Rancher Server

The Rancher server state is stored in its backing Kubernetes cluster's etcd. The Rancher Backup Operator provides automated backups of the Rancher application state.

### Install Rancher Backup Operator

```bash
# Install from Rancher Apps catalog or via Helm

helm repo add rancher-charts https://charts.rancher.io
helm repo update
helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  --namespace cattle-resources-system \
  --create-namespace \
  --wait
helm install rancher-backup rancher-charts/rancher-backup \
  --namespace cattle-resources-system \
  --wait \
  --set persistence.enabled=true \
  --set persistence.storageClass=longhorn
```

### Create a Scheduled Backup

```yaml
# Rancher Backup resource - daily backup to S3
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-daily-backup
spec:
  # Schedule: daily at 1:00 AM
  schedule: "0 1 * * *"
  retentionCount: 14    # Keep 14 days of backups
  resourceSetName: rancher-resource-set-full

  # Backup destination: S3
  storageLocation:
    s3:
      bucketName: "rancher-backups"
      region: "us-east-1"
      folder: "rancher-server"
      credentialSecretName: s3-backup-secret
      credentialSecretNamespace: cattle-resources-system
      endpoint: "s3.us-east-1.amazonaws.com"

  # Encryption
  encryptionConfigSecretName: rancher-backup-encryption
```

```yaml
# S3 credentials secret
apiVersion: v1
kind: Secret
metadata:
  name: s3-backup-secret
  namespace: cattle-resources-system
type: Opaque
stringData:
  accessKey: "${AWS_ACCESS_KEY_ID}"
  secretKey: "${AWS_SECRET_ACCESS_KEY}"
```

## Level 2: Automate RKE2 etcd Backups

RKE2 includes built-in etcd snapshot functionality:

### Configure Automatic etcd Snapshots

```yaml
# /etc/rancher/rke2/config.yaml on server nodes
# Enable automatic etcd snapshots
etcd-snapshot-schedule-cron: "0 */6 * * *"    # Every 6 hours
etcd-snapshot-retention: 10                     # Keep 10 snapshots

# Save snapshots to S3
etcd-s3: true
etcd-s3-bucket: rke2-etcd-snapshots
etcd-s3-region: us-east-1
etcd-s3-access-key: "${AWS_ACCESS_KEY_ID}"
etcd-s3-secret-key: "${AWS_SECRET_ACCESS_KEY}"
etcd-s3-folder: "cluster-name"
etcd-s3-retention: 10
```

### Trigger Manual Snapshot

```bash
# Trigger an immediate etcd snapshot
rke2 etcd-snapshot save \
  --name pre-upgrade-snapshot

# List local snapshots
rke2 etcd-snapshot list

# List snapshots on S3
rke2 etcd-snapshot \
  --s3 \
  --s3-bucket rke2-etcd-snapshots \
  --s3-region us-east-1 \
  --s3-access-key "${AWS_ACCESS_KEY_ID}" \
  --s3-secret-key "${AWS_SECRET_ACCESS_KEY}" \
  ls
```

## Level 3: Automate Longhorn Volume Backups

### Configure Longhorn Backup Target

```bash
# Set S3 backup target in Longhorn settings
# Longhorn UI → Backup and Restore → Backup Targets
# Or patch directly:
kubectl create secret generic aws-secret \
  --from-literal=AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
  --from-literal=AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
  -n longhorn-system \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl -n longhorn-system patch backuptargets.longhorn.io default \
  --type=merge \
  -p '{"spec":{"backupTargetURL":"s3://longhorn-backups@us-east-1/","credentialSecret":"aws-secret"}}'
```

### Create Recurring Jobs

```yaml
# Daily backup for all production volumes
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"        # Daily at 2 AM
  task: backup
  groups:
    - production
  retain: 14                # 14 days retention
  concurrency: 2            # Max 2 concurrent backups
  labels:
    backup-type: daily
# Hourly snapshot (faster than backup)
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: hourly-snapshot
  namespace: longhorn-system
spec:
  cron: "0 * * * *"        # Hourly
  task: snapshot
  groups:
    - default
  retain: 48                # Keep 48 hourly snapshots
  concurrency: 5
```

### Label Volumes for Backup Groups

```yaml
# Label PVC to include in production backup group
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-data
  namespace: production
  labels:
    recurring-job.longhorn.io/source: "enabled"
    recurring-job-group.longhorn.io/production: "enabled"
spec:
  storageClassName: longhorn
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

## Level 4: Application-Level Backups with Velero

For application-level Kubernetes backups with optional volume snapshots:

```bash
# Install Velero
cat > credentials-velero <<EOF
[default]
aws_access_key_id=${AWS_ACCESS_KEY_ID}
aws_secret_access_key=${AWS_SECRET_ACCESS_KEY}
EOF

helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm repo update
helm install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set configuration.backupStorageLocation[0].name=default \
  --set configuration.backupStorageLocation[0].provider=aws \
  --set configuration.backupStorageLocation[0].bucket=velero-backups \
  --set configuration.backupStorageLocation[0].config.region=us-east-1 \
  --set configuration.volumeSnapshotLocation[0].name=default \
  --set configuration.volumeSnapshotLocation[0].provider=aws \
  --set configuration.volumeSnapshotLocation[0].config.region=us-east-1 \
  --set-file credentials.secretContents.cloud=./credentials-velero \
  --set initContainers[0].name=velero-plugin-for-aws \
  --set initContainers[0].image=velero/velero-plugin-for-aws:${VELERO_AWS_PLUGIN_VERSION} \
  --set initContainers[0].volumeMounts[0].mountPath=/target \
  --set initContainers[0].volumeMounts[0].name=plugins
```

```bash
# Schedule daily Velero backup
velero schedule create daily-backup \
  --schedule="0 3 * * *" \
  --include-namespaces production \
  --include-namespaces staging \
  --exclude-resources events \
  --ttl 336h     # 14 days retention
```

## Backup Verification

Automate backup verification with a CronJob:

```bash
#!/bin/bash
# verify-backups.sh - Runs daily to verify backup health

# Check Rancher backup
LAST_BACKUP=$(kubectl get backups.resources.cattle.io \
  --sort-by=.metadata.creationTimestamp \
  -o jsonpath='{.items[-1:].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)

if [ "${LAST_BACKUP}" != "True" ]; then
  echo "ERROR: Rancher backup not healthy - last status: ${LAST_BACKUP}"
  # Send alert to your monitoring system
fi

# Check RKE2 etcd snapshots
SNAPSHOT_COUNT=$(rke2 etcd-snapshot list 2>/dev/null | tail -n +2 | wc -l)
if [ "${SNAPSHOT_COUNT}" -lt 3 ]; then
  echo "WARNING: Less than 3 etcd snapshots available"
fi

# Check Longhorn backup target connection
BACKUP_STATUS=$(kubectl -n longhorn-system get backuptargets.longhorn.io default \
  -o jsonpath='{.status.available}' 2>/dev/null)
if [ "${BACKUP_STATUS}" != "true" ]; then
  echo "ERROR: Longhorn backup target is not reachable"
fi
```

## Conclusion

A comprehensive Rancher backup strategy involves three layers: Rancher server state via the Backup Operator, RKE2 etcd snapshots for cluster data, and Longhorn recurring jobs for persistent volume data. Automate all three with appropriate schedules and retention policies, and regularly verify that backups are completing successfully. Test your restore procedures quarterly to ensure you can actually recover from backups when needed.
