# How to Configure Longhorn Disaster Recovery Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Disaster Recovery, Backup, High Availability

Description: Learn how to set up Longhorn Disaster Recovery volumes that continuously sync from a backup target to enable rapid failover in multi-cluster environments.

## Introduction

Longhorn Disaster Recovery (DR) volumes are a special type of volume that continuously synchronizes data from an external backup target. Unlike standard restore operations which create a static copy at a point in time, DR volumes stay in sync with the latest backups, enabling rapid failover with minimal data loss. This guide explains how to configure and use Longhorn DR volumes.

## Understanding DR Volumes

DR volumes differ from regular volumes in several ways:

| Feature | Regular Volume | DR Volume |
|---------|---------------|-----------|
| Mode | Read-Write | Read-Only (until activated) |
| Sync | None | Continuous sync from backup |
| Use case | Active workloads | Standby for failover |
| Activation | N/A | Manual failover trigger |

DR volumes are ideal for:
- Multi-cluster active-passive setups
- RPO-sensitive applications
- Regulatory requirements for geographic redundancy

## Architecture Overview

```text
Cluster A (Primary)                    Cluster B (Secondary)
┌─────────────────────┐               ┌─────────────────────┐
│  App Pod            │               │  Standby (inactive) │
│  ↕                  │               │  ↕                  │
│  Longhorn Volume    │──→ Backup ──→│  DR Volume          │
│  (Active)          │    Target     │  (Sync continuously)│
└─────────────────────┘               └─────────────────────┘
```

## Prerequisites

- Two Kubernetes clusters, each with Longhorn installed
- A shared external backup target (S3, NFS, Azure Blob, or GCS) accessible from both clusters
- Recurring backup jobs configured on the primary cluster

## Step 1: Configure Backup on the Primary Cluster

On Cluster A (primary), ensure backups are being created:

```yaml
# recurring-backup-primary.yaml - Frequent backups from primary cluster

apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: frequent-backup
  namespace: longhorn-system
spec:
  # Every 30 minutes for low RPO
  cron: "*/30 * * * *"
  task: "backup"
  # Keep 48 backups (24 hours at 30-minute intervals)
  retain: 48
  concurrency: 2
```

```bash
# Apply on primary cluster
kubectl apply -f recurring-backup-primary.yaml

# Associate with volumes that need DR
kubectl label volumes.longhorn.io my-critical-volume \
  -n longhorn-system \
  "recurring-job.longhorn.io/frequent-backup=enabled"
```

## Step 2: Configure the Same Backup Target on the Secondary Cluster

On Cluster B (secondary), configure the same backup target:

```bash
# Apply the same backup target credentials (same S3 bucket as primary)
kubectl create secret generic longhorn-backup-secret \
  -n longhorn-system \
  --from-literal=AWS_ACCESS_KEY_ID="your-access-key" \
  --from-literal=AWS_SECRET_ACCESS_KEY="your-secret-key"

# Set the backup target to the same S3 bucket as primary
kubectl patch settings.longhorn.io backup-target \
  -n longhorn-system \
  --type merge \
  -p '{"value": "s3://my-backup-bucket@us-east-1/"}'

kubectl patch settings.longhorn.io backup-target-credential-secret \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhorn-backup-secret"}'
```

## Step 3: Create a DR Volume on the Secondary Cluster

### Via Longhorn UI

1. Open the Longhorn UI on Cluster B
2. Navigate to **Backup**
3. Find the backup volume from the primary cluster
4. Click the three-dot menu (⋮)
5. Select **Create Disaster Recovery Volume**
6. Configure the DR volume settings
7. Click **OK**

### Via kubectl

```yaml
# dr-volume.yaml - Create a DR volume synced from backup
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: dr-my-critical-volume
  namespace: longhorn-system
spec:
  size: "10737418240"    # Must match the source volume size
  numberOfReplicas: 2    # DR volumes typically need fewer replicas
  # Set the backup URL for this DR volume to sync from
  fromBackup: "s3://my-backup-bucket@us-east-1/?volume=my-critical-volume"
  # Mark this as a DR volume
  standby: true
  accessMode: rwo
```

```bash
# Apply on the secondary cluster
kubectl apply -f dr-volume.yaml

# Watch the DR volume sync progress
kubectl get volumes.longhorn.io dr-my-critical-volume \
  -n longhorn-system -w
```

## Step 4: Monitor DR Volume Sync

```bash
# Check DR volume status and last sync time
kubectl get volumes.longhorn.io dr-my-critical-volume \
  -n longhorn-system -o yaml | grep -A 10 "status:"

# The volume should show:
# - state: detached
# - standby: true
# - lastBackup: <timestamp of latest synced backup>
```

In the Longhorn UI, DR volumes show with a **Standby** indicator and display the last backup synchronization time.

## Step 5: Perform Failover (Activate the DR Volume)

When the primary cluster fails or you need to failover:

### Via Longhorn UI

1. Navigate to **Volume** on the secondary cluster
2. Find the DR volume
3. Click the three-dot menu (⋮)
4. Select **Activate**
5. Confirm the activation

### Via kubectl

```bash
# Activate the DR volume for read-write access
kubectl patch volumes.longhorn.io dr-my-critical-volume \
  -n longhorn-system \
  --type merge \
  -p '{"spec": {"standby": false}}'

# Monitor activation
kubectl get volumes.longhorn.io dr-my-critical-volume \
  -n longhorn-system -w
```

## Step 6: Create PV/PVC for the Activated DR Volume

After activation, create Kubernetes resources to use the volume:

```yaml
# pv-dr-activated.yaml - PV for the activated DR volume
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-dr-my-critical-volume
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: longhorn
  csi:
    driver: driver.longhorn.io
    fsType: ext4
    volumeHandle: dr-my-critical-volume
    volumeAttributes:
      numberOfReplicas: "2"
      staleReplicaTimeout: "2880"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-dr-my-critical-volume
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  volumeName: pv-dr-my-critical-volume
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f pv-dr-activated.yaml
kubectl get pvc pvc-dr-my-critical-volume
```

## Monitoring DR Sync Status

Set up monitoring to alert when DR volumes are out of sync:

```bash
# Check how far behind the DR volume is from the primary
kubectl get volumes.longhorn.io -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,STANDBY:.spec.standby,LAST_BACKUP:.status.lastBackup" | \
  grep "true"
```

## Conclusion

Longhorn DR volumes provide a practical solution for cross-cluster disaster recovery with manageable RPO. The continuous sync mechanism ensures that your secondary cluster always has a near-current copy of critical volume data. By monitoring DR volume sync status and regularly testing failover procedures, you can build confidence in your disaster recovery capabilities and meet stringent SLA requirements.
