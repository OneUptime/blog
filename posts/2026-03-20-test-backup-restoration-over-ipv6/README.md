# How to Test Backup Restoration over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backup, Restoration, IPv6, Testing, Disaster Recovery, Verification

Description: Systematically test backup restoration procedures over IPv6 to validate data integrity, measure recovery time objectives, and identify gaps in your backup strategy.

---

Backups have no value unless you can restore from them. Testing backup restoration over IPv6 ensures your recovery procedures work correctly when using IPv6 backup infrastructure. Regular restoration tests catch issues before a real disaster strikes.

## Restoration Testing Principles

```text
Testing hierarchy for IPv6 backup restoration:
1. File-level restore test (individual files)
2. Application-level restore test (databases, services)
3. Full system restore test (entire host)
4. DR site restoration test (IPv6 backup infrastructure)
```

## Testing File Restoration over IPv6 with rsync

```bash
#!/bin/bash
# test_restore_files_ipv6.sh

BACKUP_SERVER="2001:db8::10"
BACKUP_USER="backupuser"
BACKUP_PATH="/backups/$(hostname)"
TEST_RESTORE_DIR="/tmp/restore-test-$(date +%Y%m%d)"
SSH_KEY="$HOME/.ssh/backup_key"

echo "=== File Restoration Test ==="
echo "Source: [$BACKUP_SERVER]:$BACKUP_PATH"
echo "Destination: $TEST_RESTORE_DIR"
echo ""

# Create test restore directory

mkdir -p "$TEST_RESTORE_DIR"

# Restore specific directory from backup
rsync -avz \
  -e "ssh -6 -i $SSH_KEY -o BatchMode=yes" \
  "$BACKUP_USER@[$BACKUP_SERVER]:$BACKUP_PATH/etc/nginx/" \
  "$TEST_RESTORE_DIR/nginx/" \
  2>&1

# Verify restored files
if [ -d "$TEST_RESTORE_DIR/nginx" ] && \
   [ "$(ls -A "$TEST_RESTORE_DIR/nginx")" ]; then
  FILE_COUNT=$(find "$TEST_RESTORE_DIR/nginx" -type f | wc -l)
  echo "SUCCESS: Restored $FILE_COUNT files from backup"
else
  echo "FAILED: No files restored"
  exit 1
fi

# Clean up test restore
rm -rf "$TEST_RESTORE_DIR"
echo "Cleanup complete"
```

## Testing Database Restoration over IPv6

```bash
#!/bin/bash
# test_db_restore_ipv6.sh

BACKUP_SERVER="2001:db8::10"
BACKUP_USER="backupuser"
TEST_DB="restore_test_$(date +%Y%m%d)"

echo "=== PostgreSQL Restoration Test ==="

# Copy backup from IPv6 server to local
scp -6 \
  "$BACKUP_USER@[$BACKUP_SERVER]:/backups/postgres_latest.dump.gz" \
  /tmp/restore_test.dump.gz

# Decompress
gunzip -c /tmp/restore_test.dump.gz > /tmp/restore_test.dump

# Create test database
sudo -u postgres createdb "$TEST_DB"

# Restore to test database
if ! sudo -u postgres pg_restore \
  --exit-on-error \
  -d "$TEST_DB" \
  -v \
  /tmp/restore_test.dump \
  > /tmp/restore_test_pg_restore.log 2>&1; then
  tail -20 /tmp/restore_test_pg_restore.log
  exit 1
fi
tail -20 /tmp/restore_test_pg_restore.log

# Verify user tables in restored database
TABLE_COUNT=$(sudo -u postgres psql -d "$TEST_DB" -t \
  -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema') AND table_type = 'BASE TABLE';")
echo "Restored database has $TABLE_COUNT user tables"

# Clean up test database
sudo -u postgres dropdb "$TEST_DB"
rm /tmp/restore_test.dump* /tmp/restore_test_pg_restore.log
echo "Test database cleaned up"
```

## Testing Borg Backup Restoration over IPv6

```bash
#!/bin/bash
# test_borg_restore_ipv6.sh

export BORG_PASSPHRASE="YourPassphrase"
export BORG_RSH="ssh -6"
BORG_SERVER="2001:db8::10"
BORG_REPO="ssh://borguser@[$BORG_SERVER]/backups/$(hostname)"
RESTORE_DIR="/tmp/borg-restore-test"

echo "=== Borg Backup Restoration Test ==="

# List available archives
echo "Available archives:"
borg list "$BORG_REPO"

# Get latest archive name
LATEST=$(borg list --short "$BORG_REPO" | tail -1)
echo "Testing restoration from: $LATEST"

# Create restore directory
rm -rf "$RESTORE_DIR"
mkdir -p "$RESTORE_DIR"

# Restore specific path from latest archive
borg extract \
  --dry-run \
  --verbose \
  "$BORG_REPO::$LATEST" \
  etc/nginx \
  2>&1

# Actual restore (remove --dry-run for real test)
(
  cd "$RESTORE_DIR"
  borg extract \
    --verbose \
    --strip-components 1 \
    "$BORG_REPO::$LATEST" \
    etc/nginx \
    2>&1
)

FILE_COUNT=$(find "$RESTORE_DIR" -type f | wc -l)
echo "Restored $FILE_COUNT files"

# Verify integrity
if borg check "$BORG_REPO"; then
  echo "Repository integrity: OK"
else
  echo "Repository integrity: FAILED"
  exit 1
fi

# Cleanup
rm -rf "$RESTORE_DIR"
```

## Measuring Recovery Time over IPv6

```bash
#!/bin/bash
# measure_rto_ipv6.sh - Measure actual recovery time over IPv6

BACKUP_SERVER="2001:db8::10"
DATA_SIZE_GB=10

echo "=== Recovery Time Measurement ==="
echo "Testing restoration of ${DATA_SIZE_GB}GB data from [$BACKUP_SERVER]"

START_TIME=$(date +%s)

# Perform restoration
rsync -avz \
  -e "ssh -6 -i ~/.ssh/backup_key" \
  "backupuser@[$BACKUP_SERVER]:/backups/$(hostname)/" \
  "/tmp/rto-test/" \
  > /tmp/rto-rsync.log 2>&1

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Calculate throughput
RESTORED_SIZE=$(du -sh /tmp/rto-test/ 2>/dev/null | awk '{print $1}')
echo "Restoration completed in: ${MINUTES}m ${SECONDS}s"
echo "Data restored: $RESTORED_SIZE"
echo "Average throughput: $(echo "scale=2; $DATA_SIZE_GB * 1024 / $DURATION" | bc 2>/dev/null) MB/s"

rm -rf /tmp/rto-test/
```

## Scheduling Regular Restoration Tests

```bash
# /etc/cron.d/backup-restore-test
# Run restoration test every week (Sunday at 3am)
0 3 * * 0 root /usr/local/bin/test_restore_files_ipv6.sh >> /var/log/restore-test.log 2>&1

# Monthly full database restoration test
0 4 1 * * root /usr/local/bin/test_db_restore_ipv6.sh >> /var/log/db-restore-test.log 2>&1
```

Regular restoration testing over IPv6 backup infrastructure validates both your backup completeness and your recovery procedures, giving you confidence that your data is genuinely recoverable when needed.
