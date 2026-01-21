# How to Set Up Continuous Archiving with PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, WAL Archiving, Continuous Archiving, PITR, Backup, Disaster Recovery

Description: A comprehensive guide to setting up PostgreSQL continuous archiving with WAL shipping, covering archive configuration, storage options, monitoring, and point-in-time recovery preparation.

---

Continuous archiving captures Write-Ahead Log (WAL) files as they are generated, enabling point-in-time recovery (PITR) to any moment between base backups. This guide covers complete WAL archiving setup and management.

## Prerequisites

- PostgreSQL 12+ installed
- Sufficient storage for WAL archives
- Understanding of backup requirements
- Network access to archive storage (if remote)

## How Continuous Archiving Works

```
PostgreSQL Write Flow:

Transaction -> WAL Buffer -> WAL Segment File -> Archive
                                    |
                            pg_wal directory
                                    |
                            archive_command
                                    |
                            Archive Storage
```

## Basic Configuration

### Enable WAL Archiving

```conf
# postgresql.conf

# Enable archiving
archive_mode = on

# Set WAL level (required for archiving)
wal_level = replica

# Archive command - copies WAL to archive location
archive_command = 'cp %p /var/lib/postgresql/archive/%f'

# Or with test for existing file (safer)
archive_command = 'test ! -f /var/lib/postgresql/archive/%f && cp %p /var/lib/postgresql/archive/%f'

# Archive timeout - archive incomplete WAL segment after timeout
archive_timeout = 300  # 5 minutes
```

### Create Archive Directory

```bash
# Create local archive directory
sudo mkdir -p /var/lib/postgresql/archive
sudo chown postgres:postgres /var/lib/postgresql/archive

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Verify Archiving

```sql
-- Check archive status
SELECT * FROM pg_stat_archiver;

-- Force archive of current WAL segment
SELECT pg_switch_wal();

-- Check archived files
SELECT archived_count, last_archived_wal, last_archived_time
FROM pg_stat_archiver;
```

```bash
# List archived files
ls -la /var/lib/postgresql/archive/
```

## Archive to Remote Storage

### Archive to S3

```conf
# Using aws cli
archive_command = 'aws s3 cp %p s3://my-bucket/wal-archive/%f --only-show-errors'

# With compression
archive_command = 'gzip -c %p | aws s3 cp - s3://my-bucket/wal-archive/%f.gz --only-show-errors'
```

### Archive to Google Cloud Storage

```conf
archive_command = 'gsutil cp %p gs://my-bucket/wal-archive/%f'
```

### Archive to Azure Blob

```conf
archive_command = 'az storage blob upload --account-name myaccount --container-name walarchive --file %p --name %f'
```

### Archive via SSH

```conf
# Copy to remote server via SSH
archive_command = 'scp %p backup-server:/var/lib/postgresql/archive/%f'

# Or with rsync
archive_command = 'rsync -a %p backup-server:/var/lib/postgresql/archive/%f'
```

## Archive Command Best Practices

### Robust Archive Command

```bash
#!/bin/bash
# /usr/local/bin/archive_wal.sh

WAL_FILE=$1
WAL_NAME=$2
ARCHIVE_DIR="/var/lib/postgresql/archive"
REMOTE_HOST="backup-server"
REMOTE_DIR="/var/lib/postgresql/archive"

# Local archive
if ! cp "$WAL_FILE" "$ARCHIVE_DIR/$WAL_NAME"; then
    echo "Local archive failed"
    exit 1
fi

# Remote archive (optional but recommended)
if ! scp "$WAL_FILE" "$REMOTE_HOST:$REMOTE_DIR/$WAL_NAME"; then
    echo "Remote archive failed (continuing with local)"
    # Don't fail - local archive succeeded
fi

# Verify archive
if [ ! -f "$ARCHIVE_DIR/$WAL_NAME" ]; then
    echo "Archive verification failed"
    exit 1
fi

exit 0
```

```conf
# postgresql.conf
archive_command = '/usr/local/bin/archive_wal.sh %p %f'
```

### Archive with Compression

```bash
#!/bin/bash
# /usr/local/bin/archive_wal_compressed.sh

WAL_FILE=$1
WAL_NAME=$2
ARCHIVE_DIR="/var/lib/postgresql/archive"

# Compress and archive
gzip -c "$WAL_FILE" > "$ARCHIVE_DIR/${WAL_NAME}.gz"

# Verify
if [ $? -eq 0 ] && [ -f "$ARCHIVE_DIR/${WAL_NAME}.gz" ]; then
    exit 0
else
    rm -f "$ARCHIVE_DIR/${WAL_NAME}.gz"
    exit 1
fi
```

## WAL Segment Configuration

### Segment Size

```conf
# Default WAL segment size is 16MB
# Can be changed at initdb time only
# initdb --wal-segsize=64 ...

# Check current segment size
SHOW wal_segment_size;
```

### WAL Retention

```conf
# Keep WAL for streaming replication
wal_keep_size = 1GB

# Maximum WAL size before checkpoint
max_wal_size = 4GB

# Minimum WAL size to maintain
min_wal_size = 1GB
```

## Base Backup for PITR

### Create Base Backup

```bash
# Base backup with pg_basebackup
pg_basebackup \
    -D /var/lib/postgresql/backup/base_$(date +%Y%m%d) \
    -Ft \
    -z \
    -Xs \
    -P \
    -U backup_user \
    -h localhost

# Options:
# -Ft: Tar format
# -z: Compress
# -Xs: Stream WAL during backup
# -P: Show progress
```

### Backup Manifest

```bash
# PostgreSQL 13+ creates backup_manifest
# Verify backup integrity
pg_verifybackup /var/lib/postgresql/backup/base_20250121
```

## Archive Cleanup

### Retention Policy Script

```bash
#!/bin/bash
# /usr/local/bin/cleanup_archive.sh

ARCHIVE_DIR="/var/lib/postgresql/archive"
RETENTION_DAYS=7

# Find and list WAL files older than retention
find "$ARCHIVE_DIR" -name "0000*" -mtime +$RETENTION_DAYS -print

# Delete old WAL files (uncomment after testing)
# find "$ARCHIVE_DIR" -name "0000*" -mtime +$RETENTION_DAYS -delete

# Keep at least the files needed for oldest backup
# This requires knowing your oldest backup's WAL position
```

### pg_archivecleanup

```bash
# Use pg_archivecleanup to remove unneeded WAL
# Keep WAL from specific recovery point forward
pg_archivecleanup /var/lib/postgresql/archive 000000010000000000000050

# Usually called after a backup completes
# Remove WAL files older than what the backup needs
```

## Monitoring Archiving

### Archive Statistics

```sql
-- Archive status
SELECT
    archived_count,
    last_archived_wal,
    last_archived_time,
    failed_count,
    last_failed_wal,
    last_failed_time,
    stats_reset
FROM pg_stat_archiver;

-- Check for archive lag
SELECT
    pg_walfile_name(pg_current_wal_lsn()) AS current_wal,
    last_archived_wal,
    (SELECT count(*) FROM pg_ls_waldir()
     WHERE name > last_archived_wal) AS segments_behind
FROM pg_stat_archiver;
```

### Alert on Archive Failure

```sql
-- Create monitoring function
CREATE OR REPLACE FUNCTION check_archive_health()
RETURNS TABLE (
    status TEXT,
    details TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN failed_count > 0 AND last_failed_time > NOW() - INTERVAL '1 hour'
            THEN 'CRITICAL'
            WHEN archived_count = 0
            THEN 'WARNING'
            ELSE 'OK'
        END,
        format('Archived: %s, Failed: %s, Last archive: %s',
            archived_count, failed_count, last_archived_time)
    FROM pg_stat_archiver;
END;
$$ LANGUAGE plpgsql;
```

### Prometheus Metrics

```yaml
# postgres_exporter query
pg_stat_archiver_archived_count:
  query: "SELECT archived_count FROM pg_stat_archiver"
  metrics:
    - archived_count:
        usage: "COUNTER"

pg_stat_archiver_failed_count:
  query: "SELECT failed_count FROM pg_stat_archiver"
  metrics:
    - failed_count:
        usage: "COUNTER"
```

## Recovery Configuration

### Prepare for PITR

When you need to recover, you'll need:

1. Base backup
2. WAL archive files
3. Recovery target (time, transaction, or LSN)

```bash
# Example recovery setup
# 1. Restore base backup
tar -xzf base_backup.tar.gz -C /var/lib/postgresql/16/main/

# 2. Create recovery signal
touch /var/lib/postgresql/16/main/recovery.signal

# 3. Configure recovery in postgresql.conf
```

```conf
# postgresql.conf for recovery
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_time = '2025-01-21 14:30:00'
recovery_target_action = 'promote'
```

## Complete Archiving Setup Example

### Configuration

```conf
# postgresql.conf - Complete archiving setup

# WAL settings
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
wal_compression = on

# Archiving
archive_mode = on
archive_command = '/usr/local/bin/archive_wal.sh %p %f'
archive_timeout = 300

# Replication (if also using streaming)
max_wal_senders = 10
wal_keep_size = 2GB
```

### Archive Script

```bash
#!/bin/bash
# /usr/local/bin/archive_wal.sh

set -e

WAL_PATH="$1"
WAL_NAME="$2"
LOCAL_ARCHIVE="/var/lib/postgresql/archive"
S3_BUCKET="s3://my-backup-bucket/wal"

# Compress
COMPRESSED="/tmp/${WAL_NAME}.gz"
gzip -c "$WAL_PATH" > "$COMPRESSED"

# Archive to local
cp "$COMPRESSED" "${LOCAL_ARCHIVE}/${WAL_NAME}.gz"

# Archive to S3
aws s3 cp "$COMPRESSED" "${S3_BUCKET}/${WAL_NAME}.gz" --only-show-errors

# Cleanup
rm -f "$COMPRESSED"

# Verify local archive exists
test -f "${LOCAL_ARCHIVE}/${WAL_NAME}.gz"
```

### Backup Script

```bash
#!/bin/bash
# /usr/local/bin/backup_postgresql.sh

set -e

BACKUP_DIR="/var/lib/postgresql/backup"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="s3://my-backup-bucket/base"

# Create base backup
pg_basebackup \
    -D "${BACKUP_DIR}/base_${DATE}" \
    -Ft \
    -z \
    -Xs \
    -P \
    -c fast \
    -l "base_${DATE}"

# Upload to S3
aws s3 sync "${BACKUP_DIR}/base_${DATE}" "${S3_BUCKET}/base_${DATE}/"

# Record backup WAL position
psql -c "SELECT pg_walfile_name(pg_current_wal_lsn())" > "${BACKUP_DIR}/base_${DATE}/wal_position.txt"

# Cleanup old local backups (keep last 2)
ls -dt ${BACKUP_DIR}/base_* | tail -n +3 | xargs rm -rf

echo "Backup completed: base_${DATE}"
```

### Cron Schedule

```bash
# crontab -e

# Daily base backup at 2 AM
0 2 * * * /usr/local/bin/backup_postgresql.sh >> /var/log/postgresql/backup.log 2>&1

# Archive cleanup weekly (keep 14 days)
0 3 * * 0 find /var/lib/postgresql/archive -name "*.gz" -mtime +14 -delete
```

## Troubleshooting

### Archive Command Fails

```bash
# Test archive command manually
sudo -u postgres /usr/local/bin/archive_wal.sh \
    /var/lib/postgresql/16/main/pg_wal/000000010000000000000001 \
    000000010000000000000001

# Check permissions
ls -la /var/lib/postgresql/archive/
ls -la /usr/local/bin/archive_wal.sh
```

### Archive Lag Growing

```sql
-- Check pending WAL files
SELECT count(*) FROM pg_ls_waldir()
WHERE name > (SELECT last_archived_wal FROM pg_stat_archiver);

-- Check for stuck archive
SELECT * FROM pg_stat_archiver;
```

### Reset Archive Statistics

```sql
-- Reset archiver stats
SELECT pg_stat_reset_shared('archiver');
```

## Best Practices

1. **Test restore regularly** - Verify archives are usable
2. **Monitor archive lag** - Alert on growing lag
3. **Multiple destinations** - Archive to both local and cloud
4. **Compress archives** - Save storage space
5. **Secure archives** - Encrypt sensitive data
6. **Retention policy** - Balance storage vs recovery needs
7. **Document recovery** - Clear procedures for PITR

## Conclusion

PostgreSQL continuous archiving provides:

1. **Point-in-time recovery** - Recover to any moment
2. **Disaster recovery** - Protect against data loss
3. **Compliance** - Meet data retention requirements
4. **Flexibility** - Multiple archive destinations

Combined with regular base backups, continuous archiving forms a complete backup strategy for PostgreSQL.
