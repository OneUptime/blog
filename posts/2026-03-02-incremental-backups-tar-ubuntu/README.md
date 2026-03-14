# How to Set Up Incremental Backups with tar on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, Tar, System Administration

Description: Learn how to implement an incremental backup strategy using tar on Ubuntu, including level-based incremental backups, scheduling, and restoration procedures.

---

tar (tape archive) has been the standard Unix file archiving tool for decades. While it is primarily known for creating compressed archives, tar supports genuine incremental backups through its "listed-incremental" mode. This approach creates a full backup initially, then subsequent backups contain only files that have changed since the last backup, significantly reducing storage and time requirements.

## Understanding tar Incremental Backups

tar's incremental backup system works with snapshot files (sometimes called "snapshot" or "snar" files). The snapshot file records which files were present and their modification times at the last backup. When tar runs an incremental backup, it compares the current filesystem state to the snapshot and archives only what has changed.

There are two levels of incremental backups with tar:
- **Level 0 (full backup):** Archives everything and creates a new snapshot file
- **Level 1+ (incremental backup):** Archives only files changed since the last backup

## Running Your First Full Backup

Create a directory structure for your backups:

```bash
# Create backup and snapshot directories
mkdir -p /mnt/backup/tar-backups
mkdir -p /mnt/backup/snapshots
```

Run the initial level-0 (full) backup:

```bash
# Full backup with gzip compression
# --listed-incremental creates/updates the snapshot file
tar \
  --create \
  --file=/mnt/backup/tar-backups/backup-full-$(date +%Y%m%d).tar.gz \
  --listed-incremental=/mnt/backup/snapshots/home.snar \
  --gzip \
  --verbose \
  /home

# Using the short-form flags
tar -czg /mnt/backup/snapshots/home.snar \
  -f /mnt/backup/tar-backups/backup-full-$(date +%Y%m%d).tar.gz \
  /home
```

After the full backup, the snapshot file `/mnt/backup/snapshots/home.snar` records the state of all files in `/home`.

## Running Incremental Backups

For daily incremental backups, use the same snapshot file:

```bash
# Incremental backup - only backs up files changed since the snapshot was created
tar \
  --create \
  --file=/mnt/backup/tar-backups/backup-inc-$(date +%Y%m%d-%H%M).tar.gz \
  --listed-incremental=/mnt/backup/snapshots/home.snar \
  --gzip \
  --verbose \
  /home
```

Each incremental backup updates the snapshot file to reflect the current state of the filesystem.

## Excluding Unnecessary Files

Use exclusion patterns to skip cache directories and temporary files:

```bash
tar \
  --create \
  --file=/mnt/backup/tar-backups/backup-full-$(date +%Y%m%d).tar.gz \
  --listed-incremental=/mnt/backup/snapshots/home.snar \
  --gzip \
  --verbose \
  --exclude='*/.cache' \
  --exclude='*/.thumbnails' \
  --exclude='*/Downloads' \
  --exclude='*/.local/share/Trash' \
  --exclude='*.tmp' \
  /home
```

Or use an exclusion file:

```bash
# Create exclusion file
cat > /etc/tar-exclude.txt << 'EOF'
# Browser and application caches
*/.cache
*/.thumbnails
*/.mozilla/firefox/*/Cache
*/.config/google-chrome/Default/Cache

# Temporary and trash
*.tmp
*/.local/share/Trash
*/Downloads

# Virtual machine disks
*.qcow2
*.vmdk
*.vdi
EOF

# Use exclusion file in tar command
tar \
  --create \
  --file=/mnt/backup/tar-backups/backup-full-$(date +%Y%m%d).tar.gz \
  --listed-incremental=/mnt/backup/snapshots/home.snar \
  --gzip \
  --exclude-from=/etc/tar-exclude.txt \
  /home
```

## Creating a Weekly Full, Daily Incremental Schedule

A common strategy is to run a full backup weekly and incremental backups daily:

```bash
sudo nano /usr/local/bin/tar-backup.sh
```

```bash
#!/bin/bash
# tar incremental backup script
# Full backup on Sundays, incremental on other days

set -euo pipefail

# Configuration
BACKUP_DIR="/mnt/backup/tar-backups"
SNAPSHOT_DIR="/mnt/backup/snapshots"
EXCLUDE_FILE="/etc/tar-exclude.txt"
LOG_FILE="/var/log/tar-backup.log"
KEEP_DAYS=35  # Keep 5 weeks of backups

# Logging
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# Create directories if they don't exist
mkdir -p "$BACKUP_DIR" "$SNAPSHOT_DIR"

# Determine backup type based on day of week
DAY_OF_WEEK=$(date +%u)  # 7 = Sunday
DATE=$(date +%Y%m%d-%H%M)

if [ "$DAY_OF_WEEK" -eq 7 ]; then
    BACKUP_TYPE="full"
    ARCHIVE_NAME="$BACKUP_DIR/backup-full-$DATE.tar.gz"

    # For full backup, remove the old snapshot to force a complete rescan
    rm -f "$SNAPSHOT_DIR/home.snar"

    log "Starting full backup: $ARCHIVE_NAME"
else
    BACKUP_TYPE="incremental"
    ARCHIVE_NAME="$BACKUP_DIR/backup-inc-$DATE.tar.gz"
    log "Starting incremental backup: $ARCHIVE_NAME"
fi

# Run tar backup
tar \
    --create \
    --file="$ARCHIVE_NAME" \
    --listed-incremental="$SNAPSHOT_DIR/home.snar" \
    --gzip \
    --exclude-from="$EXCLUDE_FILE" \
    /home /etc 2>&1 | tee -a "$LOG_FILE"

log "$BACKUP_TYPE backup complete: $ARCHIVE_NAME ($(du -sh "$ARCHIVE_NAME" | cut -f1))"

# Remove old backups
log "Removing backups older than $KEEP_DAYS days"
find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +"$KEEP_DAYS" -delete

log "Backup process finished"
```

```bash
sudo chmod +x /usr/local/bin/tar-backup.sh
```

Schedule with cron:

```bash
sudo crontab -e
```

```bash
# Full backup on Sunday at 1 AM
0 1 * * 7 /usr/local/bin/tar-backup.sh

# Incremental backup Monday-Saturday at 2 AM
0 2 * * 1-6 /usr/local/bin/tar-backup.sh
```

## Listing Archive Contents

Before restoring, check what an archive contains:

```bash
# List all files in an archive
tar --list --file=/mnt/backup/tar-backups/backup-full-20260302.tar.gz | head -50

# List with detailed information (permissions, owner, size)
tar --list --verbose --file=/mnt/backup/tar-backups/backup-full-20260302.tar.gz | less

# List only files matching a pattern
tar --list --file=/mnt/backup/tar-backups/backup-full-20260302.tar.gz | grep "nginx.conf"
```

## Restoring from Incremental Backups

Restoring from incremental backups requires applying them in order: full backup first, then each incremental in sequence.

### Finding Your Backup Files

```bash
# List available backups sorted by date
ls -lt /mnt/backup/tar-backups/

# Example output:
# backup-inc-20260302-0200.tar.gz
# backup-inc-20260301-0200.tar.gz
# backup-inc-20260228-0200.tar.gz
# backup-full-20260224-0100.tar.gz
```

### Performing the Restore

```bash
# Step 1: Restore the full backup
# --listed-incremental=/dev/null tells tar to treat this as a full restore
tar \
  --extract \
  --file=/mnt/backup/tar-backups/backup-full-20260224-0100.tar.gz \
  --listed-incremental=/dev/null \
  --directory=/tmp/restore \
  --verbose

# Step 2: Apply each incremental backup in order
for archive in /mnt/backup/tar-backups/backup-inc-202602*.tar.gz \
               /mnt/backup/tar-backups/backup-inc-202603*.tar.gz; do
    echo "Applying: $archive"
    tar \
      --extract \
      --file="$archive" \
      --listed-incremental=/dev/null \
      --directory=/tmp/restore \
      --verbose
done
```

### Restoring Specific Files

```bash
# Extract a specific file from the full backup
tar \
  --extract \
  --file=/mnt/backup/tar-backups/backup-full-20260224-0100.tar.gz \
  --listed-incremental=/dev/null \
  home/username/.bashrc

# Then check incrementals for newer versions
for archive in /mnt/backup/tar-backups/backup-inc-*.tar.gz; do
    if tar --list --file="$archive" | grep -q "home/username/.bashrc"; then
        echo "Found in: $archive"
        tar --extract --file="$archive" --listed-incremental=/dev/null home/username/.bashrc
    fi
done
```

## Verifying Archive Integrity

```bash
# Test archive integrity without extracting
tar --test-label --file=/mnt/backup/tar-backups/backup-full-20260302-0100.tar.gz
echo "Exit code: $?"  # 0 means success

# More thorough check - lists all files without extracting
tar --list --file=/mnt/backup/tar-backups/backup-full-20260302-0100.tar.gz > /dev/null && echo "Archive OK"

# Compare archive contents against filesystem (shows diffs)
tar \
  --compare \
  --file=/mnt/backup/tar-backups/backup-full-20260302-0100.tar.gz \
  --directory=/ \
  2>&1 | grep -v "Modification time differs"
```

## Handling Large Backups with Multiple Volumes

For backups that span multiple disks or have size limits:

```bash
# Split backup into 4GB volumes
tar \
  --create \
  --multi-volume \
  --tape-length=4G \
  --file=/mnt/backup/backup-{1..10}.tar.gz \
  --listed-incremental=/mnt/backup/snapshots/home.snar \
  --gzip \
  /home
```

tar's incremental backup mode is straightforward and has no external dependencies beyond the tar utility itself. It works well for simple scenarios where you need reliable backups without additional software. For more advanced features like deduplication, encryption, or remote backups, consider pairing tar with tools like rsync or switching to BorgBackup.
