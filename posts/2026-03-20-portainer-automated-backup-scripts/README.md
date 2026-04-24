# How to Set Up Automated Portainer Backup Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Automation, Shell Script, Cron, Administration

Description: Learn how to set up automated backup scripts for Portainer using cron jobs, with email notifications on failure and automatic retention management.

---

Manual backups are forgotten. Automated scripts ensure Portainer is backed up regularly without human intervention. This guide provides production-ready backup scripts with logging, retention, and failure alerting.

## Basic Automated Backup Script

```bash
#!/bin/bash
# /usr/local/bin/portainer-backup.sh

set -euo pipefail

BACKUP_DIR="/mnt/backups/portainer"
RETENTION_DAYS=30
LOG_FILE="/var/log/portainer-backup.log"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/portainer-$DATE.tar.gz"
PORTAINER_STOPPED=0

# Ensure backup directory exists

mkdir -p "$BACKUP_DIR"
exec >>"$LOG_FILE" 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

restart_portainer() {
  if [ "$PORTAINER_STOPPED" -eq 1 ]; then
    if docker start portainer >/dev/null; then
      log "Portainer restarted"
    else
      log "WARNING: Failed to restart Portainer automatically"
    fi
  fi
}

trap restart_portainer EXIT
trap 'log "ERROR: Backup failed"' ERR

log "Starting Portainer backup..."

# Stop Portainer for a consistent snapshot
docker stop portainer >/dev/null
PORTAINER_STOPPED=1
log "Portainer stopped"

# Create backup
docker run --rm \
  -v portainer_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine \
  tar czpf "/backup/portainer-$DATE.tar.gz" -C / data

# Restart Portainer
docker start portainer >/dev/null
PORTAINER_STOPPED=0
log "Portainer restarted"

# Verify backup
if tar tzf "$BACKUP_FILE" | grep -q portainer.db; then
  log "Backup verified: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"
else
  log "ERROR: Backup verification failed!"
  exit 1
fi

# Cleanup old backups
DELETED=$(find "$BACKUP_DIR" -name "portainer-*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "Removed $DELETED backups older than $RETENTION_DAYS days"

log "Backup complete"
```

## Setting Up the Cron Job

```bash
# Install the backup script
sudo cp portainer-backup.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/portainer-backup.sh

# Add cron job: run daily at 2:30 AM
sudo crontab -e

# Add this line:
30 2 * * * /usr/local/bin/portainer-backup.sh
```

## Adding Email Notifications on Failure

```bash
#!/bin/bash
# Enhanced version with failure notification

run_backup() {
  # ... backup logic from above ...
}

if ! run_backup; then
  # Send alert email on failure
  echo "Portainer backup failed on $(hostname) at $(date)" | \
    mail -s "ALERT: Portainer Backup Failed" admin@example.com
  exit 1
fi
```

## Uploading to S3

```bash
# After creating the local backup, upload to S3
aws s3 cp "$BACKUP_FILE" "s3://my-backup-bucket/portainer/"

# Or to MinIO
mc cp "$BACKUP_FILE" minio/portainer-backups/
```

## Monitoring Backup Jobs

Use Healthchecks.io or OneUptime to monitor that backups run on time:

```bash
# Add to the end of the backup script to ping on success
curl -fsS --retry 3 https://hc-ping.com/your-check-uuid
```
