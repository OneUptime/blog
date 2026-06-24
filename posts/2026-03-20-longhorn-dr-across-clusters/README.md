# How to Set Up Longhorn DR Across Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Disaster Recovery, Multi-Cluster, Storage

Description: A comprehensive guide for configuring cross-cluster disaster recovery using Longhorn, enabling automatic data synchronization and failover between primary and secondary Kubernetes clusters.

## Introduction

Setting up Disaster Recovery (DR) across multiple Kubernetes clusters with Longhorn provides geographic redundancy and business continuity for critical workloads. This guide walks through a complete multi-cluster DR setup including infrastructure configuration, data synchronization, failover procedures, and failback strategies.

## Architecture

The DR setup involves:
- **Primary Cluster**: Runs active workloads, periodically backs up to shared storage
- **Secondary Cluster**: Maintains DR volumes synced from the backup target
- **Shared Backup Target**: S3 or similar object storage accessible from both clusters

## Prerequisites

- Two Kubernetes clusters (can be in different regions/data centers)
- A shared backup target accessible from both clusters (S3, NFS, Azure Blob, GCS)
- Longhorn v1.4 or later installed on both clusters
- `kubectl` contexts configured for both clusters

```bash
# Verify kubectl contexts

kubectl config get-contexts

# Set aliases for easier multi-cluster management
alias kp="kubectl --context=primary-cluster"
alias ks="kubectl --context=secondary-cluster"
```

## Phase 1: Configure the Primary Cluster

### Step 1: Verify Longhorn on Primary

```bash
# Check Longhorn is running on the primary cluster
kp get pods -n longhorn-system

# Verify backup target is configured
kp get settings.longhorn.io backup-target -n longhorn-system -o yaml
```

### Step 2: Create and Apply Recurring Backup Jobs

```yaml
# primary-recurring-backup.yaml - Backup configuration for primary cluster
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: dr-backup-hourly
  namespace: longhorn-system
spec:
  # Hourly backups for low RPO
  cron: "0 * * * *"
  task: "backup"
  retain: 48    # Keep 48 hours of hourly backups
  concurrency: 3
  labels:
    dr: "enabled"
    frequency: "hourly"
---
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: dr-backup-daily
  namespace: longhorn-system
spec:
  cron: "0 0 * * *"
  task: "backup"
  retain: 30    # Keep 30 daily backups
  concurrency: 2
  labels:
    dr: "enabled"
    frequency: "daily"
```

```bash
kp apply -f primary-recurring-backup.yaml
```

### Step 3: Label Critical Volumes for DR Backups

```bash
# Label all volumes that need DR protection
for vol in my-app-data database-data config-data; do
  kp label volumes.longhorn.io $vol \
    -n longhorn-system \
    "recurring-job.longhorn.io/dr-backup-hourly=enabled" \
    "recurring-job.longhorn.io/dr-backup-daily=enabled"
done

# Verify labels
kp get volumes.longhorn.io -n longhorn-system --show-labels
```

## Phase 2: Configure the Secondary Cluster

### Step 1: Configure Same Backup Target

```bash
# Create credentials secret on secondary cluster (same credentials as primary)
ks create secret generic longhorn-backup-secret \
  -n longhorn-system \
  --from-literal=AWS_ACCESS_KEY_ID="same-key-as-primary" \
  --from-literal=AWS_SECRET_ACCESS_KEY="same-secret-as-primary"

# Set the SAME backup target URL as the primary cluster
ks patch settings.longhorn.io backup-target \
  -n longhorn-system \
  --type merge \
  -p '{"value": "s3://shared-backup-bucket@us-east-1/"}'

ks patch settings.longhorn.io backup-target-credential-secret \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhorn-backup-secret"}'
```

### Step 2: Create DR Volumes on Secondary

Once the secondary cluster can see the backups, identify the latest backups and create DR volumes:

```bash
# List available backup volumes from the shared target
ks get backupvolumes.longhorn.io -n longhorn-system

# List available backups, then capture the exact backup URL and size
ks get backups.longhorn.io -n longhorn-system
ks get backup.longhorn.io <BACKUP-NAME> -n longhorn-system -o jsonpath='{.status.url}{"\n"}'
ks get backup.longhorn.io <BACKUP-NAME> -n longhorn-system -o jsonpath='{.status.volumeSize}{"\n"}'
```

Create DR volumes for each critical volume using the exact backup URL and volume size:

```yaml
# dr-volumes.yaml - DR volumes on the secondary cluster
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: dr-my-app-data
  namespace: longhorn-system
spec:
  size: "21474836480"   # Must exactly match .status.volumeSize for the selected backup
  numberOfReplicas: 2
  fromBackup: "s3://shared-backup-bucket@us-east-1/?backup=backup-1234567890abcdef&volume=my-app-data"
  Standby: true         # This creates the volume as a DR/standby volume
  accessMode: rwo
---
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: dr-database-data
  namespace: longhorn-system
spec:
  size: "107374182400"  # Must exactly match .status.volumeSize for the selected backup
  numberOfReplicas: 2
  fromBackup: "s3://shared-backup-bucket@us-east-1/?backup=backup-fedcba0987654321&volume=database-data"
  Standby: true
  accessMode: rwo
```

```bash
ks apply -f dr-volumes.yaml

# Monitor DR volume sync status
ks get volumes.longhorn.io -n longhorn-system -w
```

## Phase 3: Monitoring and Alerting

### Check DR Sync Status

```bash
# Custom script to check DR volume sync status
cat << 'EOF' > check-dr-status.sh
#!/bin/bash
echo "=== DR Volume Status ==="
kubectl --context=secondary-cluster get volumes.longhorn.io \
  -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,STANDBY:.spec.Standby,LAST_BACKUP:.status.lastBackup,STATE:.status.state" | \
  grep true
EOF
chmod +x check-dr-status.sh
./check-dr-status.sh
```

## Phase 4: Failover Procedure

When the primary cluster becomes unavailable:

### Step 1: Verify Primary is Down

```bash
# Try to reach primary cluster
kp get nodes || echo "Primary cluster unreachable"
```

### Step 2: Activate DR Volumes

```bash
# Activate all DR volumes on secondary cluster
for vol in $(ks get volumes.longhorn.io -n longhorn-system \
  -o jsonpath='{.items[?(@.spec.Standby==true)].metadata.name}'); do
  echo "Activating DR volume: $vol"
  ks patch volumes.longhorn.io $vol \
    -n longhorn-system \
    --type merge \
    -p '{"spec": {"Standby": false, "frontend": "blockdev"}}'
done

# Wait for volumes to become ready
ks get volumes.longhorn.io -n longhorn-system -w
```

### Step 3: Deploy Workloads on Secondary

```bash
# Create PV/PVC bindings that point to the activated Longhorn volumes
# Make sure each PV csi.volumeHandle matches the activated DR volume name
ks apply -f dr-pvs-and-pvcs.yaml

# Apply your application manifests on the secondary cluster
ks apply -f app-deployments.yaml
ks apply -f app-services.yaml
```

## Phase 5: Failback Procedure

When the primary cluster is recovered:

```bash
# Step 1: Sync current state from secondary back to the shared backup
# This requires creating backups on the secondary before failing back

# Step 2: Create backups of DR volumes on secondary
for vol in $(ks get volumes.longhorn.io -n longhorn-system \
  -o jsonpath='{.items[?(@.spec.Standby==false)].metadata.name}'); do
  echo "Creating backup for failback: $vol"
  # Trigger backup via Longhorn UI or API
done

# Step 3: Scale down workloads on secondary
ks scale deployments --all --replicas=0 -n default

# Step 4: Restore volumes on primary from the secondary's backup URLs
# and recreate the PV/PVC bindings to point workloads back at the restored volumes
# Step 5: Scale up workloads on primary
kp apply -f primary-pvs-and-pvcs.yaml
kp apply -f app-deployments.yaml
```

## Conclusion

Setting up Longhorn DR across clusters provides a robust foundation for business continuity in Kubernetes environments. The combination of frequent automated backups, continuously synced DR volumes, and well-defined failover procedures enables you to recover from cluster-wide failures with minimal data loss and downtime. Regular DR drills are essential to verify that your procedures work correctly before a real disaster strikes.
