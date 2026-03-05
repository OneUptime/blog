# How to Test Backup Integrity and Practice Restores on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, Disaster Recovery, System Administration

Description: Learn how to verify backup integrity and practice restore procedures on Ubuntu so you can recover quickly and confidently when data loss actually occurs.

---

A backup you have never restored from is not a backup - it is a theory. Many sysadmins discover their backup was corrupted or incomplete only when they desperately need the data. Regular integrity checks and restore drills are as important as the backups themselves.

## Why Testing Backups Matters

Backup failures happen for many reasons: media corruption, software bugs, misconfigured exclude lists, permission errors, and disk space exhaustion are all common culprits. Without testing:
- You may back up the wrong files or directories
- Encryption keys may be lost or forgotten
- The restore process may take much longer than expected during an actual emergency
- Archive files may be corrupted and unrestorable

The goal of backup testing is to answer two questions: Is the data intact? Can I restore it within an acceptable time window?

## Checking Archive Integrity

### Verifying tar Archives

```bash
# Test tar archive integrity - checks headers and checksums
tar --test-label --file=/mnt/backup/system-backup-20260302.tar.gz
echo "Exit code: $?"

# List all files - this reads the entire archive
tar --list --file=/mnt/backup/system-backup-20260302.tar.gz > /dev/null && echo "Archive readable"

# Decompress and pipe to /dev/null - validates every byte
gzip --test /mnt/backup/system-backup-20260302.tar.gz && echo "Compression valid"

# Full read with verbose output for spot-checking
tar --list --verbose --file=/mnt/backup/system-backup-20260302.tar.gz | tail -20
```

### Verifying rsync Backups

rsync backups are plain directories, so verification means comparing them against the source:

```bash
# Compare backup to source using checksums (not just timestamps)
rsync --dry-run --checksum --archive --verbose \
  /home/username/ \
  /mnt/backup/rsync-home/username/ \
  2>&1 | head -30

# Count files in source vs backup
SRC_COUNT=$(find /home/username -type f | wc -l)
BCK_COUNT=$(find /mnt/backup/rsync-home/username -type f | wc -l)
echo "Source: $SRC_COUNT files, Backup: $BCK_COUNT files"

# Check total size matches
du -sh /home/username
du -sh /mnt/backup/rsync-home/username
```

### Verifying Borg Archives

```bash
# Quick consistency check (metadata only, fast)
borg check /mnt/backup/borg-repo

# Full data verification (reads all chunks, slower)
borg check --verify-data /mnt/backup/borg-repo

# Check specific archive
borg check /mnt/backup/borg-repo::myserver-2026-03-02T02:00:00

# Show repository statistics
borg info /mnt/backup/borg-repo
```

### Verifying PostgreSQL Dumps

```bash
# Verify a custom-format dump is readable
pg_restore --list /var/backups/postgresql/myapp_20260302.dump | head -20
echo "pg_restore exit code: $?"

# Test restore to /dev/null (reads entire file, does not write)
pg_restore --format=custom /var/backups/postgresql/myapp_20260302.dump | head -1

# For SQL dumps, check the file is valid SQL
head -5 /var/backups/mysql/myapp_20260302.sql
gunzip -c /var/backups/mysql/myapp_20260302.sql.gz | head -5
```

### Verifying MySQL Dumps

```bash
# Check compressed dump is valid
gzip --test /var/backups/mysql/myapp_20260302.sql.gz && echo "Compression OK"

# Verify SQL syntax (quick check of first and last lines)
gunzip -c /var/backups/mysql/myapp_20260302.sql.gz | head -10
gunzip -c /var/backups/mysql/myapp_20260302.sql.gz | tail -5

# Count tables in dump
gunzip -c /var/backups/mysql/myapp_20260302.sql.gz | grep "^CREATE TABLE" | wc -l
```

## Writing a Backup Verification Script

```bash
sudo nano /usr/local/bin/verify-backups.sh
```

```bash
#!/bin/bash
# Backup verification script
# Run weekly to confirm backup health

set -euo pipefail

BACKUP_DIR="/mnt/backup"
BORG_REPO="$BACKUP_DIR/borg-repo"
LOG_FILE="/var/log/backup-verify.log"
ALERT_EMAIL="admin@example.com"
ERRORS=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

check_age() {
    local file=$1
    local max_hours=$2
    local label=$3

    if [ ! -f "$file" ]; then
        log "ERROR: $label - file not found: $file"
        ((ERRORS++))
        return
    fi

    age_hours=$(( ($(date +%s) - $(stat -c %Y "$file")) / 3600 ))
    if [ "$age_hours" -gt "$max_hours" ]; then
        log "ERROR: $label - backup is ${age_hours}h old (max ${max_hours}h)"
        ((ERRORS++))
    else
        log "OK: $label - backup is ${age_hours}h old"
    fi
}

# Check that recent backups exist
log "=== Checking backup file ages ==="
LATEST_TAR=$(find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime -2 | sort | tail -1)
[ -n "$LATEST_TAR" ] && log "OK: Recent tar backup found: $LATEST_TAR" || { log "ERROR: No recent tar backup"; ((ERRORS++)); }

LATEST_MYSQL=$(find /var/backups/mysql -name "*.sql.gz" -mtime -2 | sort | tail -1)
[ -n "$LATEST_MYSQL" ] && log "OK: Recent MySQL backup found" || { log "ERROR: No recent MySQL backup"; ((ERRORS++)); }

LATEST_PG=$(find /var/backups/postgresql -name "*.dump" -mtime -2 | sort | tail -1)
[ -n "$LATEST_PG" ] && log "OK: Recent PostgreSQL backup found" || { log "ERROR: No recent PostgreSQL backup"; ((ERRORS++)); }

# Verify archive integrity
log "=== Verifying archive integrity ==="

if [ -n "$LATEST_TAR" ]; then
    if gzip --test "$LATEST_TAR" 2>/dev/null; then
        log "OK: tar archive integrity verified"
    else
        log "ERROR: tar archive is corrupted: $LATEST_TAR"
        ((ERRORS++))
    fi
fi

if [ -n "$LATEST_MYSQL" ]; then
    if gzip --test "$LATEST_MYSQL" 2>/dev/null; then
        log "OK: MySQL dump integrity verified"
    else
        log "ERROR: MySQL dump is corrupted: $LATEST_MYSQL"
        ((ERRORS++))
    fi
fi

if [ -n "$LATEST_PG" ]; then
    if pg_restore --list "$LATEST_PG" > /dev/null 2>&1; then
        log "OK: PostgreSQL dump is readable"
    else
        log "ERROR: PostgreSQL dump is corrupted: $LATEST_PG"
        ((ERRORS++))
    fi
fi

# Borg repository check
if [ -d "$BORG_REPO" ]; then
    log "=== Checking Borg repository ==="
    if borg check --last 1 "$BORG_REPO" 2>&1 | tee -a "$LOG_FILE"; then
        log "OK: Borg repository healthy"
    else
        log "ERROR: Borg repository check failed"
        ((ERRORS++))
    fi
fi

# Report results
log "=== Verification complete: $ERRORS error(s) found ==="

if [ "$ERRORS" -gt 0 ]; then
    echo "Backup verification found $ERRORS error(s). Check $LOG_FILE for details." | \
        mail -s "ALERT: Backup Verification Failed on $(hostname)" "$ALERT_EMAIL"
fi

exit $ERRORS
```

```bash
sudo chmod +x /usr/local/bin/verify-backups.sh

# Schedule weekly verification
echo "0 4 * * 0 /usr/local/bin/verify-backups.sh" | sudo crontab -l | cat - | sudo crontab -
```

## Practicing Restore Procedures

### Restore Drill for File Backups

```bash
# Create a restore test directory
mkdir -p /tmp/restore-test

# Restore specific files from rsync backup
cp /mnt/backup/rsync-home/username/documents/critical-file.txt /tmp/restore-test/

# Verify file contents match original
diff /home/username/documents/critical-file.txt /tmp/restore-test/critical-file.txt && echo "File matches"

# Test restoring from tar backup
tar --extract \
  --file=/mnt/backup/tar-backups/backup-full-20260302.tar.gz \
  --directory=/tmp/restore-test \
  home/username/documents/critical-file.txt

diff /home/username/documents/critical-file.txt \
     /tmp/restore-test/home/username/documents/critical-file.txt && echo "Files match"
```

### Restore Drill for Databases

```bash
# Create a test database for restore validation
mysql -u root -p -e "CREATE DATABASE restore_test;"

# Restore backup to test database
gunzip -c /var/backups/mysql/myapp_20260302.sql.gz | \
  mysql -u root -p restore_test

# Compare table count between original and restored
ORIG_TABLES=$(mysql -u root -p -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='myapp';" -s -N)
REST_TABLES=$(mysql -u root -p -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='restore_test';" -s -N)
echo "Original tables: $ORIG_TABLES, Restored tables: $REST_TABLES"

# Compare row counts for critical tables
mysql -u root -p -e "SELECT COUNT(*) FROM myapp.users; SELECT COUNT(*) FROM restore_test.users;"

# Clean up test database
mysql -u root -p -e "DROP DATABASE restore_test;"
```

```bash
# PostgreSQL restore drill
sudo -u postgres createdb restore_test
sudo -u postgres pg_restore \
  --no-owner \
  --dbname=restore_test \
  /var/backups/postgresql/myapp_20260302.dump

# Verify table count
sudo -u postgres psql restore_test -c "\dt" | wc -l

# Clean up
sudo -u postgres dropdb restore_test
```

## Documenting Your Restore Procedures

Write down the exact commands needed to restore your system, including:
- Where backups are stored and how to access them
- Order of operations (restore system first, then databases, then application data)
- Post-restore steps (restart services, run database migrations, update configuration)

Store this runbook somewhere accessible when your main system is down - a printed copy, a separate system, or a cloud document. You do not want to figure out restore commands while under stress during an outage.

Regular backup testing - even just verifying the most recent backup file once a week - dramatically increases confidence in your backup strategy and ensures you can recover when it matters most.
