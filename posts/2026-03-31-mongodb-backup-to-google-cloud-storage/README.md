# How to Back Up MongoDB to Google Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, GCP, Storage, Automation

Description: Learn how to automate MongoDB backups to Google Cloud Storage using mongodump and gsutil, with object lifecycle rules for retention management.

---

## Why Use Google Cloud Storage for MongoDB Backups

Google Cloud Storage (GCS) provides multi-region redundancy, strong consistency, and deep integration with GCP services like Cloud Scheduler and Cloud Functions. For GCP-hosted MongoDB deployments, GCS buckets can use Workload Identity Federation for secure, credential-free authentication and integrate with Cloud Monitoring for alerting.

## Prerequisites

- `mongodump` installed
- Google Cloud SDK (`gsutil` or `gcloud storage`) installed and configured
- A GCS bucket created in your target region
- IAM binding: Storage Object Creator on the bucket for your service account

## Backup Script

```bash
#!/bin/bash
# mongodb-backup-gcs.sh

set -euo pipefail

MONGO_URI="${MONGO_URI:-mongodb://user:pass@localhost:27017}"
GCS_BUCKET="${GCS_BUCKET:-gs://my-mongodb-backups}"
GCS_PREFIX="${GCS_PREFIX:-backups}"
BACKUP_TMP="/tmp/mongodb-backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="mongodb-${TIMESTAMP}.archive.gz"

echo "Starting MongoDB backup: $TIMESTAMP"
mkdir -p "$BACKUP_TMP"

# Dump to compressed archive
mongodump \
  --uri "$MONGO_URI" \
  --gzip \
  --archive="$BACKUP_TMP/$ARCHIVE_NAME"

BACKUP_SIZE=$(du -sh "$BACKUP_TMP/$ARCHIVE_NAME" | cut -f1)
echo "Backup created: $BACKUP_SIZE"

# Upload to GCS using gcloud storage (preferred over gsutil)
echo "Uploading to GCS..."
gcloud storage cp \
  "$BACKUP_TMP/$ARCHIVE_NAME" \
  "$GCS_BUCKET/$GCS_PREFIX/$ARCHIVE_NAME"

echo "Upload complete"
rm -f "$BACKUP_TMP/$ARCHIVE_NAME"
echo "Backup finished: $GCS_BUCKET/$GCS_PREFIX/$ARCHIVE_NAME"
```

## Service Account and IAM Configuration

Create a dedicated service account for backups:

```bash
# Create service account
gcloud iam service-accounts create mongodb-backup-sa \
  --display-name "MongoDB Backup Service Account"

# Grant storage permissions
gcloud storage buckets add-iam-policy-binding gs://my-mongodb-backups \
  --member "serviceAccount:mongodb-backup-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/storage.objectCreator"

# Generate key file (for non-GCE environments)
gcloud iam service-accounts keys create /etc/mongodb/gcs-backup-key.json \
  --iam-account mongodb-backup-sa@PROJECT_ID.iam.gserviceaccount.com

# On GCE instances, use Workload Identity instead of key files
```

## GCS Object Lifecycle Policy

Create a lifecycle configuration file:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "NEARLINE"
        },
        "condition": {
          "age": 30,
          "matchesPrefix": ["backups/"]
        }
      },
      {
        "action": {
          "type": "SetStorageClass",
          "storageClass": "ARCHIVE"
        },
        "condition": {
          "age": 60,
          "matchesPrefix": ["backups/"]
        }
      },
      {
        "action": {
          "type": "Delete"
        },
        "condition": {
          "age": 365,
          "matchesPrefix": ["backups/"]
        }
      }
    ]
  }
}
```

Apply it:

```bash
gcloud storage buckets update gs://my-mongodb-backups \
  --lifecycle-file=lifecycle.json
```

## Scheduling with Cloud Scheduler and Cloud Run Job

For serverless scheduling, deploy the backup as a Cloud Run job:

```yaml
# cloudbuild.yaml or cloud-run-job.yaml
apiVersion: run.googleapis.com/v1
kind: Job
metadata:
  name: mongodb-backup
spec:
  template:
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/mongodb-backup:latest
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-uri
              key: latest
        - name: GCS_BUCKET
          value: gs://my-mongodb-backups
```

Trigger nightly via Cloud Scheduler:

```bash
gcloud scheduler jobs create http mongodb-nightly-backup \
  --schedule "0 2 * * *" \
  --uri "https://run.googleapis.com/v2/projects/PROJECT/locations/us-central1/jobs/mongodb-backup:run" \
  --oauth-service-account-email mongodb-backup-sa@PROJECT_ID.iam.gserviceaccount.com
```

## Restoring from GCS

```bash
# Download backup
gcloud storage cp \
  "gs://my-mongodb-backups/backups/mongodb-20240115-020000.archive.gz" \
  /tmp/restore.archive.gz

# Restore to MongoDB
mongorestore \
  --uri "mongodb://user:pass@localhost:27017" \
  --gzip \
  --archive=/tmp/restore.archive.gz \
  --drop
```

## Summary

MongoDB backups to Google Cloud Storage combine `mongodump` with the `gcloud storage` CLI for reliable, authenticated uploads. Use service account Workload Identity on GCE for credential-free operation, apply lifecycle policies to tier and expire old backups automatically, and schedule jobs via Cloud Scheduler for hands-off nightly execution. Always test restores in a separate environment to confirm backup validity.
