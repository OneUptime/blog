# How to Configure MongoDB Backups on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, Backup, CronJob, Storage

Description: Configure automated MongoDB backups on Kubernetes using CronJobs, mongodump, and cloud storage to protect your data from loss.

---

## Introduction

Protecting MongoDB data on Kubernetes requires a well-designed backup strategy. Unlike traditional VMs, Kubernetes pods are ephemeral, so backups must be automated and stored outside the cluster. This guide shows how to use Kubernetes CronJobs with `mongodump` to back up MongoDB to S3-compatible storage.

## Creating a Backup Script

First, create a ConfigMap with the backup script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mongodb-backup-script
  namespace: mongodb
data:
  backup.sh: |
    #!/bin/bash
    set -e

    # Install AWS CLI (not included in the base MongoDB image)
    apt-get update -qq && apt-get install -y -qq awscli > /dev/null

    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/tmp/backup_${TIMESTAMP}"

    echo "Starting backup at ${TIMESTAMP}"
    mongodump \
      --uri="${MONGODB_URI}" \
      --out="${BACKUP_DIR}" \
      --gzip

    echo "Uploading to S3..."
    aws s3 cp "${BACKUP_DIR}" "s3://${S3_BUCKET}/mongodb/${TIMESTAMP}/" \
      --recursive

    echo "Cleaning up..."
    rm -rf "${BACKUP_DIR}"
    echo "Backup complete"
```

## Creating Backup Credentials Secret

```bash
kubectl create secret generic mongodb-backup-credentials \
  --from-literal=MONGODB_URI="mongodb://backup:backupPass@mongodb-0.mongodb:27017/admin" \
  --from-literal=AWS_ACCESS_KEY_ID="<your-key>" \
  --from-literal=AWS_SECRET_ACCESS_KEY="<your-secret>" \
  --from-literal=S3_BUCKET="my-mongodb-backups" \
  -n mongodb
```

## Defining the Backup CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: mongodb
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: mongodb-backup
              image: mongo:7.0
              command: ["/bin/bash", "/scripts/backup.sh"]
              envFrom:
                - secretRef:
                    name: mongodb-backup-credentials
              volumeMounts:
                - name: backup-script
                  mountPath: /scripts
          volumes:
            - name: backup-script
              configMap:
                name: mongodb-backup-script
                defaultMode: 0755
```

## Creating a Dedicated Backup User

```javascript
use admin
db.createUser({
  user: "backup",
  pwd: "backupPass",
  roles: [
    { role: "backup", db: "admin" }
  ]
})
```

## Triggering a Manual Backup

```bash
# Create a one-off job from the CronJob
kubectl create job --from=cronjob/mongodb-backup manual-backup-$(date +%s) -n mongodb

# Watch the job
kubectl get jobs -n mongodb -w

# View logs
kubectl logs job/manual-backup-<timestamp> -n mongodb
```

## Verifying Backups

```bash
# List backups in S3
aws s3 ls s3://my-mongodb-backups/mongodb/ --recursive

# Test restore to a local instance
mongorestore --uri="mongodb://localhost:27017" \
  --gzip \
  --dir /tmp/restored_backup/
```

## Setting a Retention Policy

To avoid storage costs, set a lifecycle policy on your S3 bucket:

```json
{
  "Rules": [
    {
      "ID": "mongodb-backup-retention",
      "Status": "Enabled",
      "Filter": { "Prefix": "mongodb/" },
      "Expiration": { "Days": 30 }
    }
  ]
}
```

## Summary

Automated MongoDB backups on Kubernetes are best achieved through CronJobs that run `mongodump` and push compressed archives to S3. By using a dedicated backup user with minimal privileges, ConfigMap-mounted scripts, and secret-managed credentials, you can maintain reliable daily backups. Always verify your backups periodically by running test restores to a staging instance.
