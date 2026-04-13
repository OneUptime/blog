# How to Set Up Automated Backup Scripts for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Automation

Description: Learn how to write and schedule automated backup scripts for MongoDB using mongodump, cron, and retention policies to protect your data reliably.

---

Manually running backups is error-prone. Automating MongoDB backups with cron and well-structured shell scripts ensures you always have a recent backup without relying on human intervention.

## Basic Backup Script

Create `/usr/local/bin/mongodb-backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Configuration
MONGO_HOST="localhost"
MONGO_PORT="27017"
MONGO_USER="backup_user"
MONGO_PASS="secret"
MONGO_AUTH_DB="admin"
BACKUP_BASE="/backup/mongodb"
RETENTION_DAYS=14
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="${BACKUP_BASE}/${DATE}"

# Create backup
echo "[$(date)] Starting backup..."
mongodump \
  --host "${MONGO_HOST}" \
  --port "${MONGO_PORT}" \
  --username "${MONGO_USER}" \
  --password "${MONGO_PASS}" \
  --authenticationDatabase "${MONGO_AUTH_DB}" \
  --gzip \
  --archive="${BACKUP_PATH}.archive.gz"

echo "[$(date)] Backup complete: ${BACKUP_PATH}.archive.gz"

# Remove old backups
find "${BACKUP_BASE}" -name "*.archive.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Old backups cleaned (keeping ${RETENTION_DAYS} days)"
```

Make it executable:

```bash
chmod +x /usr/local/bin/mongodb-backup.sh
```

## Scheduling with Cron

Open the crontab editor:

```bash
crontab -e
```

Add the following to run the backup daily at 2 AM:

```text
0 2 * * * /usr/local/bin/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1
```

For hourly backups:

```text
0 * * * * /usr/local/bin/mongodb-backup.sh >> /var/log/mongodb-backup.log 2>&1
```

## Backup Script with Replica Set Support

```bash
#!/bin/bash
set -euo pipefail

REPLICA_SET="rs0"
HOSTS="mongo1:27017,mongo2:27017,mongo3:27017"
BACKUP_BASE="/backup/mongodb"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

mongodump \
  --host "${REPLICA_SET}/${HOSTS}" \
  --readPreference secondary \
  --oplog \
  --gzip \
  --archive="${BACKUP_BASE}/${DATE}.archive.gz"

echo "[$(date)] Replica set backup complete"
```

## Adding Backup Verification

After creating the backup, verify it is readable:

```bash
#!/bin/bash
set -o pipefail
BACKUP_FILE="$1"

echo "Verifying backup: ${BACKUP_FILE}"
mongorestore \
  --archive="${BACKUP_FILE}" \
  --gzip \
  --dryRun \
  --verbose 2>&1 | tail -5

if [ $? -eq 0 ]; then
  echo "Backup verification PASSED"
else
  echo "Backup verification FAILED"
  exit 1
fi
```

## Sending Backup Alerts

Add email or Slack notification on failure:

```bash
#!/bin/bash

BACKUP_BASE="/backup/mongodb"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="/var/log/mongodb-backup.log"

mongodump --gzip --archive="${BACKUP_BASE}/${DATE}.archive.gz" 2>>"${LOG_FILE}"
STATUS=$?

if [ $STATUS -ne 0 ]; then
  # Send alert via curl to a webhook
  curl -s -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"MongoDB backup FAILED on $(hostname) at $(date)\"}"
fi
```

## Backup to Remote Storage

Upload the backup to S3 using the AWS CLI:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
LOCAL_FILE="/backup/mongodb/${DATE}.archive.gz"
S3_BUCKET="s3://my-mongo-backups/${DATE}/"

# Create backup
mongodump --gzip --archive="${LOCAL_FILE}"

# Upload to S3
aws s3 cp "${LOCAL_FILE}" "${S3_BUCKET}"

echo "Backup uploaded to ${S3_BUCKET}"
```

## Checking Cron Logs

Verify that cron is running the backup script:

```bash
grep "mongodb-backup" /var/log/syslog
# or
journalctl -u cron | grep mongodb
```

## Summary

Automate MongoDB backups using shell scripts with `mongodump` and schedule them with cron. Use `--gzip` and `--archive` for compact single-file backups, implement a retention policy to remove old files, and add backup verification with `--dryRun`. Integrate with S3 or a monitoring webhook for reliable off-site storage and failure alerts.
