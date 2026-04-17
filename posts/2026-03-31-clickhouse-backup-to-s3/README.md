# How to Back Up ClickHouse to AWS S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, AWS S3, Administration, Disaster Recovery, Storage

Description: Learn how to back up ClickHouse databases and tables to AWS S3 using the native BACKUP command, configure S3 credentials, and schedule incremental backups for production environments.

---

ClickHouse 22.11+ includes a native `BACKUP` command that supports writing directly to S3. This is the simplest and most reliable way to create consistent, point-in-time backups without pausing ingestion. The command is transactionally consistent for MergeTree tables and supports incremental backups that only copy changed data parts.

## Prerequisites

Ensure your ClickHouse version supports S3 backups:

```sql
SELECT version();
-- Requires 22.11 or later for native BACKUP TO S3
```

Install the AWS CLI for credential verification:

```bash
sudo apt-get install -y awscli
aws --version
```

## Configuring S3 Credentials in ClickHouse

Create a named backup configuration file:

```bash
sudo tee /etc/clickhouse-server/config.d/s3-backup.xml > /dev/null <<'EOF'
<clickhouse>
    <backups>
        <allowed_path>s3://your-backup-bucket/clickhouse/</allowed_path>
    </backups>

    <storage_configuration>
        <disks>
            <s3_backup>
                <type>s3</type>
                <endpoint>https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/</endpoint>
                <access_key_id>YOUR_ACCESS_KEY_ID</access_key_id>
                <secret_access_key>YOUR_SECRET_ACCESS_KEY</secret_access_key>
                <region>us-east-1</region>
            </s3_backup>
        </disks>
    </storage_configuration>
</clickhouse>
EOF

sudo systemctl restart clickhouse-server
```

Alternatively, use IAM instance roles (preferred in production - no credentials in config files):

```bash
sudo tee /etc/clickhouse-server/config.d/s3-backup.xml > /dev/null <<'EOF'
<clickhouse>
    <backups>
        <allowed_path>s3://your-backup-bucket/clickhouse/</allowed_path>
    </backups>

    <storage_configuration>
        <disks>
            <s3_backup>
                <type>s3</type>
                <endpoint>https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/</endpoint>
                <use_environment_credentials>true</use_environment_credentials>
                <region>us-east-1</region>
            </s3_backup>
        </disks>
    </storage_configuration>
</clickhouse>
EOF
```

## Creating a Full Database Backup

Back up an entire database to S3:

```sql
BACKUP DATABASE my_database
TO S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-full/', 'ACCESS_KEY', 'SECRET_KEY');
```

Using environment credentials (with IAM role):

```sql
BACKUP DATABASE my_database
TO S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-full/');
```

## Backing Up a Single Table

```sql
BACKUP TABLE my_database.events
TO S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-events/');
```

## Backing Up All Databases

```sql
BACKUP ALL
TO S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31-all/');
```

## Asynchronous Backup

For large databases, run the backup asynchronously and poll for completion:

```sql
-- Start async backup
BACKUP DATABASE my_database
TO S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/2026-03-31/')
ASYNC;

-- Check backup status
SELECT
    id,
    status,
    name,
    start_time,
    end_time,
    num_files,
    formatReadableSize(total_size) AS size,
    error
FROM system.backups
ORDER BY start_time DESC
LIMIT 10;
```

## Incremental Backups

Incremental backups copy only the data parts that changed since the base backup, dramatically reducing time and cost:

```sql
-- First: create a full base backup
BACKUP DATABASE my_database
TO S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/base-2026-03-01/');

-- Then: create incremental backups referencing the base
BACKUP DATABASE my_database
TO S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/incr-2026-03-31/')
SETTINGS base_backup = S3('https://s3.us-east-1.amazonaws.com/your-backup-bucket/clickhouse/backups/base-2026-03-01/');
```

## Backup Automation Script

```bash
#!/bin/bash
# /usr/local/bin/clickhouse-backup-s3.sh

set -euo pipefail

DATE=$(date '+%Y-%m-%d')
S3_BUCKET="your-backup-bucket"
S3_PREFIX="clickhouse/backups"
DATABASES="${CLICKHOUSE_BACKUP_DATABASES:-my_database}"
LOG_FILE="/var/log/clickhouse-backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Determine if this is a weekly full or daily incremental
DOW=$(date '+%u')  # 1=Monday, 7=Sunday
if [ "$DOW" = "1" ]; then
    BACKUP_TYPE="full"
    S3_PATH="s3://${S3_BUCKET}/${S3_PREFIX}/${DATE}-full/"
    BASE_BACKUP_SQL=""
else
    BACKUP_TYPE="incremental"
    # Find the most recent Monday (full backup)
    LAST_MONDAY=$(date -d 'last monday' '+%Y-%m-%d' 2>/dev/null || date -v-mon '+%Y-%m-%d')
    S3_PATH="s3://${S3_BUCKET}/${S3_PREFIX}/${DATE}-incr/"
    BASE_URL="https://s3.us-east-1.amazonaws.com/${S3_BUCKET}/${S3_PREFIX}/${LAST_MONDAY}-full/"
    BASE_BACKUP_SQL="SETTINGS base_backup = S3('${BASE_URL}')"
fi

log "Starting ${BACKUP_TYPE} backup to ${S3_PATH}"

for DB in $DATABASES; do
    log "Backing up database: ${DB}"

    # Build S3 URL for this database
    DB_S3_PATH="${S3_PATH}${DB}/"

    SQL="BACKUP DATABASE ${DB} TO S3('https://s3.us-east-1.amazonaws.com/${S3_BUCKET}/${S3_PREFIX}/${DATE}-${BACKUP_TYPE}/${DB}/')"
    if [ -n "${BASE_BACKUP_SQL:-}" ]; then
        SQL="${SQL} ${BASE_BACKUP_SQL}"
    fi

    result=$(clickhouse-client --query "$SQL" 2>&1)
    log "Result for ${DB}: ${result}"
done

log "Backup completed successfully"
```

## Checking Backup Status

```sql
-- View all recent backups
SELECT
    id,
    status,
    name,
    base_backup_name,
    start_time,
    end_time,
    dateDiff('second', start_time, end_time) AS duration_s,
    num_files,
    formatReadableSize(total_size) AS total_size,
    formatReadableSize(uncompressed_size) AS uncompressed_size,
    error
FROM system.backups
ORDER BY start_time DESC
LIMIT 20;
```

## Verifying the Backup Exists in S3

```bash
# List backup contents in S3
aws s3 ls s3://your-backup-bucket/clickhouse/backups/ --recursive | sort

# Check the backup manifest (XML)
aws s3 cp s3://your-backup-bucket/clickhouse/backups/2026-03-31-full/.backup - | head -30
```

## Summary

ClickHouse's native `BACKUP` command writes directly to S3 without requiring any intermediate storage. Configure S3 access using IAM instance roles rather than hardcoded credentials for production safety. Run weekly full backups on Mondays and daily incremental backups that reference the base backup to minimize transfer costs. Always confirm the backup completed without errors by querying `system.backups` and checking the S3 manifest file before treating a backup as valid.
