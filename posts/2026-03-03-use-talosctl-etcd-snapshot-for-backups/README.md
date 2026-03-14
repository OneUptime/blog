# How to Use talosctl etcd snapshot for Backups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Etcd, Backup, Disaster Recovery, Kubernetes

Description: Learn how to use talosctl etcd snapshot to create etcd backups for disaster recovery in your Talos Linux cluster

---

Backing up etcd is one of the most critical tasks in Kubernetes cluster management. etcd stores all of your cluster state - every deployment, service, secret, configmap, and custom resource. If you lose etcd data without a backup, you lose your entire cluster configuration. The `talosctl etcd snapshot` command makes it easy to create these backups in Talos Linux.

## Why etcd Backups Matter

etcd is the brain of your Kubernetes cluster. It stores the desired state and the current state of every object in the cluster. Without etcd, Kubernetes has no idea what should be running, how services should be configured, or what secrets your applications need.

Common scenarios where you need etcd backups include:

- Hardware failure on control plane nodes
- Accidental deletion of critical Kubernetes resources
- Cluster upgrades gone wrong
- Datacenter disasters
- Corruption of etcd data

Having a recent etcd backup means you can recover from any of these situations by restoring the backup to a new cluster.

## Creating a Snapshot

The basic command to create an etcd snapshot is straightforward:

```bash
# Create an etcd snapshot and save it locally
talosctl etcd snapshot /path/to/backup/etcd-backup.snapshot --nodes 192.168.1.10
```

This command connects to the specified control plane node, asks etcd to create a consistent snapshot, and downloads the snapshot file to your local machine. The snapshot file contains everything stored in etcd at the moment the snapshot was taken.

```bash
# Create a timestamped backup
talosctl etcd snapshot ./etcd-backup-$(date +%Y%m%d-%H%M%S).snapshot \
  --nodes 192.168.1.10
```

Using timestamps in the filename makes it easy to identify when each backup was created and to manage multiple backup files.

## Verifying the Snapshot

After creating a snapshot, verify that it is valid and contains data:

```bash
# Check the file size - a valid snapshot should be at least a few KB
ls -lh ./etcd-backup-*.snapshot

# If you have etcdctl installed, you can check the snapshot status
etcdctl snapshot status ./etcd-backup-20240301-120000.snapshot --write-out=table
```

The `etcdctl snapshot status` command shows you the hash, revision, total keys, and total size of the snapshot. This gives you confidence that the backup is complete and valid.

## Automating Backups with Cron

You should not rely on manual backups. Set up an automated backup schedule using cron:

```bash
#!/bin/bash
# etcd-backup.sh - automated etcd backup script

BACKUP_DIR="/data/etcd-backups"
CONTROL_PLANE_NODE="192.168.1.10"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)

# Create backup directory if it does not exist
mkdir -p "$BACKUP_DIR"

# Create the snapshot
echo "$(date): Creating etcd snapshot..."
talosctl etcd snapshot "$BACKUP_DIR/etcd-backup-$DATE.snapshot" \
  --nodes "$CONTROL_PLANE_NODE"

# Check if the backup was successful
if [ $? -eq 0 ]; then
  echo "$(date): Backup created successfully"

  # Verify the file is not empty
  FILE_SIZE=$(stat -f%z "$BACKUP_DIR/etcd-backup-$DATE.snapshot" 2>/dev/null || \
              stat -c%s "$BACKUP_DIR/etcd-backup-$DATE.snapshot" 2>/dev/null)

  if [ "$FILE_SIZE" -gt 1000 ]; then
    echo "$(date): Backup file size: $FILE_SIZE bytes - looks good"
  else
    echo "$(date): WARNING: Backup file seems too small ($FILE_SIZE bytes)"
  fi
else
  echo "$(date): ERROR: Backup failed!"
  exit 1
fi

# Clean up old backups
echo "$(date): Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "etcd-backup-*.snapshot" -mtime +"$RETENTION_DAYS" -delete

echo "$(date): Backup complete."
```

Add this script to your crontab:

```bash
# Run etcd backup every 6 hours
0 */6 * * * /usr/local/bin/etcd-backup.sh >> /var/log/etcd-backup.log 2>&1
```

## Storing Backups Off-Site

Keeping backups only on the same machine or network as your cluster defeats the purpose. Upload your snapshots to remote storage:

```bash
#!/bin/bash
# Extended backup script with S3 upload

BACKUP_DIR="/tmp/etcd-backups"
S3_BUCKET="s3://my-etcd-backups/production"
DATE=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="etcd-backup-$DATE.snapshot"

# Create local snapshot
talosctl etcd snapshot "$BACKUP_DIR/$SNAPSHOT_FILE" --nodes 192.168.1.10

# Compress the snapshot
gzip "$BACKUP_DIR/$SNAPSHOT_FILE"

# Upload to S3
aws s3 cp "$BACKUP_DIR/$SNAPSHOT_FILE.gz" "$S3_BUCKET/$SNAPSHOT_FILE.gz"

# Also copy to a secondary location for redundancy
aws s3 cp "$BACKUP_DIR/$SNAPSHOT_FILE.gz" \
  "s3://my-etcd-backups-dr/production/$SNAPSHOT_FILE.gz"

# Clean up local file
rm -f "$BACKUP_DIR/$SNAPSHOT_FILE.gz"

echo "Backup uploaded to S3: $SNAPSHOT_FILE.gz"
```

You can use any object storage service - AWS S3, Google Cloud Storage, Azure Blob Storage, MinIO, or even a simple NFS share on a separate server.

## Running Backups from a Kubernetes CronJob

Instead of running backups from an external machine, you can run them as a Kubernetes CronJob within your cluster:

```yaml
# etcd-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 */4 * * *"   # Every 4 hours
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: etcd-backup
            image: ghcr.io/siderolabs/talosctl:v1.7.0
            command:
            - /bin/sh
            - -c
            - |
              talosctl etcd snapshot /backup/etcd-$(date +%Y%m%d-%H%M%S).snapshot \
                --nodes $CONTROL_PLANE_IP \
                --talosconfig /talos/config
            env:
            - name: CONTROL_PLANE_IP
              value: "192.168.1.10"
            volumeMounts:
            - name: talos-config
              mountPath: /talos
            - name: backup-volume
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: talos-config
            secret:
              secretName: talosconfig
          - name: backup-volume
            persistentVolumeClaim:
              claimName: etcd-backup-pvc
```

## Backup Before Critical Operations

Always take a backup before performing any risky operation on your cluster:

```bash
# Before upgrading Talos Linux
talosctl etcd snapshot ./pre-upgrade-backup.snapshot --nodes 192.168.1.10
talosctl upgrade --nodes 192.168.1.10 --image ghcr.io/siderolabs/installer:v1.7.0

# Before upgrading Kubernetes
talosctl etcd snapshot ./pre-k8s-upgrade-backup.snapshot --nodes 192.168.1.10
talosctl upgrade-k8s --nodes 192.168.1.10 --to 1.30.0

# Before making major configuration changes
talosctl etcd snapshot ./pre-config-change-backup.snapshot --nodes 192.168.1.10
talosctl apply-config --nodes 192.168.1.10 --file updated-config.yaml
```

Having a pre-operation backup gives you a clean rollback point if something goes wrong.

## Monitoring Backup Health

Set up monitoring to alert you when backups fail:

```bash
#!/bin/bash
# Backup monitoring script

BACKUP_DIR="/data/etcd-backups"
MAX_AGE_HOURS=8

# Find the most recent backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/etcd-backup-*.snapshot 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  echo "CRITICAL: No etcd backups found!"
  exit 2
fi

# Check the age of the latest backup
BACKUP_AGE=$(( ($(date +%s) - $(stat -f%m "$LATEST_BACKUP" 2>/dev/null || \
  stat -c%Y "$LATEST_BACKUP" 2>/dev/null)) / 3600 ))

if [ "$BACKUP_AGE" -gt "$MAX_AGE_HOURS" ]; then
  echo "WARNING: Latest etcd backup is $BACKUP_AGE hours old (threshold: $MAX_AGE_HOURS)"
  exit 1
fi

echo "OK: Latest etcd backup is $BACKUP_AGE hours old"
exit 0
```

## Best Practices for etcd Backups

- Back up at least every 4-6 hours in production environments.
- Always take a backup before upgrades, configuration changes, or any risky operation.
- Store backups in multiple locations, including off-site.
- Regularly test your restore procedure. A backup you cannot restore is not a backup.
- Monitor backup freshness and alert when backups are stale.
- Compress and encrypt backups before storing them remotely.
- Keep at least 30 days of backup history.
- Document your backup and restore procedures in your runbook.
- Use the snapshot command against a non-leader etcd member to reduce load on the leader.

The `talosctl etcd snapshot` command is simple to use, but building a reliable backup strategy around it requires planning. Invest the time now, and you will be grateful when you need to recover your cluster later.
