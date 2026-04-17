# How to Use clickhouse-backup Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, clickhouse-backup, Administration, Disaster Recovery, Operation

Description: Learn how to install and configure the clickhouse-backup tool by Altinity to create, upload, and restore ClickHouse backups with support for S3, GCS, and Azure storage.

---

`clickhouse-backup` is an open-source tool by Altinity that provides a higher-level backup workflow on top of ClickHouse's native backup primitives. It supports creating local snapshots, uploading to cloud storage, listing backups, restoring specific tables, and integrates with cron and Kubernetes CronJobs.

## Installation

```bash
# Download the latest release
LATEST=$(curl -s https://api.github.com/repos/Altinity/clickhouse-backup/releases/latest | grep tag_name | cut -d '"' -f 4)
wget "https://github.com/Altinity/clickhouse-backup/releases/download/${LATEST}/clickhouse-backup-linux-amd64.tar.gz"

tar -xzf clickhouse-backup-linux-amd64.tar.gz
sudo mv clickhouse-backup /usr/local/bin/
sudo chmod +x /usr/local/bin/clickhouse-backup

# Verify
clickhouse-backup version
```

## Configuration

Create the configuration file:

```bash
sudo mkdir -p /etc/clickhouse-backup
clickhouse-backup default-config > /tmp/config.yml
sudo cp /tmp/config.yml /etc/clickhouse-backup/config.yml
```

Edit the configuration for your environment:

```yaml
# /etc/clickhouse-backup/config.yml
general:
  remote_storage: s3
  max_file_size: 1073741824  # 1 GB - split large parts
  backups_to_keep_local: 3
  backups_to_keep_remote: 7
  log_level: info
  allow_empty_backups: false

clickhouse:
  username: backup_user
  password: your_secure_password
  host: localhost
  port: 9000
  disk_mapping: {}
  skip_tables:
    - system.*
    - information_schema.*
    - INFORMATION_SCHEMA.*
  timeout: 5m
  freeze_by_part: false
  secure: false

s3:
  access_key: YOUR_ACCESS_KEY_ID
  secret_key: YOUR_SECRET_ACCESS_KEY
  bucket: your-backup-bucket
  endpoint: https://s3.amazonaws.com
  region: us-east-1
  path: clickhouse/backups
  disable_ssl: false
  chunk_size: 0  # 0 = auto-calculated as remoteSize / max_parts_count
  max_parts_count: 4000
  compression_level: 1
  compression_format: tar
  sse: AES256
  storage_class: STANDARD_IA  # Use Infrequent Access for cost savings
```

Create the backup user in ClickHouse:

```sql
CREATE USER backup_user IDENTIFIED WITH sha256_password BY 'your_secure_password';
GRANT ALL ON *.* TO backup_user;
```

## Creating a Local Backup

```bash
# Create a backup of all databases
clickhouse-backup create 2026-03-31-full

# Create a backup of specific databases
clickhouse-backup create --tables "my_database.*" 2026-03-31-mydb

# Create a backup of specific tables
clickhouse-backup create --tables "my_database.events,my_database.users" 2026-03-31-selected

# List local backups
clickhouse-backup list local
```

## Uploading to S3

```bash
# Upload a local backup to S3
clickhouse-backup upload 2026-03-31-full

# Create and upload in one step
clickhouse-backup create_remote 2026-03-31-full

# Create and upload with table filter
clickhouse-backup create_remote --tables "my_database.*" 2026-03-31-mydb

# List remote backups
clickhouse-backup list remote
```

## Downloading and Restoring

```bash
# Download a remote backup to local storage
clickhouse-backup download 2026-03-31-full

# List downloaded backups
clickhouse-backup list local

# Restore all tables from a local backup
clickhouse-backup restore 2026-03-31-full

# Restore with table filter
clickhouse-backup restore --tables "my_database.events" 2026-03-31-full

# Download and restore in one step
clickhouse-backup restore_remote 2026-03-31-full

# Restore with schema only (no data)
clickhouse-backup restore --schema 2026-03-31-full

# Restore data only (schema already exists)
clickhouse-backup restore --data 2026-03-31-full
```

## Cleaning Up Old Backups

```bash
# Delete a specific local backup
clickhouse-backup delete local 2026-03-01-full

# Delete a specific remote backup
clickhouse-backup delete remote 2026-03-01-full

# Automated cleanup - keep only the last N backups
# This is handled automatically by backups_to_keep_local and backups_to_keep_remote in config
clickhouse-backup create_remote --delete-source 2026-03-31-full
```

## Running as a Systemd Service

Create a service for scheduled backups:

```bash
sudo tee /etc/systemd/system/clickhouse-backup.service > /dev/null <<'EOF'
[Unit]
Description=ClickHouse Backup Service
After=clickhouse-server.service

[Service]
Type=oneshot
User=clickhouse
Environment=CLICKHOUSE_BACKUP_CONFIG=/etc/clickhouse-backup/config.yml
ExecStart=/usr/local/bin/clickhouse-backup create_remote full-$(date +%%Y-%%m-%%d)
StandardOutput=journal
StandardError=journal
EOF

sudo tee /etc/systemd/system/clickhouse-backup.timer > /dev/null <<'EOF'
[Unit]
Description=ClickHouse Backup Timer

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable clickhouse-backup.timer
sudo systemctl start clickhouse-backup.timer
```

## Running in Kubernetes

Deploy as a CronJob in Kubernetes:

```yaml
# clickhouse-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: clickhouse-backup
  namespace: clickhouse
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: clickhouse-backup
              image: altinity/clickhouse-backup:latest
              command:
                - /bin/sh
                - -c
                - |
                  clickhouse-backup create_remote $(date +%Y-%m-%d)-daily
              env:
                - name: REMOTE_STORAGE
                  value: s3
                - name: S3_BUCKET
                  value: your-backup-bucket
                - name: S3_PATH
                  value: clickhouse/backups
                - name: S3_REGION
                  value: us-east-1
                - name: CLICKHOUSE_HOST
                  value: clickhouse-service
                - name: CLICKHOUSE_USERNAME
                  valueFrom:
                    secretKeyRef:
                      name: clickhouse-backup-secret
                      key: username
                - name: CLICKHOUSE_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: clickhouse-backup-secret
                      key: password
              resources:
                requests:
                  memory: "512Mi"
                  cpu: "250m"
                limits:
                  memory: "2Gi"
                  cpu: "1"
```

## Monitoring Backup Status

```bash
# Check last backup time and size
clickhouse-backup list remote | tail -5

# Run a test restore to verify backup integrity
clickhouse-backup restore_remote --rm --tables "my_database.events" 2026-03-31-full
clickhouse-client --query "SELECT count() FROM my_database.events"
```

## Summary

`clickhouse-backup` provides a mature, battle-tested workflow for ClickHouse backups with S3 as the remote destination. The `create_remote` command handles everything in one step, `backups_to_keep_remote` enforces automatic rotation, and the `restore_remote` command enables one-command disaster recovery. Use the systemd timer or Kubernetes CronJob pattern to run nightly backups automatically, and always validate backups by testing a restore into a separate database or namespace.
