# How to Back Up SQLite Databases on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SQLite, Database, Backup

Description: Learn multiple methods for safely backing up SQLite databases on Ubuntu, including online backups, SQL dumps, and automated backup scripts with rotation.

---

SQLite's file-based nature makes backups conceptually simple, but there are important caveats. Simply copying the database file with `cp` while it is actively being written can produce a corrupt backup. The right approach depends on whether the database is in use and what journal mode it uses.

## Understanding the Backup Challenge

For a database using the default DELETE journal mode, a mid-write `cp` copy can capture the database in an inconsistent state. For WAL mode databases, you also need to ensure the WAL file is checkpointed before or included in the backup.

SQLite provides several safe backup mechanisms to handle these concerns correctly.

## Method 1: SQLite .backup Command (Online Backup)

The `.backup` dot-command in the SQLite shell uses the SQLite Backup API, which creates a consistent snapshot while the database is live.

```bash
# Create a backup while the database may be in use
sqlite3 /data/myapp.db ".backup /backup/myapp_$(date +%Y%m%d_%H%M%S).db"

# Verify the backup is valid
sqlite3 /backup/myapp_backup.db "PRAGMA integrity_check;"
# Should return: ok
```

This method works with both DELETE and WAL journal modes and is safe for live databases.

## Method 2: VACUUM INTO (Clean Copy)

The `VACUUM INTO` command creates a defragmented, compacted copy of the database in a new file. It is also safe for live databases.

```bash
sqlite3 /data/myapp.db "VACUUM INTO '/backup/myapp_clean_$(date +%Y%m%d).db';"
```

The resulting file is slightly different from `.backup`: it has no fragmentation and all free pages are reclaimed, making it smaller. The downside is that `VACUUM INTO` requires SQLite 3.27.0 or newer.

## Method 3: SQL Dump

A SQL dump exports the database as a series of SQL statements that can recreate it from scratch. This produces a human-readable, portable backup.

```bash
# Dump entire database to SQL file
sqlite3 /data/myapp.db .dump > /backup/myapp_$(date +%Y%m%d).sql

# Compress it (SQL dumps compress extremely well)
sqlite3 /data/myapp.db .dump | gzip > /backup/myapp_$(date +%Y%m%d).sql.gz

# Dump only the schema (no data)
sqlite3 /data/myapp.db .schema > /backup/myapp_schema.sql

# Dump a specific table
sqlite3 /data/myapp.db ".dump users" > /backup/users_backup.sql
```

### Restoring from a SQL Dump

```bash
# Restore a plain SQL dump
sqlite3 /data/myapp_restored.db < /backup/myapp_backup.sql

# Restore a compressed dump
gunzip -c /backup/myapp_20240101.sql.gz | sqlite3 /data/myapp_restored.db

# Verify restoration
sqlite3 /data/myapp_restored.db "PRAGMA integrity_check;"
sqlite3 /data/myapp_restored.db "SELECT COUNT(*) FROM users;"
```

## Method 4: File Copy (for Offline Databases)

If you can guarantee no writes are happening (e.g., application is stopped), a simple file copy is fine for WAL-mode databases after a checkpoint.

```bash
# Force a complete checkpoint first (WAL mode only)
sqlite3 /data/myapp.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Now copy the database file (WAL file should be empty or gone)
cp /data/myapp.db /backup/myapp_offline_$(date +%Y%m%d).db

# Verify
ls -la /data/myapp.db*
# After TRUNCATE checkpoint, -wal file should be 0 bytes or absent
```

## Automated Backup Script with Rotation

A practical backup script that keeps daily backups for 7 days, weekly for 4 weeks, and monthly for 3 months.

```bash
#!/bin/bash
# /usr/local/bin/sqlite-backup.sh
# Backup all SQLite databases in /data with retention policy

set -euo pipefail

BACKUP_DIR="/backup/sqlite"
DATA_DIR="/data"
LOG_FILE="/var/log/sqlite-backup.log"

# Retention settings
DAILY_RETAIN=7    # days
WEEKLY_RETAIN=28  # days (4 weeks)
MONTHLY_RETAIN=90 # days (3 months)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"
}

backup_database() {
    local db_file="$1"
    local db_name
    db_name=$(basename "$db_file" .db)
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/${db_name}_${timestamp}.db"

    log "Backing up: $db_file -> $backup_file"

    # Use the SQLite backup API for a safe online backup
    sqlite3 "$db_file" ".backup $backup_file"

    # Verify integrity
    if sqlite3 "$backup_file" "PRAGMA integrity_check;" | grep -q "^ok$"; then
        log "Integrity check passed: $backup_file"

        # Compress the backup
        gzip "$backup_file"
        log "Compressed: ${backup_file}.gz"
    else
        log "ERROR: Integrity check failed for $backup_file"
        rm -f "$backup_file"
        return 1
    fi
}

cleanup_old_backups() {
    local db_name="$1"

    # Remove daily backups older than DAILY_RETAIN days
    find "$BACKUP_DIR" -name "${db_name}_*.db.gz" \
        -mtime "+${DAILY_RETAIN}" -delete -print | \
        while read -r f; do log "Removed old backup: $f"; done
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "=== SQLite backup started ==="

# Find and back up all .db files
find "$DATA_DIR" -name "*.db" -type f | while read -r db; do
    backup_database "$db"
    cleanup_old_backups "$(basename "$db" .db)"
done

log "=== SQLite backup completed ==="
```

```bash
# Make it executable
chmod +x /usr/local/bin/sqlite-backup.sh

# Test it
sudo /usr/local/bin/sqlite-backup.sh

# Schedule with cron (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/sqlite-backup.sh") | crontab -
```

## Restoring from a Backup

```bash
# Restore from a compressed backup
gunzip -k /backup/sqlite/myapp_20240101_020000.db.gz

# Stop the application first, then move files
sudo systemctl stop myapp
cp /backup/sqlite/myapp_20240101_020000.db /data/myapp.db

# Remove WAL files if they exist (from old broken state)
rm -f /data/myapp.db-wal /data/myapp.db-shm

# Verify integrity before starting
sqlite3 /data/myapp.db "PRAGMA integrity_check;"

# Restart the application
sudo systemctl start myapp
```

## Backing Up to a Remote Location

Send backups to a remote server or object storage.

```bash
# Backup and ship to a remote server via rsync
sqlite3 /data/myapp.db ".backup /tmp/myapp_backup.db"
rsync -az /tmp/myapp_backup.db user@backup-server:/backup/sqlite/
rm /tmp/myapp_backup.db

# Backup and upload to S3
sqlite3 /data/myapp.db .dump | gzip | \
    aws s3 cp - "s3://my-backups/sqlite/myapp_$(date +%Y%m%d).sql.gz"
```

## Verifying Backups Regularly

A backup you never tested is not a reliable backup. Test restoration periodically.

```bash
#!/bin/bash
# Test restoration of the latest backup

LATEST=$(ls -t /backup/sqlite/myapp_*.db.gz | head -1)
RESTORE_PATH="/tmp/myapp_restore_test.db"

log "Testing restoration from: $LATEST"

# Decompress and restore
gunzip -c "$LATEST" > "$RESTORE_PATH"

# Run integrity check
RESULT=$(sqlite3 "$RESTORE_PATH" "PRAGMA integrity_check;")
if [ "$RESULT" = "ok" ]; then
    echo "Restoration test PASSED"
else
    echo "Restoration test FAILED: $RESULT"
    exit 1
fi

# Check row counts match production
PROD_COUNT=$(sqlite3 /data/myapp.db "SELECT COUNT(*) FROM users;")
BACKUP_COUNT=$(sqlite3 "$RESTORE_PATH" "SELECT COUNT(*) FROM users;")
echo "Production rows: $PROD_COUNT"
echo "Backup rows: $BACKUP_COUNT"

rm -f "$RESTORE_PATH"
```

The SQLite backup API and `VACUUM INTO` are the two most reliable methods for live databases. For any critical production data, use the automated script with integrity verification and test your restoration process monthly.
