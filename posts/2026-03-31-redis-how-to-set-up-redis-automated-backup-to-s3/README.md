# How to Set Up Redis Automated Backup to S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Backup, S3, AWS, Automation, Disaster Recovery

Description: Automate Redis RDB snapshot backups to AWS S3 using shell scripts and cron jobs, with rotation policies and restore procedures for disaster recovery.

---

## Redis Backup Strategy

Redis supports two persistence mechanisms:
- **RDB** - periodic point-in-time snapshots (dump.rdb)
- **AOF** - append-only log of every write command

For backup purposes, RDB snapshots are the most practical to ship to S3 because they are compact single files.

## Step 1 - Configure Redis RDB Snapshots

In `redis.conf`, ensure RDB is configured:

```text
# Save snapshot after 900s if at least 1 key changed
save 900 1
save 300 10
save 60 10000

# Snapshot file name and location
dbfilename dump.rdb
dir /var/lib/redis

# Compress the snapshot
rdbcompression yes
rdbchecksum yes
```

Force a snapshot manually:

```bash
redis-cli BGSAVE
redis-cli LASTSAVE  # Returns Unix timestamp of last save
```

## Step 2 - Set Up AWS CLI

Install and configure the AWS CLI with S3 permissions:

```bash
sudo apt install -y awscli

# Configure credentials
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: us-east-1
# Default output format: json

# Or use instance profile if running on EC2 (recommended)
aws sts get-caller-identity
```

Create an S3 bucket for Redis backups:

```bash
aws s3 mb s3://my-redis-backups --region us-east-1

# Enable versioning for point-in-time recovery
aws s3api put-bucket-versioning \
  --bucket my-redis-backups \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket my-redis-backups \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## Step 3 - Create the Backup Script

Create `/usr/local/bin/redis-backup-s3.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Configuration
REDIS_CLI="/usr/bin/redis-cli"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_DATA_DIR="/var/lib/redis"
RDB_FILE="dump.rdb"
S3_BUCKET="my-redis-backups"
S3_PREFIX="redis/$(hostname)/"
RETENTION_DAYS=30
LOG_FILE="/var/log/redis/backup.log"

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  echo "[$(timestamp)] $1" | tee -a "$LOG_FILE"
}

# Build redis-cli auth args
AUTH_ARGS=""
if [ -n "$REDIS_PASSWORD" ]; then
  AUTH_ARGS="-a $REDIS_PASSWORD"
fi

# Trigger a background save
log "Triggering BGSAVE..."
$REDIS_CLI -h $REDIS_HOST -p $REDIS_PORT $AUTH_ARGS BGSAVE

# Wait for the save to complete
log "Waiting for BGSAVE to complete..."
while true; do
  SAVE_STATUS=$($REDIS_CLI -h $REDIS_HOST -p $REDIS_PORT $AUTH_ARGS INFO persistence | grep rdb_bgsave_in_progress | tr -d '[:space:]')
  if [ "$SAVE_STATUS" = "rdb_bgsave_in_progress:0" ]; then
    break
  fi
  log "BGSAVE still in progress, waiting 5s..."
  sleep 5
done

log "BGSAVE completed"

# Verify the RDB file exists
RDB_PATH="$REDIS_DATA_DIR/$RDB_FILE"
if [ ! -f "$RDB_PATH" ]; then
  log "ERROR: RDB file not found at $RDB_PATH"
  exit 1
fi

# Create backup filename with timestamp
BACKUP_DATE=$(date '+%Y%m%d-%H%M%S')
BACKUP_FILENAME="redis-backup-${BACKUP_DATE}.rdb.gz"
BACKUP_PATH="/tmp/$BACKUP_FILENAME"

# Compress the RDB file
log "Compressing $RDB_PATH to $BACKUP_PATH..."
gzip -c "$RDB_PATH" > "$BACKUP_PATH"

BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
log "Compressed backup size: $BACKUP_SIZE"

# Upload to S3
S3_KEY="${S3_PREFIX}${BACKUP_FILENAME}"
log "Uploading to s3://$S3_BUCKET/$S3_KEY..."
aws s3 cp "$BACKUP_PATH" "s3://$S3_BUCKET/$S3_KEY" \
  --storage-class STANDARD_IA \
  --metadata "redis-host=$(hostname),backup-date=$BACKUP_DATE"

log "Upload complete"

# Clean up local temporary file
rm -f "$BACKUP_PATH"

# Delete old backups from S3 (older than RETENTION_DAYS)
log "Cleaning up backups older than $RETENTION_DAYS days..."
CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')
aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" | \
  awk -v cutoff="$CUTOFF_DATE" '$1 < cutoff {print $4}' | \
  while read key; do
    log "Deleting old backup: $key"
    aws s3 rm "s3://$S3_BUCKET/${S3_PREFIX}${key}"
  done

log "Backup completed successfully: s3://$S3_BUCKET/$S3_KEY"
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/redis-backup-s3.sh
sudo mkdir -p /var/log/redis
sudo chown redis:redis /var/log/redis
```

## Step 4 - Schedule with Cron

```bash
sudo crontab -e -u redis
```

Add:

```text
# Redis backup to S3 - runs daily at 2 AM
0 2 * * * REDIS_PASSWORD="yourpassword" /usr/local/bin/redis-backup-s3.sh >> /var/log/redis/backup.log 2>&1

# Weekly full backup at 3 AM on Sundays
0 3 * * 0 REDIS_PASSWORD="yourpassword" /usr/local/bin/redis-backup-s3.sh >> /var/log/redis/backup.log 2>&1
```

## Step 5 - Restore from Backup

To restore Redis from an S3 backup:

```bash
#!/bin/bash
# redis-restore-from-s3.sh

S3_BUCKET="my-redis-backups"
S3_PREFIX="redis/$(hostname)/"
REDIS_DATA_DIR="/var/lib/redis"

# List available backups
echo "Available backups:"
aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" | sort -r | head -20

# Download specific backup
BACKUP_FILE="${1:-}"  # Pass filename as argument or select manually
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-filename>"
  echo "Example: $0 redis-backup-20260331-020000.rdb.gz"
  exit 1
fi

echo "Downloading $BACKUP_FILE..."
aws s3 cp "s3://$S3_BUCKET/${S3_PREFIX}${BACKUP_FILE}" /tmp/

# Stop Redis
sudo systemctl stop redis

# Backup current dump.rdb
sudo cp "$REDIS_DATA_DIR/dump.rdb" "$REDIS_DATA_DIR/dump.rdb.old" 2>/dev/null || true

# Decompress and restore
gunzip -c "/tmp/$BACKUP_FILE" | sudo tee "$REDIS_DATA_DIR/dump.rdb" > /dev/null
sudo chown redis:redis "$REDIS_DATA_DIR/dump.rdb"

# Start Redis
sudo systemctl start redis

echo "Restore complete. Redis is loading the dataset..."
redis-cli PING
```

## Monitoring Backup Success

Add a Prometheus custom metric or alert via email/Slack on backup failure:

```bash
# Add to backup script - send Slack notification on failure
notify_slack() {
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Redis backup FAILED on $(hostname) at $(date)\"}"
}

trap 'notify_slack' ERR
```

## Summary

Automate Redis backups to S3 by triggering `BGSAVE`, waiting for completion, compressing the RDB file, and uploading it to S3 with a timestamped filename. Schedule the backup script with cron, set S3 lifecycle rules or script rotation to keep only N days of backups, and test the restore procedure by stopping Redis, replacing dump.rdb, and restarting. Store the Redis password in an environment variable or AWS Secrets Manager rather than in the script.
