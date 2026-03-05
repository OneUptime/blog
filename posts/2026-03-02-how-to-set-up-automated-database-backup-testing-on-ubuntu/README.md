# How to Set Up Automated Database Backup Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Database, Backup, MySQL, PostgreSQL

Description: Implement automated database backup testing on Ubuntu to verify backup integrity, practice restoration, and ensure backups are actually usable when disaster strikes.

---

Having database backups is table stakes for running production systems. But untested backups are worse than no backups because they give false confidence. Backup files can be corrupt, restoration procedures can fail, and the steps you think work in theory may not work under pressure at 3am during an actual disaster. Automated backup testing verifies that your backups are actually usable before you need them.

## The Problem with Untested Backups

Common ways backups fail silently:

- Backup jobs complete with exit code 0 but write no data (disk full, permissions issues)
- Backup files are corrupted due to network errors during transfer
- The restore procedure has changed since the backup was last tested
- Dependency versions mismatch between backup and restore environment
- Encrypted backups have inaccessible keys

Automated testing catches these before they become disasters.

## Testing Strategy

A solid backup testing pipeline includes:

1. Take a backup (or use the most recent automated backup)
2. Restore to an isolated test environment
3. Run validation queries to verify data integrity
4. Compare row counts or checksums against expected values
5. Alert on failure, log success

## MySQL Backup Testing Script

```bash
#!/bin/bash
# /usr/local/bin/test-mysql-backup.sh
# Tests MySQL backups by restoring to a test database

set -euo pipefail

# Configuration
BACKUP_DIR="/var/backups/mysql"
TEST_DB="backup_test_$$"  # Unique test database name using PID
MYSQL_USER="backup_tester"
MYSQL_PASSWORD="TestPass123!"
PROD_DB="production_db"
LOG_FILE="/var/log/backup-tests/mysql-$(date +%Y%m%d).log"
ALERT_EMAIL="admin@example.com"

# Ensure log directory exists
mkdir -p "$(dirname $LOG_FILE)"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

alert() {
    echo "$1" | mail -s "BACKUP TEST FAILURE - $(hostname)" "$ALERT_EMAIL"
    log "ALERT SENT: $1"
}

cleanup() {
    log "Cleaning up test database..."
    mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
      -e "DROP DATABASE IF EXISTS $TEST_DB;" 2>/dev/null || true
}

trap cleanup EXIT

log "=== Starting MySQL backup test ==="

# Find the most recent backup file
BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    alert "No backup files found in $BACKUP_DIR"
    exit 1
fi

log "Testing backup: $BACKUP_FILE"
log "Backup file size: $(du -sh $BACKUP_FILE | cut -f1)"

# Check backup file is not empty
if [ ! -s "$BACKUP_FILE" ]; then
    alert "Backup file is empty: $BACKUP_FILE"
    exit 1
fi

# Verify gzip integrity
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    alert "Backup file is corrupted (gzip test failed): $BACKUP_FILE"
    exit 1
fi

log "Backup file integrity check passed."

# Create test database
log "Creating test database: $TEST_DB"
mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" \
  -e "CREATE DATABASE $TEST_DB;" 2>/dev/null

# Restore backup to test database
log "Restoring backup to test database..."
START_TIME=$(date +%s)

if ! zcat "$BACKUP_FILE" | mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$TEST_DB" 2>/dev/null; then
    alert "Failed to restore backup to test database: $BACKUP_FILE"
    exit 1
fi

END_TIME=$(date +%s)
RESTORE_TIME=$((END_TIME - START_TIME))
log "Restore completed in ${RESTORE_TIME} seconds."

# Run validation queries
log "Running validation queries..."

# Check table count
TABLE_COUNT=$(mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$TEST_DB" \
  -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$TEST_DB';" 2>/dev/null)

log "Tables restored: $TABLE_COUNT"

if [ "$TABLE_COUNT" -eq 0 ]; then
    alert "No tables found in restored database: $TEST_DB"
    exit 1
fi

# Check specific critical tables and row counts
# Customize these queries for your schema
USERS_COUNT=$(mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$TEST_DB" \
  -se "SELECT COUNT(*) FROM users;" 2>/dev/null)

log "Users table row count: $USERS_COUNT"

if [ "$USERS_COUNT" -lt 1 ]; then
    alert "Users table appears empty in restored backup"
    exit 1
fi

# Compare with production count (within acceptable variance)
PROD_USERS=$(mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$PROD_DB" \
  -se "SELECT COUNT(*) FROM users;" 2>/dev/null)

log "Production users count: $PROD_USERS"

# Allow up to 5% difference (accounting for recent inserts)
VARIANCE=$(echo "scale=2; ($PROD_USERS - $USERS_COUNT) * 100 / $PROD_USERS" | bc -l)
log "Variance from production: ${VARIANCE}%"

if [ $(echo "$VARIANCE > 5" | bc) -eq 1 ]; then
    alert "Backup row count variance too high: ${VARIANCE}% (backup: $USERS_COUNT, prod: $PROD_USERS)"
    exit 1
fi

log "=== Backup test PASSED ==="
log "Backup file: $BACKUP_FILE"
log "Tables: $TABLE_COUNT"
log "Restore time: ${RESTORE_TIME}s"
```

## PostgreSQL Backup Testing Script

```bash
#!/bin/bash
# /usr/local/bin/test-postgres-backup.sh

set -euo pipefail

BACKUP_DIR="/var/backups/postgresql"
TEST_DB="backup_test_$$"
PG_USER="postgres"
LOG_FILE="/var/log/backup-tests/postgres-$(date +%Y%m%d).log"
ALERT_EMAIL="admin@example.com"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

cleanup() {
    sudo -u postgres dropdb --if-exists "$TEST_DB" 2>/dev/null || true
}
trap cleanup EXIT

log "=== Starting PostgreSQL backup test ==="

BACKUP_FILE=$(ls -t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
    echo "No backup found" | mail -s "PG BACKUP TEST FAILURE" "$ALERT_EMAIL"
    exit 1
fi

# Verify backup using pg_restore --list (doesn't actually restore)
if ! sudo -u postgres pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "pg_restore --list failed for $BACKUP_FILE" | \
      mail -s "PG BACKUP TEST FAILURE" "$ALERT_EMAIL"
    exit 1
fi

log "pg_restore integrity check passed."

# Create test database and restore
sudo -u postgres createdb "$TEST_DB"

START_TIME=$(date +%s)
if ! sudo -u postgres pg_restore \
    --dbname="$TEST_DB" \
    --no-owner \
    --no-privileges \
    --jobs=4 \
    "$BACKUP_FILE" 2>/dev/null; then
    log "pg_restore had some warnings (checking if data was restored...)"
fi

END_TIME=$(date +%s)
log "Restore time: $((END_TIME - START_TIME)) seconds"

# Validate restoration
TABLE_COUNT=$(sudo -u postgres psql -d "$TEST_DB" -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

log "Tables restored: $TABLE_COUNT"

if [ "$TABLE_COUNT" -eq 0 ]; then
    echo "No tables in restored database" | mail -s "PG BACKUP TEST FAILURE" "$ALERT_EMAIL"
    exit 1
fi

log "=== PostgreSQL backup test PASSED ==="
```

## Automating with Cron

```bash
# Make scripts executable
sudo chmod +x /usr/local/bin/test-mysql-backup.sh
sudo chmod +x /usr/local/bin/test-postgres-backup.sh

# Create log directory
sudo mkdir -p /var/log/backup-tests
sudo chown root:adm /var/log/backup-tests

# Schedule daily backup tests
sudo crontab -e
```

```cron
# Test MySQL backup daily at 6 AM (after backups complete at 4 AM)
0 6 * * * /usr/local/bin/test-mysql-backup.sh >> /var/log/backup-tests/cron.log 2>&1

# Test PostgreSQL backup daily at 7 AM
0 7 * * * /usr/local/bin/test-postgres-backup.sh >> /var/log/backup-tests/cron.log 2>&1
```

## Testing Backup Encryption

If backups are encrypted:

```bash
#!/bin/bash
# Test GPG-encrypted backup

BACKUP_FILE="/var/backups/mysql/backup-$(date +%Y%m%d).sql.gz.gpg"
GPG_RECIPIENT="backup@example.com"
TEST_DECRYPT="/tmp/test-decrypt-$$.sql.gz"

cleanup() { rm -f "$TEST_DECRYPT"; }
trap cleanup EXIT

# Test decryption
if ! gpg --batch \
    --decrypt \
    --output "$TEST_DECRYPT" \
    "$BACKUP_FILE" 2>/dev/null; then
    echo "Backup decryption failed!" | mail -s "BACKUP DECRYPT FAILURE" admin@example.com
    exit 1
fi

# Test gzip integrity
if ! gzip -t "$TEST_DECRYPT"; then
    echo "Decrypted backup is corrupt!" | mail -s "BACKUP CORRUPT" admin@example.com
    exit 1
fi

echo "Encrypted backup decryption test passed."
```

## Monitoring Backup Test Results

Track backup test outcomes over time with a simple log parser:

```bash
#!/bin/bash
# /usr/local/bin/backup-test-report.sh
# Generates a weekly summary of backup test results

LOGDIR="/var/log/backup-tests"

echo "=== Backup Test Report - $(date) ==="
echo ""
echo "MySQL Tests (last 7 days):"
grep -h "backup test" "$LOGDIR"/mysql-*.log 2>/dev/null | tail -7

echo ""
echo "PostgreSQL Tests (last 7 days):"
grep -h "backup test" "$LOGDIR"/postgres-*.log 2>/dev/null | tail -7

echo ""
echo "Failures (last 7 days):"
grep -h "FAILED\|ALERT\|ERROR" "$LOGDIR"/*.log 2>/dev/null | tail -20
```

Integrate backup test monitoring with your observability platform. [OneUptime](https://oneuptime.com) can monitor the output of these scripts and alert your team if backup tests stop running or start failing, giving you an additional safety net beyond the email alerts in the scripts themselves.

## Best Practices

Test in a separate environment with no access to production - this prevents accidental writes to production during testing. Run tests as a different user with limited privileges. Rotate test databases so old failed tests don't accumulate. Keep restore time measurements so you know your RTO (Recovery Time Objective) in advance. Store backup test results for compliance auditing - many compliance frameworks require documented evidence that backups work.
