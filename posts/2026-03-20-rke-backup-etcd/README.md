# How to Back Up etcd in RKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE, Kubernetes, Rancher, etcd, Backup, Disaster Recovery

Description: Learn how to configure automated and manual etcd backups in RKE to protect your cluster state and enable disaster recovery.

## Introduction

etcd is the key-value store that holds all of your Kubernetes cluster state - workload definitions, secrets, RBAC policies, and configuration. Losing etcd data means losing your entire cluster state. RKE provides built-in tooling to create and manage etcd snapshots both on-demand and on a schedule. This guide covers how to configure and execute etcd backups effectively.

Note: RKE1 is in its final/end-of-life phase. Use this guide for existing RKE1 clusters, and plan new clusters or migrations on RKE2.

## Understanding RKE etcd Backup Modes

RKE always saves snapshots locally on the etcd nodes and can also upload them to an S3-compatible object store:
1. **Local**: Snapshots are saved on the etcd nodes themselves
2. **S3-compatible**: Snapshots are saved locally and uploaded to an S3-compatible object store (AWS S3, MinIO, etc.)

## Configuring Automated etcd Backups in cluster.yml

### Local Backup Configuration

```yaml
# cluster.yml

services:
  etcd:
    backup_config:
      # Enable automatic snapshots
      enabled: true
      # Snapshot interval in hours
      interval_hours: 6
      # Number of snapshots to retain
      retention: 8
```

### S3-Compatible Backup Configuration

```yaml
# cluster.yml
services:
  etcd:
    backup_config:
      enabled: true
      interval_hours: 6
      retention: 8
      # S3 configuration
      s3backupconfig:
        access_key: "AKIAIOSFODNN7EXAMPLE"
        secret_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        bucket_name: "my-rke-backups"
        region: "us-east-1"
        endpoint: "s3.amazonaws.com"
        folder: "cluster-name"   # Optional folder prefix
```

For MinIO (self-hosted S3):

```yaml
# cluster.yml
services:
  etcd:
    backup_config:
      enabled: true
      interval_hours: 6
      retention: 8
      s3backupconfig:
        access_key: "minio-access-key"
        secret_key: "minio-secret-key"
        bucket_name: "rke-backups"
        endpoint: "minio.example.com:9000"
        folder: "production"
```

After updating `cluster.yml`, apply the changes:

```bash
rke up --config cluster.yml
```

## Taking Manual Snapshots

Take on-demand snapshots before major changes like upgrades or node modifications.

```bash
# Take a named snapshot (stored locally on etcd nodes)
rke etcd snapshot-save \
    --name "before-upgrade-$(date +%Y%m%d-%H%M)" \
    --config cluster.yml

# Output includes: Finished saving/uploading snapshot [snapshot-name] on all etcd hosts
```

For S3 upload:

```bash
# Take a snapshot and upload to S3
rke etcd snapshot-save \
    --name "manual-backup-$(date +%Y%m%d)" \
    --config cluster.yml \
    --s3 \
    --access-key "AKIAIOSFODNN7EXAMPLE" \
    --secret-key "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
    --bucket-name "my-rke-backups" \
    --region "us-east-1" \
    --folder "production"
```

## Listing Existing Snapshots

```bash
# RKE does not provide a snapshot-list subcommand; list local snapshots on an etcd node
ssh ubuntu@192.168.1.101 'sudo ls -lh /opt/rke/etcd-snapshots/'

# Example output:
# -rw------- 1 root root 12M Jan 15 12:00 before-upgrade-20240115-1200.zip
```

## Locating Snapshots on etcd Nodes

Local snapshots are stored on each etcd node:

```bash
# Connect to an etcd node and list snapshots
ssh ubuntu@192.168.1.101

# Snapshot location
sudo ls -la /opt/rke/etcd-snapshots/
```

## Verifying Snapshot Integrity

```bash
SNAPSHOT_NAME="before-upgrade-20260423-1200"

# Copy the snapshot from the etcd node. RKE snapshot archives are usually owned by root.
ssh ubuntu@192.168.1.101 "sudo cat /opt/rke/etcd-snapshots/${SNAPSHOT_NAME}.zip" > "${SNAPSHOT_NAME}.zip"

# Unzip and inspect
rm -rf /tmp/etcd-verify && mkdir -p /tmp/etcd-verify
unzip "${SNAPSHOT_NAME}.zip" -d /tmp/etcd-verify/

# Use etcdctl to verify (requires etcd installed locally)
ETCDCTL_API=3 etcdctl snapshot status "/tmp/etcd-verify/backup/${SNAPSHOT_NAME}" \
    --write-out=table
```

## Automated Backup Script

Here is a shell script for automated backups with notifications:

```bash
#!/bin/bash
# rke-etcd-backup.sh

CLUSTER_CONFIG="/home/ubuntu/rke/cluster.yml"
BACKUP_NAME="scheduled-backup-$(date +%Y%m%d-%H%M)"
LOG_FILE="/home/ubuntu/rke/rke-backup.log"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

notify_slack() {
    curl -s -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"$1\"}"
}

log "Starting etcd backup: $BACKUP_NAME"

if rke etcd snapshot-save \
    --name "$BACKUP_NAME" \
    --config "$CLUSTER_CONFIG" >> "$LOG_FILE" 2>&1; then
    log "Backup successful: $BACKUP_NAME"
    notify_slack "✅ RKE etcd backup succeeded: $BACKUP_NAME"
else
    log "ERROR: Backup failed for $BACKUP_NAME"
    notify_slack "❌ RKE etcd backup FAILED: $BACKUP_NAME"
    exit 1
fi
```

```bash
chmod +x rke-etcd-backup.sh

# Schedule with cron (every 6 hours)
echo "0 */6 * * * ubuntu /home/ubuntu/rke-etcd-backup.sh" | sudo tee -a /etc/cron.d/rke-backup
```

## Best Practices

1. **Test restores regularly**: A backup is only useful if you can restore from it. Test the restore process in a staging environment quarterly.

2. **Use S3 for off-node storage**: Local backups are lost if all etcd nodes fail. Always configure S3 as the backup destination for production.

3. **Retain multiple snapshots**: Keep at least 24 hours of rolling snapshots to recover from logical corruption that may not be immediately apparent.

4. **Take pre-change snapshots**: Always take a manual snapshot before upgrades, node changes, or applying large configuration changes.

5. **Monitor backup success**: Set up alerts if scheduled backups fail.

## Conclusion

etcd backups are the most important disaster recovery mechanism for your RKE cluster. By configuring automated snapshots with appropriate retention policies and storing them in S3-compatible object storage, you protect your cluster state against hardware failures, accidental deletions, and software bugs. Combine automated backups with a tested restore procedure to ensure business continuity.
