# How to Implement Automated Backups with pg_dump in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Backup, pg_dump, Automation, Disaster Recovery

Description: Learn how to set up automated PostgreSQL backups using pg_dump. This guide covers backup scripts, retention policies, compression, verification, and cloud storage integration for reliable disaster recovery.

---

Backups are the safety net that nobody thinks about until disaster strikes. A well-automated backup system runs silently in the background, creating reliable restore points that you hope never to use but will be incredibly grateful to have when needed. PostgreSQL's `pg_dump` is a straightforward and reliable tool for logical backups.

## Understanding pg_dump Backup Types

pg_dump offers several output formats, each with trade-offs.

| Format | Flag | Pros | Cons |
|--------|------|------|------|
| Plain SQL | -Fp | Human readable, easy to edit | Slow restore, no parallelism |
| Custom | -Fc | Compressed, selective restore | Requires pg_restore |
| Directory | -Fd | Parallel backup/restore | Multiple files to manage |
| Tar | -Ft | Single archive file | No compression, no parallelism |

For automated backups, the custom format (`-Fc`) provides the best balance of compression and flexibility.

## Basic Backup Script

Start with a simple script that handles the essentials.

```bash
#!/bin/bash
# backup_postgres.sh - Basic PostgreSQL backup script

# Configuration
BACKUP_DIR="/var/backups/postgresql"
PGHOST="localhost"
PGPORT="5432"
PGUSER="backup_user"
PGDATABASE="myapp"
RETENTION_DAYS=7

# Create timestamp for filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${PGDATABASE}_${TIMESTAMP}.dump"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Create the backup using custom format (compressed)
pg_dump \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    -Fc \
    -f "${BACKUP_FILE}" \
    "${PGDATABASE}"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: ${BACKUP_FILE}"

    # Get backup size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "Backup size: ${BACKUP_SIZE}"
else
    echo "ERROR: Backup failed!" >&2
    exit 1
fi

# Remove backups older than retention period
find "${BACKUP_DIR}" -name "*.dump" -mtime +${RETENTION_DAYS} -delete
echo "Cleaned up backups older than ${RETENTION_DAYS} days"
```

## Setting Up the Backup User

Create a dedicated user with minimal required privileges.

```sql
-- Create backup user
CREATE USER backup_user WITH PASSWORD 'secure_password';

-- Grant read access to all tables
GRANT CONNECT ON DATABASE myapp TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup_user;

-- Ensure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO backup_user;
```

## Passwordless Authentication

Use a `.pgpass` file for secure, passwordless backup connections.

```bash
# Create .pgpass file (must be owned by user running backups)
# Format: hostname:port:database:username:password

cat > ~/.pgpass << 'EOF'
localhost:5432:myapp:backup_user:secure_password
localhost:5432:*:backup_user:secure_password
EOF

# Secure the file (required by PostgreSQL)
chmod 600 ~/.pgpass
```

## Production-Grade Backup Script

A more robust script with logging, notifications, and verification.

```bash
#!/bin/bash
# production_backup.sh - Production PostgreSQL backup script

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/postgresql"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-backup_user}"
RETENTION_DAYS=30
LOG_FILE="/var/log/postgresql/backup.log"
ALERT_EMAIL="dba@example.com"

# Get list of databases (excluding templates)
DATABASES=$(psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -t -c \
    "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';")

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Alert function
send_alert() {
    local subject="$1"
    local message="$2"
    echo "${message}" | mail -s "[PostgreSQL Backup] ${subject}" "${ALERT_EMAIL}" 2>/dev/null || true
}

# Create backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAILY_DIR="${BACKUP_DIR}/${TIMESTAMP}"
mkdir -p "${DAILY_DIR}"

log "Starting backup to ${DAILY_DIR}"

BACKUP_SUCCESS=true
BACKUP_SUMMARY=""

for DB in ${DATABASES}; do
    DB=$(echo "${DB}" | xargs)  # Trim whitespace
    [ -z "${DB}" ] && continue

    BACKUP_FILE="${DAILY_DIR}/${DB}.dump"
    log "Backing up database: ${DB}"

    START_TIME=$(date +%s)

    # Create backup with compression
    if pg_dump \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -Fc \
        --verbose \
        -f "${BACKUP_FILE}" \
        "${DB}" 2>> "${LOG_FILE}"; then

        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

        log "SUCCESS: ${DB} - Size: ${BACKUP_SIZE}, Duration: ${DURATION}s"
        BACKUP_SUMMARY="${BACKUP_SUMMARY}\n${DB}: ${BACKUP_SIZE} (${DURATION}s)"

        # Verify the backup
        if pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1; then
            log "VERIFIED: ${DB} backup is readable"
        else
            log "WARNING: ${DB} backup verification failed"
            BACKUP_SUCCESS=false
        fi
    else
        log "FAILED: ${DB} backup failed"
        BACKUP_SUCCESS=false
        BACKUP_SUMMARY="${BACKUP_SUMMARY}\n${DB}: FAILED"
    fi
done

# Also backup global objects (roles, tablespaces)
log "Backing up global objects"
GLOBALS_FILE="${DAILY_DIR}/globals.sql"
pg_dumpall \
    -h "${PGHOST}" \
    -p "${PGPORT}" \
    -U "${PGUSER}" \
    --globals-only \
    -f "${GLOBALS_FILE}" 2>> "${LOG_FILE}"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${DAILY_DIR}" | cut -f1)
log "Total backup size: ${TOTAL_SIZE}"

# Clean up old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;

# Send notification
if [ "${BACKUP_SUCCESS}" = true ]; then
    send_alert "SUCCESS" "Backup completed successfully.\n\nSummary:${BACKUP_SUMMARY}\n\nTotal size: ${TOTAL_SIZE}"
else
    send_alert "FAILURE" "Backup completed with errors. Check logs at ${LOG_FILE}"
fi

log "Backup process completed"
```

## Parallel Backup for Large Databases

For databases with many tables, use parallel backup.

```bash
#!/bin/bash
# parallel_backup.sh - Parallel backup for large databases

BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE="large_database"
JOBS=4  # Number of parallel jobs

# Directory format supports parallel operations
pg_dump \
    -h localhost \
    -U backup_user \
    -Fd \
    -j ${JOBS} \
    -f "${BACKUP_DIR}/${DATABASE}_${TIMESTAMP}" \
    "${DATABASE}"

echo "Parallel backup completed with ${JOBS} workers"
```

## Uploading Backups to Cloud Storage

### AWS S3 Integration

```bash
#!/bin/bash
# upload_to_s3.sh - Upload backups to S3

BACKUP_DIR="/var/backups/postgresql"
S3_BUCKET="s3://my-company-backups/postgresql"
TIMESTAMP=$(date +%Y%m%d)

# Sync today's backup to S3
aws s3 sync \
    "${BACKUP_DIR}/${TIMESTAMP}" \
    "${S3_BUCKET}/${TIMESTAMP}/" \
    --storage-class STANDARD_IA

# Apply S3 lifecycle policy for retention
# Configure this in AWS console or via Terraform
```

### Google Cloud Storage Integration

```bash
#!/bin/bash
# upload_to_gcs.sh - Upload backups to Google Cloud Storage

BACKUP_DIR="/var/backups/postgresql"
GCS_BUCKET="gs://my-company-backups/postgresql"
TIMESTAMP=$(date +%Y%m%d)

# Upload using gsutil
gsutil -m cp -r \
    "${BACKUP_DIR}/${TIMESTAMP}" \
    "${GCS_BUCKET}/${TIMESTAMP}/"
```

## Scheduling with Cron

Set up automated daily backups.

```bash
# Edit crontab
crontab -e

# Add backup schedule
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/production_backup.sh >> /var/log/postgresql/backup_cron.log 2>&1

# Weekly full backup on Sunday at 1 AM
0 1 * * 0 /usr/local/bin/parallel_backup.sh >> /var/log/postgresql/weekly_backup.log 2>&1
```

## Systemd Timer Alternative

For more control, use systemd timers instead of cron.

```ini
# /etc/systemd/system/pg-backup.service
[Unit]
Description=PostgreSQL Backup
After=postgresql.service

[Service]
Type=oneshot
User=postgres
ExecStart=/usr/local/bin/production_backup.sh
StandardOutput=append:/var/log/postgresql/backup.log
StandardError=append:/var/log/postgresql/backup.log
```

```ini
# /etc/systemd/system/pg-backup.timer
[Unit]
Description=Daily PostgreSQL Backup

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Enable and start the timer
sudo systemctl enable pg-backup.timer
sudo systemctl start pg-backup.timer

# Check timer status
sudo systemctl list-timers pg-backup.timer
```

## Verifying and Testing Restores

Backups are worthless if you cannot restore them. Test regularly.

```bash
#!/bin/bash
# test_restore.sh - Verify backup by restoring to test database

BACKUP_FILE="$1"
TEST_DB="restore_test_$(date +%s)"

# Create test database
createdb -h localhost -U postgres "${TEST_DB}"

# Restore backup
pg_restore \
    -h localhost \
    -U postgres \
    -d "${TEST_DB}" \
    --verbose \
    "${BACKUP_FILE}"

RESTORE_STATUS=$?

# Run some verification queries
if [ ${RESTORE_STATUS} -eq 0 ]; then
    TABLE_COUNT=$(psql -h localhost -U postgres -d "${TEST_DB}" -t -c \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo "Restore successful. Table count: ${TABLE_COUNT}"
fi

# Clean up test database
dropdb -h localhost -U postgres "${TEST_DB}"

exit ${RESTORE_STATUS}
```

## Monitoring Backup Status

Create a simple status endpoint for monitoring.

```sql
-- Create backup tracking table
CREATE TABLE backup_log (
    id SERIAL PRIMARY KEY,
    database_name TEXT NOT NULL,
    backup_file TEXT NOT NULL,
    backup_size_bytes BIGINT,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    error_message TEXT
);

-- Query for monitoring dashboard
SELECT
    database_name,
    backup_file,
    pg_size_pretty(backup_size_bytes) AS size,
    completed_at,
    status,
    age(now(), completed_at) AS age
FROM backup_log
WHERE completed_at > now() - interval '7 days'
ORDER BY completed_at DESC;
```

---

Automated backups with pg_dump provide a reliable foundation for disaster recovery. The key is not just creating backups, but verifying they work and storing them securely off-site. Test your restore process regularly because a backup you cannot restore is not really a backup at all.
