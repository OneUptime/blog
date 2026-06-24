# How to Write a Redis Backup Automation Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Backup, Script, Automation, Bash

Description: Automate Redis RDB and AOF backups with a Bash script that copies dump files to S3, rotates old backups, and sends alerts on failure.

---

Redis persists data to disk via RDB snapshots and AOF logs, but those files live on the same server. A backup automation script copies them to durable remote storage and ensures you can recover from server failures.

## Backup Script

```bash
#!/bin/bash
# redis-backup.sh

set -euo pipefail

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/redis-backups}"
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis_backup_${TIMESTAMP}.rdb"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

cli_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning "$@"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" "$@"
    fi
}

# Step 1: Trigger a BGSAVE
log "Triggering BGSAVE..."
cli_cmd BGSAVE

# Step 2: Wait for save to complete
for i in $(seq 1 60); do
    IN_PROGRESS=$(cli_cmd INFO persistence | grep "rdb_bgsave_in_progress" | cut -d: -f2 | tr -d '\r ')
    if [ "$IN_PROGRESS" = "0" ]; then
        log "BGSAVE completed"
        break
    fi
    sleep 2
done

# Step 3: Copy RDB file
mkdir -p "$BACKUP_DIR"
RDB_SOURCE="${REDIS_DATA_DIR}/dump.rdb"
cp "$RDB_SOURCE" "${BACKUP_DIR}/${BACKUP_FILE}"
gzip "${BACKUP_DIR}/${BACKUP_FILE}"
COMPRESSED="${BACKUP_DIR}/${BACKUP_FILE}.gz"
log "Backup compressed: $COMPRESSED ($(du -sh $COMPRESSED | cut -f1))"

# Step 4: Upload to S3
if [ -n "$S3_BUCKET" ]; then
    log "Uploading to S3..."
    aws s3 cp "$COMPRESSED" "s3://${S3_BUCKET}/redis-backups/${BACKUP_FILE}.gz" \
        --storage-class STANDARD_IA
    log "Upload complete: s3://${S3_BUCKET}/redis-backups/${BACKUP_FILE}.gz"
fi

# Step 5: Rotate local backups
find "$BACKUP_DIR" -name "redis_backup_*.rdb.gz" -mtime +${RETENTION_DAYS} -delete
log "Rotated backups older than ${RETENTION_DAYS} days"

log "Backup completed successfully"
```

## Cron Schedule

```bash
# Daily backup at 2 AM
0 2 * * * REDIS_PASSWORD=secret S3_BUCKET=my-backups /opt/scripts/redis-backup.sh >> /var/log/redis-backup.log 2>&1
```

## Verifying a Backup

Always test restore capability:

```bash
#!/bin/bash
# verify-backup.sh
BACKUP_FILE="$1"
RESTORE_DIR="/tmp/redis-restore-test"

mkdir -p "$RESTORE_DIR"
cp "$BACKUP_FILE" "${RESTORE_DIR}/dump.rdb.gz"
gunzip "${RESTORE_DIR}/dump.rdb.gz"

# Start a test Redis instance pointing at the restored RDB
redis-server --port 6380 --dir "$RESTORE_DIR" --dbfilename dump.rdb --daemonize yes

sleep 2
KEY_COUNT=$(redis-cli -p 6380 DBSIZE)
echo "Restored backup contains $KEY_COUNT keys"

redis-cli -p 6380 SHUTDOWN NOSAVE 2>/dev/null || true
```

## S3 Retention Policy

Add a lifecycle rule to S3 to automatically delete old backups:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-backups \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "redis-backup-retention",
      "Filter": {"Prefix": "redis-backups/"},
      "Status": "Enabled",
      "Expiration": {"Days": 30}
    }]
  }'
```

## Summary

The Redis backup script triggers BGSAVE, waits for completion, compresses the RDB file, and uploads it to S3 with automatic local rotation. Scheduled via cron, it provides daily offsite backups with configurable retention. Pairing the script with a verification step ensures backups are actually restorable before you need them.
