# How to Set Up Backup Rotation Policies on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, Rotation, System Administration

Description: Learn how to implement backup rotation policies on Ubuntu to manage disk space while preserving backup history using daily, weekly, and monthly retention strategies.

---

Without a rotation policy, backup storage fills up and then fails. A rotation policy defines how many backups to keep and when to delete old ones. The classic approach is the Grandfather-Father-Son (GFS) scheme: keep daily backups for a week, weekly backups for a month, and monthly backups for a year.

## Understanding Rotation Strategies

**Simple date-based retention:** Delete backups older than N days. Simple but inflexible - you might keep 30 daily backups but have nothing from 3 months ago.

**Grandfather-Father-Son (GFS):** The most common scheme:
- Daily (Son): Keep the last 7 days
- Weekly (Father): Keep one backup per week for 4 weeks
- Monthly (Grandfather): Keep one backup per month for 12 months

**Tower of Hanoi:** A mathematical pattern that keeps exponentially fewer backups as they age. Rarely used in practice.

For most systems, a simplified GFS approach works well.

## Simple Age-Based Rotation

The simplest rotation policy removes files older than a specified age:

```bash
# Remove backup files older than 30 days
find /mnt/backup -name "backup-*.tar.gz" -mtime +30 -delete

# Remove older than 2 weeks
find /mnt/backup -name "*.sql.gz" -mtime +14 -delete

# Remove with logging
find /mnt/backup -name "backup-*.tar.gz" -mtime +30 \
  -exec echo "Removing: {}" \; \
  -delete
```

This works for small setups but does not give you any long-term history.

## Implementing GFS Rotation with a Script

```bash
sudo nano /usr/local/bin/backup-rotate.sh
```

```bash
#!/bin/bash
# Grandfather-Father-Son backup rotation script
# Manages daily, weekly, and monthly backup retention

set -euo pipefail

# Configuration
BACKUP_SOURCE_DIR="/mnt/backup/daily"   # Where daily backups land
DAILY_DIR="/mnt/backup/daily"
WEEKLY_DIR="/mnt/backup/weekly"
MONTHLY_DIR="/mnt/backup/monthly"

KEEP_DAILY=7     # Keep 7 daily backups
KEEP_WEEKLY=4    # Keep 4 weekly backups
KEEP_MONTHLY=12  # Keep 12 monthly backups

LOG_FILE="/var/log/backup-rotation.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"

# Get current date information
DAY_OF_WEEK=$(date +%u)     # 1=Mon, 7=Sun
DAY_OF_MONTH=$(date +%d)    # 01-31

# The backup script already created today's backup in $DAILY_DIR
# This script manages promotion and retention

TODAYS_BACKUP=$(find "$DAILY_DIR" -maxdepth 1 -name "backup-$(date +%Y%m%d)*.tar.gz" | head -1)

if [ -z "$TODAYS_BACKUP" ]; then
    log "ERROR: No backup found for today - backup script may have failed"
    exit 1
fi

log "Processing rotation for: $TODAYS_BACKUP"

# Promote to weekly on Sundays (day 7)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    WEEKLY_BACKUP="$WEEKLY_DIR/weekly-$(date +%Y-W%V).tar.gz"
    log "Sunday: Copying to weekly backup: $WEEKLY_BACKUP"
    cp "$TODAYS_BACKUP" "$WEEKLY_BACKUP"
fi

# Promote to monthly on the 1st of each month
if [ "$DAY_OF_MONTH" -eq 1 ]; then
    MONTHLY_BACKUP="$MONTHLY_DIR/monthly-$(date +%Y-%m).tar.gz"
    log "1st of month: Copying to monthly backup: $MONTHLY_BACKUP"
    cp "$TODAYS_BACKUP" "$MONTHLY_BACKUP"
fi

# Rotate daily: keep only the last $KEEP_DAILY backups
log "Rotating daily backups (keeping $KEEP_DAILY)"
ls -t "$DAILY_DIR"/backup-*.tar.gz 2>/dev/null | \
    tail -n +"$((KEEP_DAILY + 1))" | \
    xargs -r rm -v >> "$LOG_FILE" 2>&1

# Rotate weekly: keep only the last $KEEP_WEEKLY backups
log "Rotating weekly backups (keeping $KEEP_WEEKLY)"
ls -t "$WEEKLY_DIR"/weekly-*.tar.gz 2>/dev/null | \
    tail -n +"$((KEEP_WEEKLY + 1))" | \
    xargs -r rm -v >> "$LOG_FILE" 2>&1

# Rotate monthly: keep only the last $KEEP_MONTHLY backups
log "Rotating monthly backups (keeping $KEEP_MONTHLY)"
ls -t "$MONTHLY_DIR"/monthly-*.tar.gz 2>/dev/null | \
    tail -n +"$((KEEP_MONTHLY + 1))" | \
    xargs -r rm -v >> "$LOG_FILE" 2>&1

log "Rotation complete"
log "Daily backups: $(ls "$DAILY_DIR"/backup-*.tar.gz 2>/dev/null | wc -l)"
log "Weekly backups: $(ls "$WEEKLY_DIR"/weekly-*.tar.gz 2>/dev/null | wc -l)"
log "Monthly backups: $(ls "$MONTHLY_DIR"/monthly-*.tar.gz 2>/dev/null | wc -l)"
```

```bash
sudo chmod +x /usr/local/bin/backup-rotate.sh
```

## Rotation for Database Backups

Database backups are typically SQL or dump files. Apply the same GFS pattern:

```bash
sudo nano /usr/local/bin/db-backup-rotate.sh
```

```bash
#!/bin/bash
# Database backup rotation - works for MySQL and PostgreSQL backups

BACKUP_BASE="/var/backups"
KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=6
LOG_FILE="/var/log/db-backup-rotation.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

for DB_TYPE in mysql postgresql; do
    DAILY_DIR="$BACKUP_BASE/$DB_TYPE/daily"
    WEEKLY_DIR="$BACKUP_BASE/$DB_TYPE/weekly"
    MONTHLY_DIR="$BACKUP_BASE/$DB_TYPE/monthly"

    mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"

    log "Processing $DB_TYPE rotation"

    # Find today's newest backup
    TODAY_BACKUP=$(find "$DAILY_DIR" -name "*$(date +%Y%m%d)*" | sort | tail -1)

    if [ -z "$TODAY_BACKUP" ]; then
        log "WARNING: No $DB_TYPE backup found for today"
        continue
    fi

    BASENAME=$(basename "$TODAY_BACKUP")

    # Weekly promotion on Sunday
    if [ "$DAY_OF_WEEK" -eq 7 ]; then
        cp "$TODAY_BACKUP" "$WEEKLY_DIR/weekly-$(date +%Y-W%V)-$BASENAME"
        log "$DB_TYPE: Promoted to weekly"
    fi

    # Monthly promotion on 1st
    if [ "$DAY_OF_MONTH" -eq 1 ]; then
        cp "$TODAY_BACKUP" "$MONTHLY_DIR/monthly-$(date +%Y-%m)-$BASENAME"
        log "$DB_TYPE: Promoted to monthly"
    fi

    # Apply retention
    ls -t "$DAILY_DIR"/*.sql.gz "$DAILY_DIR"/*.dump 2>/dev/null | \
        tail -n +"$((KEEP_DAILY + 1))" | xargs -r rm -f
    ls -t "$WEEKLY_DIR"/* 2>/dev/null | \
        tail -n +"$((KEEP_WEEKLY + 1))" | xargs -r rm -f
    ls -t "$MONTHLY_DIR"/* 2>/dev/null | \
        tail -n +"$((KEEP_MONTHLY + 1))" | xargs -r rm -f
done

log "Database rotation complete"
```

## Using logrotate for Backup Log Management

While `logrotate` is primarily for log files, it works equally well for managing any set of files that are regularly created:

```bash
sudo nano /etc/logrotate.d/backup-logs
```

```text
/var/log/mysql-backup.log
/var/log/postgresql-backup.log
/var/log/backup-rotation.log {
    weekly
    rotate 12
    compress
    missingok
    notifempty
    create 640 root root
}
```

## Disk Space Monitoring

Backup rotation is useless if disk space runs out before rotation runs. Monitor proactively:

```bash
sudo nano /usr/local/bin/check-backup-disk.sh
```

```bash
#!/bin/bash
# Alert when backup disk is getting full

BACKUP_MOUNT="/mnt/backup"
WARN_PERCENT=80   # Warn at 80% full
CRIT_PERCENT=90   # Critical at 90% full
ALERT_EMAIL="admin@example.com"

USED_PERCENT=$(df "$BACKUP_MOUNT" | awk 'NR==2 {print $5}' | tr -d '%')

if [ "$USED_PERCENT" -ge "$CRIT_PERCENT" ]; then
    echo "CRITICAL: Backup disk at ${USED_PERCENT}% on $(hostname)" | \
        mail -s "CRITICAL: Backup disk almost full" "$ALERT_EMAIL"
elif [ "$USED_PERCENT" -ge "$WARN_PERCENT" ]; then
    echo "WARNING: Backup disk at ${USED_PERCENT}% on $(hostname)" | \
        mail -s "WARNING: Backup disk getting full" "$ALERT_EMAIL"
fi
```

```bash
sudo chmod +x /usr/local/bin/check-backup-disk.sh
sudo crontab -e
# Add:
# */30 * * * * /usr/local/bin/check-backup-disk.sh
```

## Setting Up Complete Scheduled Rotation

Bring it all together with cron:

```bash
sudo crontab -e
```

```bash
# Database backups at 1 AM
0 1 * * * /usr/local/bin/mysql-backup.sh
30 1 * * * /usr/local/bin/postgres-backup.sh

# Filesystem backup at 2 AM
0 2 * * * /usr/local/bin/system-backup.sh

# Run rotation after backups complete at 3 AM
0 3 * * * /usr/local/bin/backup-rotate.sh
0 3 * * * /usr/local/bin/db-backup-rotate.sh

# Check disk space every 30 minutes
*/30 * * * * /usr/local/bin/check-backup-disk.sh

# Weekly backup verification on Sunday at 4 AM
0 4 * * 0 /usr/local/bin/verify-backups.sh
```

## Viewing Backup History

```bash
# Summary of all backup storage usage
du -sh /mnt/backup/daily /mnt/backup/weekly /mnt/backup/monthly 2>/dev/null

# List all backups with sizes and dates
ls -lhtr /mnt/backup/daily/
ls -lhtr /mnt/backup/weekly/
ls -lhtr /mnt/backup/monthly/

# Total backup storage consumption
du -sh /mnt/backup/

# Disk usage breakdown
df -h /mnt/backup
```

A well-designed rotation policy balances two competing needs: keeping enough backup history to recover from any realistic failure, and not consuming unlimited disk space in the process. The GFS scheme is a proven approach that works for most environments. Adjust the retention numbers based on your storage capacity and recovery requirements.
