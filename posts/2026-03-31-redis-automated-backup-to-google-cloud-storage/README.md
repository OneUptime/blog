# How to Set Up Redis Automated Backup to Google Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Google Cloud, Backup, Disaster Recovery, DevOps

Description: Learn how to automate Redis RDB backups to Google Cloud Storage with scheduled uploads, lifecycle retention policies, and failure alerting.

---

Google Cloud Storage provides highly durable object storage for Redis backup files with flexible lifecycle management. This guide shows how to set up automated backups from a self-managed Redis instance to GCS.

## Prerequisites

- Redis running on a GCP VM or container
- `gcloud` CLI installed and authenticated
- A GCS bucket for backups

## Step 1: Create a GCS Bucket

```bash
# Create a bucket (choose a region close to your Redis instance)
gsutil mb -l us-central1 gs://my-redis-backups

# Enable versioning for extra protection
gsutil versioning set on gs://my-redis-backups

# Set lifecycle policy to delete objects older than 30 days
cat > /tmp/lifecycle.json <<'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 30}
    }
  ]
}
EOF
gsutil lifecycle set /tmp/lifecycle.json gs://my-redis-backups
```

## Step 2: Grant the VM a Service Account with Storage Access

If running on a GCE instance, assign the Storage Object Admin role to the VM's service account:

```bash
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL=$(gcloud compute instances describe my-redis-vm \
  --zone us-central1-a \
  --format='value(serviceAccounts[0].email)')

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"
```

## Step 3: Create the Backup Script

```bash
#!/bin/bash
# /usr/local/bin/redis-backup-gcs.sh

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/redis-backup-${TIMESTAMP}.rdb"
GCS_BUCKET="gs://my-redis-backups"
GCS_PATH="${GCS_BUCKET}/daily/redis-backup-${TIMESTAMP}.rdb"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Create RDB snapshot
echo "[$(date -Iseconds)] Creating Redis RDB snapshot..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$BACKUP_FILE"

BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE")
echo "[$(date -Iseconds)] Snapshot created: ${BACKUP_SIZE} bytes"

# Verify integrity
redis-check-rdb "$BACKUP_FILE" || {
  echo "ERROR: RDB integrity check failed, aborting upload"
  rm -f "$BACKUP_FILE"
  exit 1
}

# Upload to GCS
gsutil -q cp "$BACKUP_FILE" "$GCS_PATH"
echo "[$(date -Iseconds)] Uploaded to $GCS_PATH"

# Clean up local file
rm -f "$BACKUP_FILE"

echo "[$(date -Iseconds)] Redis backup to GCS complete"
```

```bash
chmod +x /usr/local/bin/redis-backup-gcs.sh
```

## Step 4: Schedule with Systemd Timer

```text
# /etc/systemd/system/redis-backup-gcs.service
[Unit]
Description=Redis Backup to Google Cloud Storage
After=network.target

[Service]
Type=oneshot
User=redis
ExecStart=/usr/local/bin/redis-backup-gcs.sh
StandardOutput=journal
StandardError=journal
```

```text
# /etc/systemd/system/redis-backup-gcs.timer
[Unit]
Description=Redis GCS Backup - every 15 minutes

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl daemon-reload
systemctl enable --now redis-backup-gcs.timer
```

## Step 5: Verify Backups are Landing in GCS

```bash
# List recent backups
gsutil ls -l gs://my-redis-backups/daily/ | sort | tail -10

# Check total backup storage used
gsutil du -sh gs://my-redis-backups/
```

## Step 6: Restore from GCS

```bash
#!/bin/bash
# List backups and restore most recent
LATEST=$(gsutil ls gs://my-redis-backups/daily/ | sort | tail -1)
echo "Restoring: $LATEST"

gsutil cp "$LATEST" /tmp/restore.rdb
redis-check-rdb /tmp/restore.rdb

systemctl stop redis
cp /tmp/restore.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb
systemctl start redis

echo "Restored. Key count: $(redis-cli DBSIZE)"
```

## Monitoring Backup Health

Add a check to alert if the latest backup in GCS is stale:

```bash
#!/bin/bash
# check-gcs-backup-freshness.sh
LATEST=$(gsutil ls -l gs://my-redis-backups/daily/ | sort | tail -2 | head -1)
LAST_DATE=$(echo "$LATEST" | awk '{print $2}')
AGE_MINS=$(( ($(date +%s) - $(date -d "$LAST_DATE" +%s)) / 60 ))

if [ "$AGE_MINS" -gt 30 ]; then
  echo "ALERT: Latest Redis GCS backup is ${AGE_MINS} minutes old"
  exit 1
fi
echo "OK: Latest backup is ${AGE_MINS} minutes old"
```

## Summary

Automating Redis backups to Google Cloud Storage uses gsutil to upload verified RDB snapshots on a schedule. GCS lifecycle policies handle retention automatically, deleting old backups after a configured number of days. Monitor backup age with a scheduled health check and wire it into OneUptime to get paged when backups stop landing on time.
