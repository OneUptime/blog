# How to Automate System Tasks with Bash Scripts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bash, Automation, Scripting, Linux

Description: Learn how to automate common system administration tasks on Ubuntu using Bash scripts, including backups, log rotation, user management, and system health checks.

---

Automation is how sysadmins scale. Tasks that run manually work fine when you have one server and thirty minutes. When you have ten servers and a production deployment in an hour, you need scripts that are reliable, repeatable, and don't require you to be awake at 3 AM clicking through a checklist.

This guide covers practical automation patterns for common Ubuntu system administration tasks, focusing on scripts you can actually deploy rather than toy examples.

## Setting Up a Reliable Script Foundation

Every production automation script should start with these lines:

```bash
#!/bin/bash

# Exit on error, unset variable use, and pipe failures
set -euo pipefail

# Script directory for relative path references
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Logging
LOG_FILE="/var/log/automation/$(basename "$0" .sh).log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    local level="$1"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

log_info()  { log "INFO " "$@"; }
log_warn()  { log "WARN " "$@" >&2; }
log_error() { log "ERROR" "$@" >&2; }

# Cleanup handler
cleanup() {
    local code=$?
    [ $code -ne 0 ] && log_error "Script exited with code $code"
}
trap cleanup EXIT
```

## Automating Backups

A backup script you can actually use in production:

```bash
#!/bin/bash
# /usr/local/bin/backup-app.sh
# Backs up application files and database, rotates old backups

set -euo pipefail

# Configuration
APP_DIR="/var/www/myapp"
DB_NAME="myapp_production"
DB_USER="backup_user"
BACKUP_ROOT="/mnt/backups/myapp"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "Starting backup"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup application files
log "Backing up application files..."
tar -czf "$BACKUP_DIR/app-files.tar.gz" \
    --exclude="$APP_DIR/node_modules" \
    --exclude="$APP_DIR/.git" \
    --exclude="$APP_DIR/tmp" \
    "$APP_DIR"

# Backup database
log "Backing up database..."
pg_dump -U "$DB_USER" "$DB_NAME" | \
    gzip > "$BACKUP_DIR/database.sql.gz"

# Create a checksum file for integrity verification
log "Creating checksums..."
cd "$BACKUP_DIR"
sha256sum *.tar.gz *.sql.gz > checksums.sha256

# Record backup metadata
cat > "$BACKUP_DIR/metadata.txt" << EOF
Backup Date: $(date)
Host: $(hostname)
App Directory: $APP_DIR
Database: $DB_NAME
Backup Size: $(du -sh "$BACKUP_DIR" | cut -f1)
EOF

log "Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"

# Remove old backups
log "Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" \
    -exec rm -rf {} + 2>/dev/null || true

# List remaining backups
log "Current backups:"
ls -lh "$BACKUP_ROOT" | tail -n +2

log "Backup complete: $BACKUP_DIR"
```

Schedule this with cron:
```bash
# Edit root's crontab
sudo crontab -e

# Run backup daily at 2 AM
0 2 * * * /usr/local/bin/backup-app.sh >> /var/log/automation/backup.log 2>&1
```

## Automated System Updates

A controlled update script that logs everything and handles failures:

```bash
#!/bin/bash
# /usr/local/bin/auto-update.sh
# Apply security updates with logging and notifications

set -euo pipefail

LOG="/var/log/automation/updates.log"
NOTIFY_EMAIL="ops@example.com"
HOSTNAME=$(hostname -f)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== Starting automated updates on $HOSTNAME ==="

# Update package lists
log "Updating package lists..."
apt-get update -q 2>&1 | tee -a "$LOG"

# Count available security updates
security_updates=$(apt-get -s upgrade 2>/dev/null | \
    grep -c "^Inst" || true)

log "Available updates: $security_updates packages"

if [ "$security_updates" -eq 0 ]; then
    log "System is up to date"
    exit 0
fi

# List packages being updated
log "Packages to update:"
apt-get -s upgrade 2>/dev/null | grep "^Inst" | tee -a "$LOG"

# Apply updates
log "Applying updates..."
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
    -o Dpkg::Options::="--force-confdef" \
    -o Dpkg::Options::="--force-confold" \
    2>&1 | tee -a "$LOG"

# Check if reboot is needed
if [ -f /var/run/reboot-required ]; then
    log "REBOOT REQUIRED: $(cat /var/run/reboot-required 2>/dev/null)"
    # Optionally schedule reboot during maintenance window
    # shutdown -r +60 "Scheduled reboot after system update"
fi

# Clean up
apt-get autoremove -y 2>&1 | tee -a "$LOG"
apt-get autoclean 2>&1 | tee -a "$LOG"

log "Update complete. $security_updates packages updated."

# Send notification
if command -v mail > /dev/null 2>&1; then
    echo "System update complete on $HOSTNAME. $security_updates packages updated." | \
        mail -s "Update Report: $HOSTNAME" "$NOTIFY_EMAIL"
fi
```

## User Account Provisioning

Automate creating users with consistent settings:

```bash
#!/bin/bash
# /usr/local/bin/provision-user.sh
# Usage: provision-user.sh <username> <ssh-public-key-file> [sudo]

set -euo pipefail

USERNAME="$1"
SSH_KEY_FILE="${2:-}"
GRANT_SUDO="${3:-no}"

# Validate username
if ! [[ "$USERNAME" =~ ^[a-z_][a-z0-9_-]*$ ]]; then
    echo "Error: Invalid username format: $USERNAME" >&2
    exit 1
fi

# Check if user already exists
if id "$USERNAME" &>/dev/null; then
    echo "User $USERNAME already exists"
else
    # Create user with home directory
    useradd -m -s /bin/bash -c "Provisioned by automation" "$USERNAME"
    echo "Created user: $USERNAME"

    # Set a locked password (force SSH key auth)
    passwd -l "$USERNAME"
fi

# Set up SSH key if provided
if [ -n "$SSH_KEY_FILE" ] && [ -f "$SSH_KEY_FILE" ]; then
    local_home=$(getent passwd "$USERNAME" | cut -d: -f6)
    ssh_dir="$local_home/.ssh"

    mkdir -p "$ssh_dir"
    chmod 700 "$ssh_dir"
    chown "$USERNAME:$USERNAME" "$ssh_dir"

    # Add the key (avoid duplicates)
    key_content=$(cat "$SSH_KEY_FILE")
    if ! grep -qF "$key_content" "$ssh_dir/authorized_keys" 2>/dev/null; then
        echo "$key_content" >> "$ssh_dir/authorized_keys"
        echo "Added SSH key for $USERNAME"
    fi

    chmod 600 "$ssh_dir/authorized_keys"
    chown "$USERNAME:$USERNAME" "$ssh_dir/authorized_keys"
fi

# Grant sudo if requested
if [ "$GRANT_SUDO" = "sudo" ] || [ "$GRANT_SUDO" = "yes" ]; then
    usermod -aG sudo "$USERNAME"
    echo "Granted sudo access to $USERNAME"
fi

echo "User provisioning complete for: $USERNAME"
```

## Log Cleanup and Rotation Script

```bash
#!/bin/bash
# /usr/local/bin/cleanup-logs.sh
# Clean old log files and compress recent ones

set -euo pipefail

LOG_DIRS=("/var/log/nginx" "/var/log/myapp" "/var/log/automation")
COMPRESS_AFTER_DAYS=7   # Compress logs older than 7 days
DELETE_AFTER_DAYS=90    # Delete logs older than 90 days

log() { echo "[$(date '+%H:%M:%S')] $*"; }

total_compressed=0
total_deleted=0
total_freed=0

for log_dir in "${LOG_DIRS[@]}"; do
    [ -d "$log_dir" ] || continue
    log "Processing: $log_dir"

    # Compress old uncompressed log files
    while IFS= read -r -d '' logfile; do
        size=$(stat -c %s "$logfile")
        gzip "$logfile"
        total_compressed=$(( total_compressed + 1 ))
        total_freed=$(( total_freed + size ))
        log "  Compressed: $(basename "$logfile")"
    done < <(find "$log_dir" -name "*.log" -not -name "*.gz" \
        -mtime +"$COMPRESS_AFTER_DAYS" -type f -print0)

    # Delete old compressed logs
    while IFS= read -r -d '' logfile; do
        size=$(stat -c %s "$logfile")
        rm -f "$logfile"
        total_deleted=$(( total_deleted + 1 ))
        total_freed=$(( total_freed + size ))
        log "  Deleted: $(basename "$logfile")"
    done < <(find "$log_dir" -name "*.log.gz" \
        -mtime +"$DELETE_AFTER_DAYS" -type f -print0)
done

freed_mb=$(( total_freed / 1024 / 1024 ))
log "Summary: Compressed $total_compressed files, deleted $total_deleted files, freed ~${freed_mb}MB"
```

## Disk Space Monitoring

```bash
#!/bin/bash
# /usr/local/bin/check-disk-space.sh
# Alert when disk usage is high

set -euo pipefail

WARN_THRESHOLD=80
CRIT_THRESHOLD=90
ALERT_FILE="/var/run/disk-alert-sent"

check_disk() {
    local issues=0

    while IFS= read -r line; do
        # Parse df output: filesystem size used avail use% mount
        filesystem=$(echo "$line" | awk '{print $1}')
        usage=$(echo "$line" | awk '{print $5}' | tr -d '%')
        mount=$(echo "$line" | awk '{print $6}')

        if [ "$usage" -ge "$CRIT_THRESHOLD" ]; then
            echo "CRITICAL: $mount is at ${usage}% ($filesystem)"
            issues=$(( issues + 1 ))
        elif [ "$usage" -ge "$WARN_THRESHOLD" ]; then
            echo "WARNING: $mount is at ${usage}% ($filesystem)"
            issues=$(( issues + 1 ))
        fi
    done < <(df -h | awk 'NR>1' | grep -v tmpfs)

    return $issues
}

if ! check_disk; then
    # Disk issue found - send alert if not already sent recently
    if [ ! -f "$ALERT_FILE" ] || [ "$(find "$ALERT_FILE" -mmin +60)" ]; then
        hostname=$(hostname)
        df -h | mail -s "DISK ALERT: $hostname" ops@example.com 2>/dev/null || true
        touch "$ALERT_FILE"
    fi
    exit 1
else
    # Clear alert file when everything is healthy
    rm -f "$ALERT_FILE"
fi
```

## Deploying Scripts System-Wide

Put automation scripts where they're easily found and maintained:

```bash
# Place scripts in /usr/local/bin (in PATH, not overwritten by packages)
sudo cp backup-app.sh /usr/local/bin/
sudo cp check-disk-space.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-app.sh /usr/local/bin/check-disk-space.sh

# Set up logging directory
sudo mkdir -p /var/log/automation
sudo chmod 755 /var/log/automation

# Set up cron jobs
sudo crontab -e
```

```cron
# Crontab for root
# Backup at 2 AM daily
0 2 * * * /usr/local/bin/backup-app.sh

# Check disk space every 15 minutes
*/15 * * * * /usr/local/bin/check-disk-space.sh

# Clean logs on Sundays at 3 AM
0 3 * * 0 /usr/local/bin/cleanup-logs.sh

# Security updates at 4 AM Sundays
0 4 * * 0 /usr/local/bin/auto-update.sh
```

The key to reliable automation scripts is: log everything, handle errors explicitly, clean up after failures, and test with `set -n` (dry run) before deploying. Scripts that fail silently are worse than no automation at all.
