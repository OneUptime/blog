# How to Test PostgreSQL Backup Restoration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Backup Testing, Disaster Recovery, Validation, Data Integrity

Description: A comprehensive guide to testing PostgreSQL backup restoration, covering automated testing procedures, validation checks, recovery verification, and establishing a backup testing schedule.

---

Backups are only valuable if they can be restored. Regular backup testing ensures your disaster recovery procedures work when needed. This guide covers comprehensive backup validation and restoration testing strategies.

## Prerequisites

- Existing backup strategy (pg_dump, pg_basebackup, pgBackRest, or Barman)
- Test environment or spare resources
- Documented backup procedures
- Understanding of your recovery objectives

## Why Test Backups?

| Risk | Impact Without Testing |
|------|------------------------|
| Corrupted backups | Complete data loss |
| Missing WAL files | Incomplete recovery |
| Configuration errors | Extended downtime |
| Permission issues | Failed restore |
| Storage problems | Unusable backups |

## Backup Testing Strategy

```
Backup Testing Levels:

Level 1: Existence Check
   - Backup files exist
   - Expected size/count

Level 2: Integrity Check
   - Files not corrupted
   - Checksums valid

Level 3: Partial Restore
   - Can extract specific tables
   - Schema validation

Level 4: Full Restore
   - Complete database restore
   - All data accessible

Level 5: Application Verification
   - Application can connect
   - Business logic works
```

## Level 1: Existence Checks

### Basic Verification Script

```bash
#!/bin/bash
# check_backup_exists.sh

BACKUP_DIR="/var/lib/postgresql/backup"
MAX_AGE_HOURS=24
MIN_SIZE_MB=100

# Check latest backup exists
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "CRITICAL: No backup files found"
    exit 2
fi

# Check backup age
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))
if [ "$BACKUP_AGE" -gt "$MAX_AGE_HOURS" ]; then
    echo "WARNING: Latest backup is ${BACKUP_AGE} hours old"
    exit 1
fi

# Check backup size
BACKUP_SIZE=$(( $(stat -c %s "$LATEST_BACKUP") / 1024 / 1024 ))
if [ "$BACKUP_SIZE" -lt "$MIN_SIZE_MB" ]; then
    echo "WARNING: Backup size ${BACKUP_SIZE}MB is smaller than expected"
    exit 1
fi

echo "OK: Backup ${LATEST_BACKUP} - ${BACKUP_SIZE}MB - ${BACKUP_AGE}h old"
exit 0
```

### pgBackRest Verification

```bash
#!/bin/bash
# check_pgbackrest_backup.sh

STANZA="main"

# Check backup exists
BACKUP_INFO=$(pgbackrest --stanza=$STANZA info --output=json)

if [ -z "$BACKUP_INFO" ]; then
    echo "CRITICAL: Cannot get backup info"
    exit 2
fi

# Parse backup count
BACKUP_COUNT=$(echo "$BACKUP_INFO" | jq '.[0].backup | length')

if [ "$BACKUP_COUNT" -eq 0 ]; then
    echo "CRITICAL: No backups found"
    exit 2
fi

# Check latest backup status
LATEST_STATUS=$(echo "$BACKUP_INFO" | jq -r '.[0].backup[-1].status')
LATEST_TIME=$(echo "$BACKUP_INFO" | jq -r '.[0].backup[-1].timestamp.stop')

if [ "$LATEST_STATUS" != "ok" ]; then
    echo "WARNING: Latest backup status is $LATEST_STATUS"
    exit 1
fi

echo "OK: $BACKUP_COUNT backups available, latest: $LATEST_TIME"
exit 0
```

## Level 2: Integrity Checks

### Checksum Verification

```bash
#!/bin/bash
# verify_backup_integrity.sh

BACKUP_FILE=$1

# For pg_dump custom format
if [[ "$BACKUP_FILE" == *.dump ]]; then
    # List contents (validates format)
    pg_restore -l "$BACKUP_FILE" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "OK: Backup format valid"
    else
        echo "CRITICAL: Backup format invalid"
        exit 2
    fi
fi

# For tar backups
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    tar -tzf "$BACKUP_FILE" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "OK: Tar archive valid"
    else
        echo "CRITICAL: Tar archive corrupted"
        exit 2
    fi
fi

# Check stored checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
    sha256sum -c "$CHECKSUM_FILE"
    if [ $? -ne 0 ]; then
        echo "CRITICAL: Checksum mismatch"
        exit 2
    fi
fi
```

### PostgreSQL 13+ Backup Manifest

```bash
# Verify backup with manifest (pg_basebackup backups)
pg_verifybackup /var/lib/postgresql/backup/base_20250121

# Output shows any issues:
# pg_verifybackup: error: checksum mismatch for file "base/16384/12345"
```

### pgBackRest Verification

```bash
# Verify backup integrity
pgbackrest --stanza=main verify

# Check specific backup
pgbackrest --stanza=main info --set=20250121-010000F
```

## Level 3: Partial Restore Testing

### Test Table Restoration

```bash
#!/bin/bash
# test_partial_restore.sh

BACKUP_FILE=$1
TEST_TABLE="users"
TEST_DB="restore_test_$$"

echo "Creating test database..."
createdb "$TEST_DB"

echo "Restoring table $TEST_TABLE..."
pg_restore -d "$TEST_DB" -t "$TEST_TABLE" "$BACKUP_FILE"

if [ $? -ne 0 ]; then
    echo "CRITICAL: Table restore failed"
    dropdb "$TEST_DB"
    exit 2
fi

echo "Verifying table..."
ROW_COUNT=$(psql -t -d "$TEST_DB" -c "SELECT COUNT(*) FROM $TEST_TABLE")

if [ "$ROW_COUNT" -lt 1 ]; then
    echo "WARNING: Restored table is empty"
    dropdb "$TEST_DB"
    exit 1
fi

echo "OK: Table $TEST_TABLE restored with $ROW_COUNT rows"

# Cleanup
dropdb "$TEST_DB"
exit 0
```

### Schema Validation

```bash
#!/bin/bash
# validate_schema.sh

BACKUP_FILE=$1
EXPECTED_SCHEMA="/etc/postgresql/expected_schema.sql"

# Extract schema from backup
pg_restore -s "$BACKUP_FILE" > /tmp/backup_schema.sql

# Compare with expected (ignoring comments and whitespace)
diff <(grep -v "^--" "$EXPECTED_SCHEMA" | tr -s ' \n') \
     <(grep -v "^--" /tmp/backup_schema.sql | tr -s ' \n') > /dev/null

if [ $? -ne 0 ]; then
    echo "WARNING: Schema differences detected"
    exit 1
fi

echo "OK: Schema matches expected"
rm /tmp/backup_schema.sql
exit 0
```

## Level 4: Full Restore Testing

### Complete Restore Script

```bash
#!/bin/bash
# full_restore_test.sh

set -e

BACKUP_FILE=$1
TEST_DB="full_restore_test_$$"
TEST_PORT=5433
TEST_DIR="/tmp/pg_restore_test_$$"
LOG_FILE="/var/log/postgresql/restore_test.log"

echo "$(date): Starting full restore test" | tee -a "$LOG_FILE"

# Create test directory
mkdir -p "$TEST_DIR/data"

# Method 1: For pg_dump backups
if [[ "$BACKUP_FILE" == *.dump ]] || [[ "$BACKUP_FILE" == *.sql ]]; then

    echo "Restoring pg_dump backup..." | tee -a "$LOG_FILE"

    createdb "$TEST_DB"

    if [[ "$BACKUP_FILE" == *.dump ]]; then
        pg_restore -d "$TEST_DB" -j 4 "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"
    else
        psql -d "$TEST_DB" < "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"
    fi

    # Verify
    TABLES=$(psql -t -d "$TEST_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
    echo "Restored $TABLES tables" | tee -a "$LOG_FILE"

    # Cleanup
    dropdb "$TEST_DB"

fi

# Method 2: For pg_basebackup (PITR capable)
if [[ "$BACKUP_FILE" == *.tar.gz ]] || [[ -d "$BACKUP_FILE" ]]; then

    echo "Restoring base backup..." | tee -a "$LOG_FILE"

    # Extract or copy backup
    if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
        tar -xzf "$BACKUP_FILE" -C "$TEST_DIR/data"
    else
        cp -r "$BACKUP_FILE"/* "$TEST_DIR/data/"
    fi

    # Configure for test
    cat >> "$TEST_DIR/data/postgresql.conf" << EOF
port = $TEST_PORT
unix_socket_directories = '$TEST_DIR'
EOF

    # Remove recovery signal if present (test primary mode)
    rm -f "$TEST_DIR/data/recovery.signal"
    rm -f "$TEST_DIR/data/standby.signal"

    # Start test instance
    pg_ctl -D "$TEST_DIR/data" -l "$TEST_DIR/pg.log" start

    sleep 5

    # Verify
    psql -p $TEST_PORT -c "SELECT version();" | tee -a "$LOG_FILE"

    DATABASES=$(psql -p $TEST_PORT -t -c "SELECT COUNT(*) FROM pg_database WHERE datistemplate=false")
    echo "Found $DATABASES databases" | tee -a "$LOG_FILE"

    # Cleanup
    pg_ctl -D "$TEST_DIR/data" stop
    rm -rf "$TEST_DIR"

fi

echo "$(date): Restore test completed successfully" | tee -a "$LOG_FILE"
exit 0
```

### pgBackRest Full Restore Test

```bash
#!/bin/bash
# test_pgbackrest_restore.sh

STANZA="main"
TEST_DIR="/tmp/pgbackrest_test_$$"
TEST_PORT=5433

echo "Starting pgBackRest restore test..."

# Create test directory
mkdir -p "$TEST_DIR"

# Restore backup
pgbackrest --stanza=$STANZA \
    --pg1-path="$TEST_DIR" \
    --target-action=promote \
    restore

# Configure for test
cat >> "$TEST_DIR/postgresql.conf" << EOF
port = $TEST_PORT
unix_socket_directories = '$TEST_DIR'
archive_mode = off
EOF

# Start test instance
pg_ctl -D "$TEST_DIR" start

sleep 10

# Verify
psql -p $TEST_PORT -c "SELECT 'Restore successful'" || exit 2

# Validate data
TOTAL_ROWS=$(psql -p $TEST_PORT -t -c "
    SELECT SUM(n_live_tup) FROM pg_stat_user_tables
")
echo "Total rows in restored database: $TOTAL_ROWS"

# Cleanup
pg_ctl -D "$TEST_DIR" stop
rm -rf "$TEST_DIR"

echo "Restore test completed successfully"
exit 0
```

## Level 5: Application Verification

### Application Connection Test

```bash
#!/bin/bash
# test_app_connection.sh

TEST_DB="app_test_$$"
APP_USER="myapp"
APP_CONFIG="/etc/myapp/database.yml"

# Restore backup
pg_restore -d "$TEST_DB" /var/lib/postgresql/backup/latest.dump

# Test application user can connect
psql -U "$APP_USER" -d "$TEST_DB" -c "SELECT 1" || {
    echo "CRITICAL: Application user cannot connect"
    dropdb "$TEST_DB"
    exit 2
}

# Run application health checks
# Example: Test critical queries
psql -U "$APP_USER" -d "$TEST_DB" << 'EOF'
-- Test user authentication query
SELECT id, email FROM users WHERE email = 'test@example.com' LIMIT 1;

-- Test product listing query
SELECT COUNT(*) FROM products WHERE active = true;

-- Test order processing query
SELECT o.id, o.total FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE c.id = 1 LIMIT 1;
EOF

if [ $? -ne 0 ]; then
    echo "WARNING: Application queries failed"
    dropdb "$TEST_DB"
    exit 1
fi

dropdb "$TEST_DB"
echo "OK: Application verification passed"
exit 0
```

### Data Consistency Checks

```sql
-- consistency_checks.sql
-- Run after restore to verify data integrity

-- Check foreign key relationships
SELECT 'orphan_orders' AS check_name, COUNT(*) AS count
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id)

UNION ALL

-- Check required fields
SELECT 'null_emails' AS check_name, COUNT(*)
FROM users WHERE email IS NULL

UNION ALL

-- Check data ranges
SELECT 'future_orders' AS check_name, COUNT(*)
FROM orders WHERE created_at > NOW()

UNION ALL

-- Check row counts against expected minimums
SELECT 'low_user_count' AS check_name,
    CASE WHEN COUNT(*) < 1000 THEN 1 ELSE 0 END
FROM users;
```

## Automated Testing Schedule

### Cron Configuration

```bash
# /etc/cron.d/backup-testing

# Daily existence and integrity check
0 6 * * * postgres /usr/local/bin/check_backup_exists.sh >> /var/log/postgresql/backup_test.log 2>&1

# Weekly partial restore test
0 4 * * 0 postgres /usr/local/bin/test_partial_restore.sh /var/lib/postgresql/backup/latest.dump >> /var/log/postgresql/backup_test.log 2>&1

# Monthly full restore test
0 3 1 * * postgres /usr/local/bin/full_restore_test.sh /var/lib/postgresql/backup/latest.dump >> /var/log/postgresql/backup_test.log 2>&1
```

### Monitoring Integration

```bash
#!/bin/bash
# backup_test_metrics.sh

# Output for Prometheus textfile collector
METRICS_FILE="/var/lib/prometheus/backup_tests.prom"

# Run test and capture result
/usr/local/bin/check_backup_exists.sh
EXISTENCE_RESULT=$?

/usr/local/bin/verify_backup_integrity.sh /var/lib/postgresql/backup/latest.dump
INTEGRITY_RESULT=$?

# Write metrics
cat > "$METRICS_FILE" << EOF
# HELP backup_test_existence_check Backup existence check result (0=ok, 1=warning, 2=critical)
# TYPE backup_test_existence_check gauge
backup_test_existence_check $EXISTENCE_RESULT

# HELP backup_test_integrity_check Backup integrity check result
# TYPE backup_test_integrity_check gauge
backup_test_integrity_check $INTEGRITY_RESULT

# HELP backup_test_last_run_timestamp Last backup test run time
# TYPE backup_test_last_run_timestamp gauge
backup_test_last_run_timestamp $(date +%s)
EOF
```

## Documentation and Reporting

### Test Report Template

```bash
#!/bin/bash
# generate_test_report.sh

REPORT_FILE="/var/log/postgresql/backup_test_report_$(date +%Y%m%d).txt"

cat > "$REPORT_FILE" << EOF
PostgreSQL Backup Test Report
=============================
Date: $(date)
Server: $(hostname)

Backup Summary:
---------------
$(pgbackrest --stanza=main info)

Test Results:
-------------
EOF

# Run tests and append results
echo "Existence Check:" >> "$REPORT_FILE"
/usr/local/bin/check_backup_exists.sh >> "$REPORT_FILE" 2>&1

echo "" >> "$REPORT_FILE"
echo "Integrity Check:" >> "$REPORT_FILE"
/usr/local/bin/verify_backup_integrity.sh >> "$REPORT_FILE" 2>&1

echo "" >> "$REPORT_FILE"
echo "Restore Test:" >> "$REPORT_FILE"
/usr/local/bin/full_restore_test.sh >> "$REPORT_FILE" 2>&1

# Send report
mail -s "Backup Test Report - $(hostname)" admin@company.com < "$REPORT_FILE"
```

## Best Practices

1. **Test regularly** - Weekly minimum, monthly full restore
2. **Automate testing** - Remove human error
3. **Test all backup types** - Full, incremental, WAL
4. **Verify application layer** - Not just database connectivity
5. **Document results** - Track test history
6. **Alert on failures** - Immediate notification
7. **Test recovery time** - Measure actual RTO

## Conclusion

Backup testing validates your disaster recovery capability:

1. **Multiple test levels** - From existence to application
2. **Automated verification** - Consistent, regular testing
3. **Documentation** - Clear procedures and results
4. **Monitoring integration** - Alert on test failures

Regular backup testing transforms backups from hope into confidence.
