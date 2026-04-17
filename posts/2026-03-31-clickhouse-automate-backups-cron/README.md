# How to Automate ClickHouse Backups with Cron

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Backup, Cron, Automation, Administration, Operation

Description: Learn how to automate ClickHouse backups using cron jobs with full and incremental strategies, alerting on backup failures, and lifecycle management for old backups.

---

Automating ClickHouse backups with cron is the simplest and most portable approach for environments that do not use Kubernetes. A well-designed cron-based backup strategy combines a weekly full backup with daily incremental backups, monitors for failures, rotates old backups, and logs results to a central location.

## Backup Strategy Design

```text
Sunday  02:00  Full backup      (complete snapshot, ~2-4 hours)
Mon-Sat 02:00  Incremental      (changed parts only, ~10-30 minutes)
```

This means at most 7 days of incremental history on top of the weekly full backup. Because each day's incremental uses the previous Sunday's full backup as its base, a point-in-time restore to any day requires only the full backup and that day's incremental — intermediate days are not needed.

## Backup Script

Create a comprehensive backup script:

```bash
sudo tee /usr/local/bin/clickhouse-backup.sh > /dev/null <<'SCRIPT'
#!/bin/bash
# ClickHouse backup script with full/incremental strategy

set -euo pipefail

# Configuration
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-backup_user}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-}"
S3_BUCKET="${S3_BUCKET:-your-backup-bucket}"
S3_PREFIX="${S3_PREFIX:-clickhouse/backups}"
DATABASES="${CLICKHOUSE_DATABASES:-all}"
LOG_FILE="${LOG_FILE:-/var/log/clickhouse-backup.log}"
ALERT_EMAIL="${ALERT_EMAIL:-ops@example.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
KEEP_FULL_DAYS="${KEEP_FULL_DAYS:-30}"
KEEP_INCR_DAYS="${KEEP_INCR_DAYS:-14}"

DATE=$(date '+%Y-%m-%d')
DAY_OF_WEEK=$(date '+%u')  # 1=Mon, 7=Sun
TIMESTAMP=$(date '+%Y-%m-%dT%H:%M:%S')

# Logging
log() {
    echo "[${TIMESTAMP}] $1" | tee -a "$LOG_FILE"
}

# Alert on failure
send_alert() {
    local message="$1"
    log "ALERT: ${message}"

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data "{\"text\": \"ClickHouse Backup FAILED on $(hostname): ${message}\"}" \
            || true
    fi

    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "ClickHouse backup failed on $(hostname)" "$ALERT_EMAIL" || true
    fi
}

# Trap errors
trap 'send_alert "Backup script failed at line $LINENO"' ERR

# Determine backup type
if [ "$DAY_OF_WEEK" = "7" ]; then
    BACKUP_TYPE="full"
    BACKUP_NAME="${DATE}-full"
    BASE_BACKUP_SETTING=""
    log "Starting FULL backup: ${BACKUP_NAME}"
else
    BACKUP_TYPE="incremental"
    BACKUP_NAME="${DATE}-incr"
    # Find the most recent Sunday's full backup
    DAYS_SINCE_SUNDAY=$(( (DAY_OF_WEEK % 7) ))
    LAST_SUNDAY=$(date -d "${DAYS_SINCE_SUNDAY} days ago" '+%Y-%m-%d' 2>/dev/null || \
                  date -v-${DAYS_SINCE_SUNDAY}d '+%Y-%m-%d')
    log "Starting INCREMENTAL backup: ${BACKUP_NAME} (base: ${LAST_SUNDAY}-full)"
fi

# Build database list
if [ "$DATABASES" = "all" ]; then
    DB_LIST=$(clickhouse-client \
        --host "$CLICKHOUSE_HOST" \
        --user "$CLICKHOUSE_USER" \
        --password "$CLICKHOUSE_PASSWORD" \
        --query "SELECT name FROM system.databases WHERE name NOT IN ('system','information_schema','INFORMATION_SCHEMA') FORMAT TabSeparated")
else
    DB_LIST=$(echo "$DATABASES" | tr ',' '\n')
fi

BACKUP_START=$(date +%s)

# Run backup for each database
for DB in $DB_LIST; do
    S3_URL="https://s3.amazonaws.com/${S3_BUCKET}/${S3_PREFIX}/${BACKUP_NAME}/${DB}/"
    log "Backing up: ${DB} -> ${S3_URL}"

    # base_backup must point to the same per-database path used for the prior full backup
    if [ "$BACKUP_TYPE" = "incremental" ]; then
        BASE_URL="https://s3.amazonaws.com/${S3_BUCKET}/${S3_PREFIX}/${LAST_SUNDAY}-full/${DB}/"
        BASE_BACKUP_SETTING="SETTINGS base_backup = S3('${BASE_URL}')"
    else
        BASE_BACKUP_SETTING=""
    fi

    SQL="BACKUP DATABASE ${DB} TO S3('${S3_URL}') ${BASE_BACKUP_SETTING}"

    result=$(clickhouse-client \
        --host "$CLICKHOUSE_HOST" \
        --user "$CLICKHOUSE_USER" \
        --password "$CLICKHOUSE_PASSWORD" \
        --query "$SQL" 2>&1)

    log "Done: ${DB} - ${result}"
done

BACKUP_END=$(date +%s)
DURATION=$((BACKUP_END - BACKUP_START))

log "Backup completed in ${DURATION}s"

# Verify backup was written to S3
aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_NAME}/" --recursive | tail -5

log "Backup verification complete"

SCRIPT

sudo chmod +x /usr/local/bin/clickhouse-backup.sh
```

## Setting Up the Cron Schedule

Add the backup jobs to the crontab:

```bash
sudo crontab -e
```

Add these lines:

```text
# ClickHouse backups
# Full backup every Sunday at 02:00
0 2 * * 0 /usr/local/bin/clickhouse-backup.sh >> /var/log/clickhouse-backup.log 2>&1

# Incremental backup Mon-Sat at 02:00
0 2 * * 1-6 /usr/local/bin/clickhouse-backup.sh >> /var/log/clickhouse-backup.log 2>&1

# Clean up old backups at 04:00 daily
0 4 * * * /usr/local/bin/clickhouse-cleanup-backups.sh >> /var/log/clickhouse-backup.log 2>&1
```

## Backup Rotation Script

```bash
sudo tee /usr/local/bin/clickhouse-cleanup-backups.sh > /dev/null <<'SCRIPT'
#!/bin/bash
# Clean up old ClickHouse backups from S3

set -euo pipefail

S3_BUCKET="${S3_BUCKET:-your-backup-bucket}"
S3_PREFIX="${S3_PREFIX:-clickhouse/backups}"
KEEP_FULL_DAYS="${KEEP_FULL_DAYS:-30}"
KEEP_INCR_DAYS="${KEEP_INCR_DAYS:-14}"
LOG_FILE="${LOG_FILE:-/var/log/clickhouse-backup.log}"

log() {
    echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

CUTOFF_FULL=$(date -d "${KEEP_FULL_DAYS} days ago" '+%Y-%m-%d' 2>/dev/null || \
              date -v-${KEEP_FULL_DAYS}d '+%Y-%m-%d')
CUTOFF_INCR=$(date -d "${KEEP_INCR_DAYS} days ago" '+%Y-%m-%d' 2>/dev/null || \
              date -v-${KEEP_INCR_DAYS}d '+%Y-%m-%d')

log "Removing full backups older than ${CUTOFF_FULL}"
log "Removing incremental backups older than ${CUTOFF_INCR}"

# List and delete old full backups
aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | awk '{print $2}' | grep '\-full/$' | while read -r prefix; do
    backup_date="${prefix:0:10}"
    if [[ "$backup_date" < "$CUTOFF_FULL" ]]; then
        log "Deleting old full backup: ${prefix}"
        aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${prefix}" --recursive
    fi
done

# List and delete old incremental backups
aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | awk '{print $2}' | grep '\-incr/$' | while read -r prefix; do
    backup_date="${prefix:0:10}"
    if [[ "$backup_date" < "$CUTOFF_INCR" ]]; then
        log "Deleting old incremental: ${prefix}"
        aws s3 rm "s3://${S3_BUCKET}/${S3_PREFIX}/${prefix}" --recursive
    fi
done

log "Cleanup complete"
SCRIPT

sudo chmod +x /usr/local/bin/clickhouse-cleanup-backups.sh
```

## Monitoring Backup Health

Create a check script to verify backups are running on schedule:

```bash
sudo tee /usr/local/bin/clickhouse-backup-check.sh > /dev/null <<'SCRIPT'
#!/bin/bash
# Verify ClickHouse backup ran within the last 26 hours

S3_BUCKET="${S3_BUCKET:-your-backup-bucket}"
S3_PREFIX="${S3_PREFIX:-clickhouse/backups}"
MAX_AGE_HOURS=26

# Find the most recent backup timestamp
LATEST=$(aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/" | awk '{print $2}' | sort | tail -1 | tr -d '/')
BACKUP_DATE="${LATEST:0:10}"

# Convert to timestamp
BACKUP_TS=$(date -d "${BACKUP_DATE}" '+%s' 2>/dev/null || date -jf '%Y-%m-%d' "${BACKUP_DATE}" '+%s')
NOW_TS=$(date '+%s')
AGE_HOURS=$(( (NOW_TS - BACKUP_TS) / 3600 ))

if [ "$AGE_HOURS" -gt "$MAX_AGE_HOURS" ]; then
    echo "CRITICAL: Last backup is ${AGE_HOURS} hours old (${LATEST})"
    exit 2
else
    echo "OK: Last backup is ${AGE_HOURS} hours old (${LATEST})"
    exit 0
fi
SCRIPT

sudo chmod +x /usr/local/bin/clickhouse-backup-check.sh

# Add to crontab to alert if no backup in 26 hours
# 0 6 * * * /usr/local/bin/clickhouse-backup-check.sh || echo "Backup check failed" | mail -s "Alert" ops@example.com
```

## Checking Backup Logs

```bash
# View recent backup log
tail -100 /var/log/clickhouse-backup.log

# Search for failures
grep -i "FAIL\|ERROR\|error\|failed" /var/log/clickhouse-backup.log | tail -20

# Check system.backups table
clickhouse-client --query "
SELECT
    id, status, name, start_time, end_time,
    dateDiff('minute', start_time, end_time) AS duration_min,
    formatReadableSize(compressed_size) AS size, error
FROM system.backups
ORDER BY start_time DESC
LIMIT 10
"
```

## Summary

A cron-based ClickHouse backup strategy uses a weekly full backup on Sundays and daily incrementals from Monday through Saturday. The backup script determines the type based on the day of week, builds the correct `base_backup` reference for incrementals, and iterates over each database. A separate cleanup script removes backups older than the retention window. Monitor the backup log daily and add a cron-driven check script that alerts when no backup has run within 26 hours to catch missed jobs before they become a recovery gap.
