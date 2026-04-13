# How to Back Up MongoDB to AWS S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, AWS, S3, Automation

Description: Learn how to automate MongoDB backups to AWS S3 using mongodump, the AWS CLI, and lifecycle policies to manage backup retention efficiently.

---

## Why Back Up MongoDB to S3

AWS S3 provides durable, geo-redundant object storage with 99.999999999% (11 nines) durability. Storing MongoDB backups in S3 separates your backup storage from your database infrastructure, protects against server failure, and enables cross-region replication for disaster recovery. S3 lifecycle policies automate retention without manual cleanup scripts.

## Prerequisites

- `mongodump` and the AWS CLI installed on the MongoDB host
- An S3 bucket created in your target region
- An IAM role or user with `s3:PutObject`, `s3:GetObject`, and `s3:ListBucket` permissions on the bucket
- `mongodump` version compatible with your MongoDB server version

## Backup Script

```bash
#!/bin/bash
# mongodb-backup-s3.sh

set -euo pipefail

MONGO_URI="${MONGO_URI:-mongodb://user:pass@localhost:27017}"
S3_BUCKET="${S3_BUCKET:-my-mongodb-backups}"
S3_PREFIX="${S3_PREFIX:-backups}"
BACKUP_TMP="/tmp/mongodb-backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="mongodb-${TIMESTAMP}.archive.gz"

echo "Starting MongoDB backup at $TIMESTAMP"

# Create backup
mkdir -p "$BACKUP_TMP"
mongodump \
  --uri "$MONGO_URI" \
  --gzip \
  --archive="$BACKUP_TMP/$ARCHIVE_NAME"

BACKUP_SIZE=$(du -sh "$BACKUP_TMP/$ARCHIVE_NAME" | cut -f1)
echo "Backup created: $BACKUP_SIZE"

# Upload to S3
echo "Uploading to s3://$S3_BUCKET/$S3_PREFIX/$ARCHIVE_NAME"
aws s3 cp \
  "$BACKUP_TMP/$ARCHIVE_NAME" \
  "s3://$S3_BUCKET/$S3_PREFIX/$ARCHIVE_NAME" \
  --storage-class STANDARD_IA \
  --sse AES256

echo "Upload complete"

# Cleanup local temp
rm -f "$BACKUP_TMP/$ARCHIVE_NAME"
echo "Backup finished successfully"
```

## IAM Policy for Backup User

Create a least-privilege IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-mongodb-backups",
        "arn:aws:s3:::my-mongodb-backups/backups/*"
      ]
    }
  ]
}
```

## S3 Lifecycle Policy for Retention

Apply a lifecycle policy to automatically expire old backups:

```json
{
  "Rules": [
    {
      "ID": "mongodb-backup-retention",
      "Status": "Enabled",
      "Filter": { "Prefix": "backups/" },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

Apply it with the AWS CLI:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-mongodb-backups \
  --lifecycle-configuration file://lifecycle.json
```

## Scheduling with Cron

Add the backup script to cron for nightly execution:

```bash
# /etc/cron.d/mongodb-s3-backup
0 2 * * * mongodb MONGO_URI="mongodb://user:pass@localhost:27017" S3_BUCKET="my-mongodb-backups" /usr/local/bin/mongodb-backup-s3.sh >> /var/log/mongodb-backup.log 2>&1
```

## Restoring from S3

To restore a specific backup from S3:

```bash
# Download backup from S3
aws s3 cp \
  "s3://my-mongodb-backups/backups/mongodb-20240115-020000.archive.gz" \
  /tmp/restore.archive.gz

# Restore to MongoDB
mongorestore \
  --uri "mongodb://user:pass@localhost:27017" \
  --gzip \
  --archive=/tmp/restore.archive.gz \
  --drop
```

## Monitoring Backup Jobs

Wrap the backup script with an exit code check and send a heartbeat ping to OneUptime on success. If the backup job fails or does not run, OneUptime marks the heartbeat monitor as down and pages your on-call engineer before the backup window closes.

```bash
# At end of backup script
if aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX/$ARCHIVE_NAME" > /dev/null 2>&1; then
  curl -s "https://oneuptime.com/heartbeat/your-monitor-id" > /dev/null
  echo "Heartbeat sent"
fi
```

## Summary

Backing up MongoDB to AWS S3 combines `mongodump` for consistent database exports with the AWS CLI for reliable object storage uploads. Use IAM least-privilege policies, server-side encryption, and S3 lifecycle rules to automate retention. Schedule nightly backups via cron and monitor job success with a heartbeat monitor to ensure you always have a recent, valid backup available.
