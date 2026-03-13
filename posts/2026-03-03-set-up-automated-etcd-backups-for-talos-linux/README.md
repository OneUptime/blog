# How to Set Up Automated etcd Backups for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Automated Backup, Kubernetes, CronJobs, Disaster Recovery

Description: Set up automated etcd backups for your Talos Linux cluster using Kubernetes CronJobs and external scripts for reliable disaster recovery.

---

Manual etcd backups are better than nothing, but they depend on someone remembering to run them. Automated backups run on a schedule, ensuring you always have a recent snapshot available when disaster strikes. This guide covers several approaches to automating etcd backups in Talos Linux clusters.

## Why Automate etcd Backups

The value of an etcd backup is directly related to how recent it is. A backup from yesterday means you lose a day of cluster changes. A backup from an hour ago means you lose at most an hour. Automation is the only reliable way to maintain frequent backups.

Without automation, teams typically only take backups before planned maintenance. But most disasters are unplanned, and having a backup from three weeks ago is not nearly as useful as having one from this morning.

## Approach 1: External Cron Job

The simplest approach is a cron job on a machine outside the cluster that runs `talosctl etcd snapshot` on a schedule.

### Setup

```bash
# Create the backup script
cat > /opt/scripts/etcd-backup.sh << 'SCRIPT'
#!/bin/bash
set -e

# Configuration
TALOSCONFIG="/opt/talos/talosconfig"
CP_NODE="10.0.0.1"
BACKUP_DIR="/opt/backups/etcd"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_FILE="${BACKUP_DIR}/etcd-${TIMESTAMP}.db"

# Use the correct talosconfig
export TALOSCONFIG

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Check etcd health before taking a snapshot
if ! talosctl etcd status --nodes ${CP_NODE} > /dev/null 2>&1; then
    echo "ERROR: etcd is not healthy, skipping backup"
    # Send alert notification here
    exit 1
fi

# Take the snapshot
echo "Taking etcd snapshot..."
talosctl etcd snapshot ${SNAPSHOT_FILE} --nodes ${CP_NODE}

# Verify the snapshot
FILESIZE=$(stat -c%s "${SNAPSHOT_FILE}" 2>/dev/null || stat -f%z "${SNAPSHOT_FILE}")
if [ "${FILESIZE}" -lt 1000 ]; then
    echo "ERROR: Snapshot is too small (${FILESIZE} bytes), possible failure"
    rm -f ${SNAPSHOT_FILE}
    exit 1
fi

echo "Snapshot saved: ${SNAPSHOT_FILE} (${FILESIZE} bytes)"

# Upload to remote storage
if command -v aws &> /dev/null; then
    aws s3 cp ${SNAPSHOT_FILE} \
      s3://my-backups/etcd/etcd-${TIMESTAMP}.db \
      --sse aws:kms
    echo "Uploaded to S3"
fi

# Clean up old local backups
find ${BACKUP_DIR} -name "etcd-*.db" -mtime +${RETENTION_DAYS} -delete
echo "Cleaned up backups older than ${RETENTION_DAYS} days"

echo "Backup completed successfully"
SCRIPT

chmod +x /opt/scripts/etcd-backup.sh
```

### Schedule with Cron

```bash
# Add to crontab - run every hour
crontab -e

# Add this line:
0 * * * * /opt/scripts/etcd-backup.sh >> /var/log/etcd-backup.log 2>&1
```

### Add Monitoring

```bash
# Extended script with monitoring integration
# Add these lines at the end of the backup script

# Send success metric to monitoring system
curl -s -X POST "http://monitoring:9091/metrics/job/etcd-backup" \
  --data-binary "etcd_backup_last_success_timestamp $(date +%s)"
curl -s -X POST "http://monitoring:9091/metrics/job/etcd-backup" \
  --data-binary "etcd_backup_last_size_bytes ${FILESIZE}"
```

## Approach 2: Kubernetes CronJob

You can run the backup process as a Kubernetes CronJob within the cluster itself. This approach is self-contained but has a chicken-and-egg problem - if the cluster is completely down, the CronJob cannot run.

```yaml
# etcd-backup-cronjob.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: etcd-backup
  namespace: kube-system
---
apiVersion: v1
kind: Secret
metadata:
  name: talosconfig
  namespace: kube-system
type: Opaque
data:
  talosconfig: <base64-encoded-talosconfig>
---
apiVersion: v1
kind: Secret
metadata:
  name: s3-credentials
  namespace: kube-system
type: Opaque
data:
  AWS_ACCESS_KEY_ID: <base64-encoded>
  AWS_SECRET_ACCESS_KEY: <base64-encoded>
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 */2 * * *"  # Every 2 hours
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          serviceAccountName: etcd-backup
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: ghcr.io/siderolabs/talosctl:v1.7.0
              command:
                - /bin/sh
                - -c
                - |
                  set -e
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

                  # Take etcd snapshot
                  talosctl etcd snapshot /tmp/etcd-${TIMESTAMP}.db \
                    --talosconfig /talos/talosconfig \
                    --nodes ${CP_NODE}

                  # Upload to S3
                  aws s3 cp /tmp/etcd-${TIMESTAMP}.db \
                    s3://${BACKUP_BUCKET}/etcd/etcd-${TIMESTAMP}.db \
                    --sse aws:kms

                  echo "Backup successful: etcd-${TIMESTAMP}.db"
              env:
                - name: CP_NODE
                  value: "10.0.0.1"
                - name: BACKUP_BUCKET
                  value: "my-cluster-backups"
              envFrom:
                - secretRef:
                    name: s3-credentials
              volumeMounts:
                - name: talosconfig
                  mountPath: /talos
                  readOnly: true
          volumes:
            - name: talosconfig
              secret:
                secretName: talosconfig
```

```bash
# Apply the CronJob
kubectl apply -f etcd-backup-cronjob.yaml

# Check backup history
kubectl get jobs -n kube-system -l job-name=etcd-backup

# View logs of the most recent backup
kubectl logs -n kube-system job/etcd-backup-<timestamp>
```

## Approach 3: Dedicated Backup Tool

Tools like Velero can handle etcd backups as part of a broader cluster backup strategy:

```bash
# Install Velero with the appropriate storage provider
velero install \
  --provider aws \
  --bucket my-cluster-backups \
  --secret-file ./cloud-credentials \
  --backup-location-config region=us-east-1

# Schedule backups
velero schedule create etcd-hourly \
  --schedule="0 * * * *" \
  --include-resources=* \
  --ttl 720h
```

Note that Velero backs up Kubernetes resources (not the raw etcd database), which is a different approach. For true etcd snapshot backups, use `talosctl etcd snapshot`.

## Backup Verification

Automated backups are worthless if they are corrupted. Add verification to your backup pipeline:

```bash
# Verification script
cat > /opt/scripts/verify-backup.sh << 'SCRIPT'
#!/bin/bash
set -e

BACKUP_FILE=$1

# Check file exists and is non-empty
if [ ! -s "${BACKUP_FILE}" ]; then
    echo "FAIL: File is empty or does not exist"
    exit 1
fi

# Check file size is reasonable (at least 10KB)
FILESIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}")
if [ "${FILESIZE}" -lt 10240 ]; then
    echo "FAIL: File is suspiciously small (${FILESIZE} bytes)"
    exit 1
fi

# If etcdctl is available, verify the snapshot
if command -v etcdctl &> /dev/null; then
    etcdctl snapshot status "${BACKUP_FILE}" --write-out=table
    if [ $? -ne 0 ]; then
        echo "FAIL: etcdctl snapshot status failed"
        exit 1
    fi
fi

echo "PASS: Backup verification successful (${FILESIZE} bytes)"
SCRIPT

chmod +x /opt/scripts/verify-backup.sh
```

## Setting Up Alerts for Backup Failures

You should be alerted when backups fail:

```yaml
# Prometheus alerting rule for backup freshness
groups:
  - name: etcd-backup
    rules:
      - alert: EtcdBackupStale
        expr: time() - etcd_backup_last_success_timestamp > 7200
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "etcd backup is stale"
          description: "No successful etcd backup in the last 2 hours"

      - alert: EtcdBackupFailed
        expr: increase(etcd_backup_failures_total[1h]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "etcd backup failed"
```

## Multi-Region Backup Storage

For maximum safety, store backups in multiple locations:

```bash
# Upload to primary region
aws s3 cp ${SNAPSHOT_FILE} \
  s3://backups-us-east-1/etcd/ --region us-east-1

# Cross-region replication (configure in S3 bucket settings)
# Or manually copy to a second region
aws s3 cp ${SNAPSHOT_FILE} \
  s3://backups-eu-west-1/etcd/ --region eu-west-1
```

## Retention Policies

Balance storage costs against recovery needs:

```bash
# Example retention policy
# Hourly backups: keep for 48 hours
# Daily backups: keep for 30 days
# Weekly backups: keep for 6 months

# Implement with S3 lifecycle rules
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-cluster-backups \
  --lifecycle-configuration file://lifecycle.json
```

```json
{
    "Rules": [
        {
            "ID": "etcd-backup-retention",
            "Filter": {"Prefix": "etcd/"},
            "Status": "Enabled",
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                }
            ],
            "Expiration": {
                "Days": 365
            }
        }
    ]
}
```

## Summary

Automated etcd backups are a non-negotiable part of running Talos Linux in production. Choose the approach that fits your infrastructure - an external cron job for simplicity, a Kubernetes CronJob for self-containment, or a dedicated tool for broader backup coverage. Whichever approach you choose, add backup verification and failure alerting. A backup that runs silently and never gets tested is barely better than no backup at all. Test your restore procedure regularly to make sure your backups actually work.
