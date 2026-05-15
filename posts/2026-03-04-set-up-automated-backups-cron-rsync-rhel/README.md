# How to Set Up Automated Backups with Cron and rsync on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cron, Rsync, Backup, Automation, Linux

Description: Configure automated backups on RHEL using cron jobs and rsync to ensure regular, hands-off data protection with retention policies.

---

Combining cron with rsync gives you a simple, reliable automated backup solution on RHEL. Cron handles scheduling, and rsync handles efficient file transfer.

## Creating the Backup Script

Write a backup script with logging and retention:

```bash
#!/bin/bash
# /usr/local/bin/auto-backup.sh

# Automated rsync backup with rotation

# Configuration
SOURCES=("/home" "/etc" "/var/www")
BACKUP_DIR="/backup/daily"
LOG_FILE="/var/log/backup.log"
RETENTION_DAYS=30
STATUS=0

# Create timestamp
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
DEST="${BACKUP_DIR}/${TIMESTAMP}"

# Start logging
echo "=== Backup started: $(date) ===" >> "$LOG_FILE"

# Create destination directory
if ! mkdir -p "$DEST"; then
  echo "Failed to create backup destination: $DEST" >> "$LOG_FILE"
  exit 1
fi

# Run rsync for each source directory
for SRC in "${SOURCES[@]}"; do
  DIR_NAME=$(basename "$SRC")
  if ! rsync -az --delete \
    --exclude='*.tmp' \
    --exclude='*.swp' \
    "$SRC/" "${DEST}/${DIR_NAME}/" 2>> "$LOG_FILE"; then
    STATUS=1
  fi
done

# Remove backups older than retention period
if ! find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -exec rm -rf {} +; then
  STATUS=1
fi

echo "=== Backup completed: $(date) ===" >> "$LOG_FILE"

exit "$STATUS"
```

Make the script executable:

```bash
# Set permissions
sudo chmod 755 /usr/local/bin/auto-backup.sh

# Test the script manually first
sudo /usr/local/bin/auto-backup.sh
```

## Setting Up the Cron Job

Schedule the backup to run daily at 2:00 AM:

```bash
# Edit the root crontab
sudo crontab -e
```

Add the following entry:

```cron
# Daily backup at 2:00 AM
0 2 * * * /usr/local/bin/auto-backup.sh
```

Alternatively, use a cron drop-in file:

```bash
# Create a cron file for backups
sudo tee /etc/cron.d/system-backup > /dev/null << 'CRON'
# Run daily backup at 2:00 AM as root
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
0 2 * * * root /usr/local/bin/auto-backup.sh
CRON
```

## Monitoring Backup Status

Set up a simple email notification on failure:

```bash
# Add this before the final exit in auto-backup.sh
if [ "$STATUS" -ne 0 ]; then
  echo "Backup FAILED on $(hostname) at $(date)" | \
    mail -s "Backup Failure Alert" admin@example.com
fi
```

Verify cron is running and check the backup logs:

```bash
# Check cron service status
systemctl status crond

# Review recent backup logs
tail -50 /var/log/backup.log
```
