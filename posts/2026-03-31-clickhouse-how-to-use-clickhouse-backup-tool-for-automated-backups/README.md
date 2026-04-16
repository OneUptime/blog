# How to Use clickhouse-backup Tool for Automated Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, clickhouse-backup, Automation, Disaster Recovery

Description: Learn how to use the clickhouse-backup tool to create, schedule, upload to S3, and restore ClickHouse backups for reliable disaster recovery automation.

---

## What Is clickhouse-backup

`clickhouse-backup` is an open-source tool for creating and restoring ClickHouse backups. It supports:
- Full and incremental backups
- Local storage and cloud storage (S3, GCS, Azure)
- Schema and data backup
- Automated scheduling

## Installing clickhouse-backup

```bash
# Download the latest release
RELEASE=$(curl -s https://api.github.com/repos/Altinity/clickhouse-backup/releases/latest | grep tag_name | cut -d'"' -f4)
curl -L "https://github.com/Altinity/clickhouse-backup/releases/download/${RELEASE}/clickhouse-backup-linux-amd64.tar.gz" \
    -o clickhouse-backup.tar.gz

tar -xzf clickhouse-backup.tar.gz
mv build/linux/amd64/clickhouse-backup /usr/local/bin/
chmod +x /usr/local/bin/clickhouse-backup
```

## Configuration File

Create `/etc/clickhouse-backup/config.yml`:

```yaml
general:
  remote_storage: s3
  max_file_size: 10737418240  # 10 GB per file
  disable_progress_bar: false
  backups_to_keep_local: 3
  backups_to_keep_remote: 7
  log_level: info

clickhouse:
  username: default
  password: ""
  host: localhost
  port: 9000
  disk_mapping: {}
  skip_tables:
    - system.*
    - information_schema.*
  timeout: 5m

s3:
  access_key: YOUR_AWS_ACCESS_KEY
  secret_key: YOUR_AWS_SECRET_KEY
  bucket: my-clickhouse-backups
  region: us-east-1
  path: clickhouse
  compression_level: 1
  compression_format: tar
  sse: AES256
```

## Creating a Local Backup

```bash
# List existing backups
clickhouse-backup list

# Create a full backup
clickhouse-backup create my_backup_20260331

# Create backup for specific tables
clickhouse-backup create --tables default.events,default.orders my_backup_20260331
```

## Uploading to Remote Storage

```bash
# Upload the backup to S3
clickhouse-backup upload my_backup_20260331

# Create and upload in one step
clickhouse-backup create-remote my_backup_20260331
```

## Restoring from a Backup

```bash
# List remote backups
clickhouse-backup list remote

# Download a backup from S3
clickhouse-backup download my_backup_20260331

# Restore from local backup
clickhouse-backup restore my_backup_20260331

# Restore specific tables only
clickhouse-backup restore --tables default.events my_backup_20260331

# Restore schema only (no data)
clickhouse-backup restore --schema my_backup_20260331
```

## Automating Backups with Cron

```bash
# Edit crontab
crontab -e
```

```text
# Daily full backup at 2 AM
0 2 * * * /usr/local/bin/clickhouse-backup create-remote full_$(date +\%Y\%m\%d) >> /var/log/clickhouse-backup.log 2>&1

# Clean old local backups
0 3 * * * /usr/local/bin/clickhouse-backup clean >> /var/log/clickhouse-backup.log 2>&1
```

## Automating with a Shell Script

```bash
#!/bin/bash
set -e

BACKUP_NAME="full_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="/var/log/clickhouse-backup.log"

echo "[$(date)] Starting backup: $BACKUP_NAME" >> "$LOG_FILE"

# Create backup
clickhouse-backup create-remote "$BACKUP_NAME" >> "$LOG_FILE" 2>&1

# Remove old local backups (keep 3)
clickhouse-backup clean >> "$LOG_FILE" 2>&1

echo "[$(date)] Backup complete: $BACKUP_NAME" >> "$LOG_FILE"
```

## Incremental Backups

```bash
# Create base backup
clickhouse-backup create-remote base_backup

# Create incremental backup (only changed data parts)
clickhouse-backup create-remote --diff-from-remote base_backup incremental_$(date +%Y%m%d)
```

## Verifying Backups

```bash
# List all local backups
clickhouse-backup list local

# List all remote backups
clickhouse-backup list remote

# Check backup details
clickhouse-backup print-config
```

## Kubernetes CronJob for Automated Backups

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: clickhouse-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: clickhouse-backup
            image: altinity/clickhouse-backup:latest
            command:
            - /bin/sh
            - -c
            - clickhouse-backup create-remote full_$(date +%Y%m%d)
            env:
            - name: CLICKHOUSE_HOST
              value: "clickhouse-service"
            - name: S3_BUCKET
              value: "my-clickhouse-backups"
          restartPolicy: OnFailure
```

## Summary

`clickhouse-backup` is the most commonly used tool for automating ClickHouse backups. Configure it with your S3 credentials, use `create-remote` for one-step create-and-upload workflows, and schedule daily cron jobs for automated retention. For large databases, use incremental backups with `--diff-from-remote` to reduce backup time and storage costs.
