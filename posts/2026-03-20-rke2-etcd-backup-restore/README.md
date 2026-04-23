# How to Back Up and Restore RKE2 etcd - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, etcd, Backup, Restore, Disaster Recovery

Description: A comprehensive guide to backing up and restoring RKE2's embedded etcd, including S3 integration and disaster recovery procedures.

etcd is the backing store for all Kubernetes cluster state. Regularly backing up etcd is critical for disaster recovery - if etcd data is lost without a backup, your entire cluster state (deployments, services, configs, etc.) is gone. RKE2 provides built-in tools for etcd backup and restore. This guide covers the complete backup and restore procedures.

## Prerequisites

- RKE2 server cluster running
- Sufficient disk space for snapshots
- S3 bucket (optional, recommended for production)
- Root access to server nodes

## Understanding RKE2 etcd Snapshots

RKE2 creates etcd snapshots as files that capture the complete cluster state at a point in time. By default, RKE2 stores snapshots at:
`/var/lib/rancher/rke2/server/db/snapshots/`

## Step 1: Configure Automatic Snapshots

```yaml
# /etc/rancher/rke2/config.yaml - Automatic snapshot configuration

# Enable periodic snapshots (on by default)
etcd-snapshot-schedule-cron: "0 */6 * * *"   # Every 6 hours

# Number of local snapshots to retain
etcd-snapshot-retention: 10                    # Keep last 10 snapshots

# Custom snapshot directory (optional)
# etcd-snapshot-dir: /mnt/backup/rke2-snapshots

# S3 configuration (highly recommended for production)
etcd-s3: true
etcd-s3-bucket: my-cluster-etcd-backups
etcd-s3-region: us-east-1
# Use IAM role instead of keys when possible
# etcd-s3-access-key: ACCESS_KEY
# etcd-s3-secret-key: SECRET_KEY

# Optional: Custom S3 folder
etcd-s3-folder: production-cluster

# Optional: S3-compatible endpoint (MinIO, etc.)
# etcd-s3-endpoint: https://minio.example.com
```

```bash
# Restart RKE2 to apply snapshot configuration
sudo systemctl restart rke2-server

# Verify snapshot configuration is active
sudo journalctl -u rke2-server | grep -i snapshot
```

## Step 2: Take Manual Snapshots

```bash
# Take an immediate snapshot before any major change
sudo rke2 etcd-snapshot save \
  --name pre-upgrade-$(date +%Y%m%d-%H%M%S)

# Take a named snapshot
sudo rke2 etcd-snapshot save \
  --name "my-cluster-backup-$(date +%Y%m%d)"

# Save to S3 (if S3 is configured in config.yaml)
sudo rke2 etcd-snapshot save \
  --name prod-backup-$(date +%Y%m%d) \
  --s3

# Verify the snapshot was created
ls -lh /var/lib/rancher/rke2/server/db/snapshots/
```

## Step 3: List Available Snapshots

```bash
# List local snapshots
sudo rke2 etcd-snapshot list

# Expected output:
# NAME                                    LOCATION  SIZE    CREATED
# etcd-snapshot-xxxx-1234567890          local     50 MiB  2026-03-20T00:00:00Z
# pre-upgrade-20260320-120000            local     51 MiB  2026-03-20T12:00:00Z

# List S3 snapshots
sudo rke2 etcd-snapshot ls \
  --s3 \
  --s3-bucket my-cluster-etcd-backups \
  --s3-folder production-cluster \
  --s3-region us-east-1

# Get snapshot details using etcdutl (install it if it is not already available)
sudo etcdutl --write-out=table snapshot status \
  /var/lib/rancher/rke2/server/db/snapshots/etcd-snapshot-xxxxx
```

## Step 4: Restore from a Snapshot

**Warning**: etcd restore stops the RKE2 cluster. Plan for downtime.

### Single-Node Restore

```bash
# IMPORTANT: Stop all server nodes before restoring
sudo systemctl stop rke2-server

# Restore from a local snapshot
sudo rke2 server \
  --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/rke2/server/db/snapshots/etcd-snapshot-XXXX \
  --etcd-s3=false

# Alternative: Restore from a different snapshot path
sudo rke2 server \
  --cluster-reset \
  --cluster-reset-restore-path=/path/to/snapshot \
  --etcd-s3=false

# Restart the server
sudo systemctl start rke2-server

# Monitor restoration
sudo journalctl -u rke2-server -f
```

### Multi-Node HA Restore

For HA clusters, restore must be done carefully:

```bash
# Step 1: Stop RKE2 on ALL server nodes
# Run on each server node:
sudo systemctl stop rke2-server

# Step 2: On the PRIMARY restore node only:
sudo rke2 server \
  --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/rke2/server/db/snapshots/SNAPSHOT_NAME \
  --etcd-s3=false

# This command will:
# 1. Restore etcd from the snapshot
# 2. Reset etcd membership to the primary node

# Step 3: Start RKE2 normally on the primary node
sudo systemctl start rke2-server

# Step 4: Wait for the primary node to be ready
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
export PATH=$PATH:/var/lib/rancher/rke2/bin
kubectl wait node/$(hostname) --for=condition=Ready --timeout=300s

# Step 5: Confirm the server token used by peer server nodes
sudo cat /var/lib/rancher/rke2/server/token

# Step 6: On OTHER server nodes, ensure config uses that token and rejoin
# IMPORTANT: Remove the old etcd data before rejoining
sudo rm -rf /var/lib/rancher/rke2/server/db/

# Update config.yaml if the token is explicitly configured
sudo vi /etc/rancher/rke2/config.yaml

# Restart on other server nodes
sudo systemctl start rke2-server
```

### Restore from S3

```bash
# Restore directly from S3
sudo rke2 server \
  --cluster-reset \
  --cluster-reset-restore-path=snapshot-name \
  --etcd-s3 \
  --etcd-s3-bucket=my-cluster-etcd-backups \
  --etcd-s3-folder=production-cluster \
  --etcd-s3-region=us-east-1
```

## Step 5: Verify the Restore

```bash
# After restart, verify cluster state was restored
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
export PATH=$PATH:/var/lib/rancher/rke2/bin
kubectl get nodes
kubectl get pods -A

# Check that all workloads are back
kubectl get deployments -A
kubectl get services -A

# Check that configurations were restored
kubectl get configmaps -n kube-system | head -10

# If monitoring is set up, check that alerts are clear
```

## Step 6: Set Up Regular Backup Verification

```bash
# Script to verify backup integrity weekly
cat > /etc/cron.weekly/verify-etcd-backup << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/etcd-backup-verify.log"
echo "$(date) - Starting backup verification" >> $LOG_FILE

# Check that recent snapshots exist (less than 7 hours old)
LATEST=$(ls -t /var/lib/rancher/rke2/server/db/snapshots/ | head -1)
if [ -z "$LATEST" ]; then
  echo "$(date) ERROR: No snapshots found!" >> $LOG_FILE
  exit 1
fi

# Check snapshot age
SNAPSHOT_AGE=$(( $(date +%s) - $(stat -c %Y /var/lib/rancher/rke2/server/db/snapshots/$LATEST) ))
if [ $SNAPSHOT_AGE -gt 25200 ]; then  # 7 hours in seconds
  echo "$(date) WARNING: Latest snapshot is more than 7 hours old" >> $LOG_FILE
fi

echo "$(date) OK: Latest snapshot: $LATEST (${SNAPSHOT_AGE}s old)" >> $LOG_FILE
EOF

chmod +x /etc/cron.weekly/verify-etcd-backup
```

## Conclusion

Regular etcd backups are a non-negotiable requirement for production Kubernetes clusters. RKE2's built-in snapshot capabilities, combined with S3 storage for off-site backups, provide a robust disaster recovery foundation. Always test your restore procedure before you need it - discovering issues during an actual disaster is far more costly. Aim for a Recovery Time Objective (RTO) of under 30 minutes by practicing restore procedures in a test environment.
