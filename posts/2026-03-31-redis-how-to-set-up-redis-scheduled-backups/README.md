# How to Set Up Redis Scheduled Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Backup, Scheduled Backups, RDB, Operation

Description: Learn how to set up automated Redis backups using RDB snapshots, AOF files, cron jobs, and cloud storage uploads to protect your data.

---

## Redis Backup Methods

Redis provides two persistence mechanisms that also serve as backup sources:

- **RDB (Redis Database File)**: Point-in-time snapshot written to disk at configurable intervals. Compact and fast to restore.
- **AOF (Append-Only File)**: Log of every write command. More durable but larger and slower to restore.

For backups, RDB snapshots are generally preferred because they are compact and fast to create.

## Configuring RDB Snapshots

In redis.conf, configure automatic RDB saves:

```text
# Save if at least 1 key changed in last 900 seconds (15 minutes)
save 900 1

# Save if at least 10 keys changed in last 300 seconds (5 minutes)
save 300 10

# Save if at least 10000 keys changed in last 60 seconds
save 60 10000

# RDB file settings
dbfilename dump.rdb
dir /var/lib/redis

# Compression (saves disk space)
rdbcompression yes

# RDB checksum validation
rdbchecksum yes
```

Trigger a manual RDB save:

```bash
# Background save (non-blocking)
redis-cli BGSAVE

# Check when last save completed
redis-cli LASTSAVE
# Returns Unix timestamp

# Check if save is in progress
redis-cli INFO persistence | grep rdb_bgsave_in_progress
```

## Shell Script for Scheduled Backups

Create a backup script that saves RDB, compresses it, and uploads to S3:

```bash
#!/bin/bash
# /usr/local/bin/redis-backup.sh

set -euo pipefail

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
BACKUP_DIR="/backup/redis"
S3_BUCKET="${S3_BUCKET:-my-redis-backups}"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="redis-backup-$DATE.rdb.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting Redis backup..."

# Trigger BGSAVE
if [ -n "$REDIS_PASSWORD" ]; then
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
else
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
fi

# Wait for save to complete
echo "[$(date)] Waiting for BGSAVE to complete..."
while true; do
  if [ -n "$REDIS_PASSWORD" ]; then
    STATUS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" \
      INFO persistence | grep rdb_bgsave_in_progress | awk -F: '{print $2}' | tr -d '\r')
  else
    STATUS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
      INFO persistence | grep rdb_bgsave_in_progress | awk -F: '{print $2}' | tr -d '\r')
  fi

  if [ "$STATUS" -eq 0 ]; then
    break
  fi
  sleep 1
done

# Get the RDB file path
if [ -n "$REDIS_PASSWORD" ]; then
  RDB_FILE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET dir | tail -1)/$(
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" CONFIG GET dbfilename | tail -1
  )
else
  RDB_FILE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dir | tail -1)/$(
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" CONFIG GET dbfilename | tail -1
  )
fi

echo "[$(date)] Compressing $RDB_FILE..."
gzip -c "$RDB_FILE" > "$BACKUP_DIR/$BACKUP_FILE"

echo "[$(date)] Uploading to S3: s3://$S3_BUCKET/$BACKUP_FILE"
aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/$BACKUP_FILE" \
  --storage-class STANDARD_IA

# Verify upload
aws s3 ls "s3://$S3_BUCKET/$BACKUP_FILE"

# Clean up old local backups
echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "redis-backup-*.rdb.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup complete: $BACKUP_FILE"
```

Make the script executable:

```bash
chmod +x /usr/local/bin/redis-backup.sh
```

## Setting Up Cron Jobs

Schedule backups with cron:

```bash
# Edit cron for root or redis user
sudo crontab -e
```

Add these entries:

```text
# Daily full backup at 2 AM
0 2 * * * /usr/local/bin/redis-backup.sh >> /var/log/redis-backup.log 2>&1

# Hourly backup during business hours (8 AM - 8 PM)
0 8-20 * * 1-5 /usr/local/bin/redis-backup.sh >> /var/log/redis-backup.log 2>&1
```

## Systemd Timer Alternative

For systems that prefer systemd over cron:

```ini
# /etc/systemd/system/redis-backup.service
[Unit]
Description=Redis Backup
After=network.target

[Service]
Type=oneshot
User=redis
EnvironmentFile=/etc/redis/backup.env
ExecStart=/usr/local/bin/redis-backup.sh
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/redis-backup.timer
[Unit]
Description=Run Redis Backup Daily
Requires=redis-backup.service

[Timer]
OnCalendar=daily
AccuracySec=1h
Persistent=true

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
sudo systemctl enable redis-backup.timer
sudo systemctl start redis-backup.timer
sudo systemctl list-timers redis-backup.timer
```

## Environment File for Credentials

```bash
# /etc/redis/backup.env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
S3_BUCKET=my-redis-backups
AWS_DEFAULT_REGION=us-east-1
```

Secure the file:

```bash
sudo chmod 640 /etc/redis/backup.env
sudo chown root:redis /etc/redis/backup.env
```

## Backing Up AOF Files

If using AOF persistence, include AOF files in your backup:

```bash
# Trigger AOF rewrite (compacts the AOF file)
redis-cli BGREWRITEAOF

# Wait for completion
redis-cli INFO persistence | grep aof_rewrite_in_progress

# Copy AOF file
AOF_DIR=$(redis-cli CONFIG GET dir | tail -1)
AOF_FILE=$(redis-cli CONFIG GET appendfilename | tail -1)
cp "$AOF_DIR/$AOF_FILE" /backup/redis/appendonly-$DATE.aof
gzip /backup/redis/appendonly-$DATE.aof
```

## Verifying Backup Integrity

Always verify that backups are valid before relying on them:

```bash
#!/bin/bash
# verify-redis-backup.sh

BACKUP_FILE=$1

echo "Verifying backup: $BACKUP_FILE"

# Decompress to temp location
TMP_DIR=$(mktemp -d)
gunzip -c "$BACKUP_FILE" > "$TMP_DIR/dump.rdb"

# Start Redis in test mode to load the RDB
redis-server --port 6400 --daemonize yes --dir "$TMP_DIR" --dbfilename dump.rdb \
  --save "" --loglevel warning

sleep 2

# Check how many keys loaded
KEY_COUNT=$(redis-cli -p 6400 DBSIZE)
echo "Keys in backup: $KEY_COUNT"

# Spot check a few keys
redis-cli -p 6400 RANDOMKEY

# Shutdown test instance
redis-cli -p 6400 SHUTDOWN NOSAVE

rm -rf "$TMP_DIR"
echo "Backup verification complete"
```

## Summary

Setting up Redis scheduled backups requires triggering BGSAVE on a regular schedule, compressing the resulting RDB file, uploading it to durable storage like S3, and verifying the backup is restorable. Use cron or systemd timers to automate daily and hourly backups, store credentials in a protected environment file, and always run your backup verification script periodically to confirm that backups can actually be restored to a working Redis instance.
