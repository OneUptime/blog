# How to Create Longhorn Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Backup, Data Protection

Description: Learn how to create manual and automated backups of Longhorn volumes to external storage targets for disaster recovery and long-term data retention.

## Introduction

While Longhorn snapshots provide point-in-time copies stored locally on the cluster, backups store volume data in external storage systems such as S3, NFS, or Azure Blob. This separation makes backups suitable for disaster recovery scenarios where the entire cluster might be lost. This guide covers creating both manual and automated Longhorn backups.

## Prerequisites

Before creating backups, you must configure a backup target. A backup target is an external storage location where Longhorn stores volume backup data.

### Quick Backup Target Setup (S3 Example)

```bash
# Create a Kubernetes secret with your S3 credentials

kubectl create secret generic longhorn-backup-secret \
  -n longhorn-system \
  --from-literal=AWS_ACCESS_KEY_ID="your-access-key-id" \
  --from-literal=AWS_SECRET_ACCESS_KEY="your-secret-access-key" \
  --from-literal=AWS_ENDPOINTS=""  # Leave empty for AWS S3

# Configure the backup target
kubectl patch settings.longhorn.io backup-target \
  -n longhorn-system \
  --type merge \
  -p '{"value": "s3://your-bucket-name@us-east-1/"}'

# Link the secret to Longhorn
kubectl patch settings.longhorn.io backup-target-credential-secret \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhorn-backup-secret"}'
```

## Creating a Manual Backup via Longhorn UI

1. Open the Longhorn UI
2. Navigate to **Volume**
3. Click on the three-dot menu next to the volume
4. Select **Create Backup**
5. Add labels (optional) to categorize the backup
6. Click **OK**

The backup will appear in the **Backup** section of the Longhorn UI.

## Creating a Backup via kubectl

```yaml
# longhorn-backup.yaml - Create a backup of a Longhorn volume
apiVersion: longhorn.io/v1beta2
kind: Backup
metadata:
  name: my-volume-backup-20260320
  namespace: longhorn-system
spec:
  # Reference to the Longhorn snapshot to back up (the volume is derived from the snapshot)
  snapshotName: my-volume-snapshot-20260320
  # Optional: "incremental" (default) or "full"
  backupMode: incremental
  # Optional labels for organization
  labels:
    type: manual
    date: "2026-03-20"
```

```bash
kubectl apply -f longhorn-backup.yaml

# Monitor backup progress
kubectl get backups.longhorn.io -n longhorn-system
kubectl describe backup.longhorn.io my-volume-backup-20260320 -n longhorn-system
```

## Creating Recurring Backups (Automated)

For automated backups, create a `RecurringJob` with the `backup` task type:

```yaml
# recurring-backup.yaml - Daily backup job
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  # Run every day at 3 AM
  cron: "0 3 * * *"
  # Backup task (sends data to external backup target)
  task: "backup"
  # Keep last 14 daily backups
  retain: 14
  concurrency: 2
  labels:
    schedule: daily-backup
---
# recurring-backup-weekly.yaml - Weekly full backup
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: weekly-backup
  namespace: longhorn-system
spec:
  cron: "0 4 * * 0"    # Every Sunday at 4 AM
  task: "backup"
  retain: 8             # Keep 8 weeks of backups
  concurrency: 1
  labels:
    schedule: weekly-backup
```

```bash
kubectl apply -f recurring-backup.yaml
```

## Associating Backup Jobs with Volumes

```bash
# Label a volume to include it in the daily backup job
kubectl label volumes.longhorn.io my-production-volume \
  -n longhorn-system \
  "recurring-job.longhorn.io/daily-backup=enabled"

# Apply to multiple volumes using a script
for vol in $(kubectl get volumes.longhorn.io -n longhorn-system -o name); do
  kubectl label "$vol" \
    -n longhorn-system \
    "recurring-job.longhorn.io/daily-backup=enabled"
done
```

## Monitoring Backup Status

```bash
# List all backups in Longhorn
kubectl get backups.longhorn.io -n longhorn-system

# Check backup details including size and completion time
kubectl describe backup.longhorn.io <backup-name> -n longhorn-system

# List backup volumes (one entry per volume that has backups in the backup store)
kubectl get backupvolumes.longhorn.io -n longhorn-system
```

In the Longhorn UI, navigate to **Backup** to see all backups organized by volume.

## Understanding Incremental Backups

Longhorn backups are incremental after the first full backup:

1. **First backup**: Full backup of all data blocks
2. **Subsequent backups**: Only changed blocks since the last backup
3. **Storage efficiency**: Incremental backups use significantly less space than full backups

```bash
# View backup details including incremental information
kubectl describe backupvolume.longhorn.io <volume-name> -n longhorn-system
```

## Backup Labels and Filtering

Add labels to backups for organization and filtering:

```bash
# Create a backup with labels (via Longhorn API)
curl -X POST http://longhorn-frontend.longhorn-system.svc/v1/backupvolumes/<volume>/backups \
  -H "Content-Type: application/json" \
  -d '{"labels": {"environment": "production", "team": "data"}}'
```

## Verifying Backup Integrity

```bash
# Longhorn provides a backup verification feature
# Navigate to Backup in the Longhorn UI
# Select a backup and use "Check Integrity" if available

# Alternatively, test restore in a non-production namespace using a CSI VolumeSnapshot
# that references the Longhorn backup, then create a PVC from that VolumeSnapshot.
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restore-test
  namespace: test-namespace
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
  dataSource:
    apiGroup: snapshot.storage.k8s.io
    kind: VolumeSnapshot
    name: my-volume-backup-snapshot
EOF
```

## Conclusion

Longhorn backups provide a robust off-cluster data protection mechanism that is essential for true disaster recovery. By combining recurring backup jobs with appropriate retention policies, you can meet your organization's recovery point objectives (RPO). Always test your backup and restore procedures regularly, and ensure that your external backup storage is properly secured and accessible from all cluster nodes.
