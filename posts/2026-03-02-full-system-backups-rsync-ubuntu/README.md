# How to Create Full System Backups with rsync on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, rsync, System Administration

Description: Learn how to create full system backups using rsync on Ubuntu, including exclude patterns, scheduling with cron, and verifying your backup integrity.

---

Backing up your Ubuntu system with rsync is one of the most reliable and flexible approaches available. rsync is fast, supports incremental transfers, handles permissions correctly, and works over SSH for remote backups. This tutorial walks through setting up a complete system backup strategy using rsync.

## Understanding rsync for System Backups

rsync copies files while preserving metadata like permissions, ownership, timestamps, and symlinks. The `-a` (archive) flag is the workhorse here - it enables recursive copying, preserves symlinks, permissions, timestamps, group, owner, and device files all at once.

For a full system backup, you need to understand what to include and what to exclude. Certain directories like `/proc`, `/sys`, `/dev`, and `/run` are virtual filesystems that should not be backed up - they are populated at runtime by the kernel.

## Setting Up Your First Full Backup

Install rsync if it is not already present:

```bash
sudo apt update
sudo apt install rsync
```

Create a destination directory for your backup:

```bash
# Create backup destination - this can be a local drive, NAS, or mounted remote filesystem
sudo mkdir -p /mnt/backup/system-backup
```

Run your first full system backup:

```bash
sudo rsync -aAXv \
  --exclude='/dev/*' \
  --exclude='/proc/*' \
  --exclude='/sys/*' \
  --exclude='/tmp/*' \
  --exclude='/run/*' \
  --exclude='/mnt/*' \
  --exclude='/media/*' \
  --exclude='/lost+found' \
  / /mnt/backup/system-backup/
```

Breaking down the flags:
- `-a` - archive mode (recursive, preserves permissions, symlinks, times, group, owner)
- `-A` - preserve Access Control Lists
- `-X` - preserve extended attributes
- `-v` - verbose output to see progress

## Creating an Exclusion File

Rather than passing exclusions on the command line each time, keep them in a file:

```bash
sudo nano /etc/rsync-exclude.txt
```

Add the following content:

```text
# Virtual filesystems - populated at boot
/dev/*
/proc/*
/sys/*
/run/*

# Temporary files
/tmp/*
/var/tmp/*

# Mount points - don't back up other filesystems through these
/mnt/*
/media/*

# Lost+found directories
/lost+found
/*/lost+found

# Swap files
*.swp
/swapfile

# Cache directories that can be regenerated
/var/cache/apt/archives/*
/home/*/.cache/*
/home/*/.thumbnails/*

# Log files (optional - include if you need them)
# /var/log/*
```

Now run rsync using this file:

```bash
sudo rsync -aAXv \
  --exclude-from='/etc/rsync-exclude.txt' \
  / /mnt/backup/system-backup/
```

## Incremental Backups with Hard Links

rsync can create space-efficient incremental backups using the `--link-dest` option. This creates hard links to unchanged files from the previous backup instead of copying them again:

```bash
# Define variables
BACKUP_DEST="/mnt/backup"
DATE=$(date +%Y-%m-%d_%H%M%S)
LATEST="$BACKUP_DEST/latest"
CURRENT="$BACKUP_DEST/$DATE"

# Run backup with hard links to previous backup
sudo rsync -aAXv \
  --exclude-from='/etc/rsync-exclude.txt' \
  --link-dest="$LATEST" \
  / "$CURRENT/"

# Update the 'latest' symlink
sudo ln -snf "$CURRENT" "$LATEST"
```

This approach lets you keep many backup snapshots without each one taking full disk space - only changed files occupy new space.

## Backing Up to a Remote Server

rsync works seamlessly over SSH. Set up SSH key authentication first, then use the remote syntax:

```bash
# Backup to remote server
sudo rsync -aAXzv \
  --exclude-from='/etc/rsync-exclude.txt' \
  -e "ssh -p 22 -i /root/.ssh/backup_key" \
  / user@backup-server:/backups/$(hostname)/

# The -z flag enables compression during transfer - useful for slow connections
# For fast local networks, skip -z as it adds CPU overhead
```

## Writing a Backup Script

A proper backup script handles logging, error checking, and cleanup:

```bash
sudo nano /usr/local/bin/system-backup.sh
```

```bash
#!/bin/bash
# Full system backup script using rsync
# Place in /usr/local/bin/system-backup.sh and make executable

set -euo pipefail

# Configuration
BACKUP_DEST="/mnt/backup/snapshots"
EXCLUDE_FILE="/etc/rsync-exclude.txt"
LOG_FILE="/var/log/system-backup.log"
KEEP_DAYS=30  # How many days of backups to retain

# Create timestamp for this backup
DATE=$(date +%Y-%m-%d_%H%M%S)
CURRENT_BACKUP="$BACKUP_DEST/$DATE"
LATEST_LINK="$BACKUP_DEST/latest"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting system backup to $CURRENT_BACKUP"

# Ensure destination exists
mkdir -p "$CURRENT_BACKUP"

# Run rsync backup
if rsync -aAXv \
    --exclude-from="$EXCLUDE_FILE" \
    --link-dest="$LATEST_LINK" \
    --stats \
    / "$CURRENT_BACKUP/" >> "$LOG_FILE" 2>&1; then

    log "Backup completed successfully"

    # Update latest symlink
    ln -snf "$CURRENT_BACKUP" "$LATEST_LINK"
    log "Updated 'latest' symlink to $CURRENT_BACKUP"
else
    log "ERROR: Backup failed with exit code $?"
    exit 1
fi

# Clean up old backups
log "Removing backups older than $KEEP_DAYS days"
find "$BACKUP_DEST" -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} \; 2>/dev/null || true

log "Backup process complete"
```

Make the script executable:

```bash
sudo chmod +x /usr/local/bin/system-backup.sh
```

## Scheduling Backups with Cron

Set up automated nightly backups:

```bash
sudo crontab -e
```

Add this line to run the backup at 2 AM daily:

```bash
# Run system backup at 2:00 AM every day
0 2 * * * /usr/local/bin/system-backup.sh
```

For weekly full backups on Sunday at 1 AM:

```bash
0 1 * * 0 /usr/local/bin/system-backup.sh
```

## Monitoring Backup Logs

Check that backups are running correctly:

```bash
# View the backup log
tail -f /var/log/system-backup.log

# Check the last backup's statistics
grep -A 20 "$(date +%Y-%m-%d)" /var/log/system-backup.log | grep -E "Number of files|Total file size|Total transferred"

# List available backup snapshots
ls -lah /mnt/backup/snapshots/
```

## Restoring Files from Backup

To restore individual files or directories:

```bash
# Restore a single file
sudo rsync -aAXv /mnt/backup/snapshots/latest/etc/nginx/nginx.conf /etc/nginx/nginx.conf

# Restore an entire directory
sudo rsync -aAXv /mnt/backup/snapshots/latest/home/username/ /home/username/

# Restore with dry-run first to preview changes
sudo rsync -aAXvn /mnt/backup/snapshots/latest/etc/ /etc/
```

For a full system restore, boot from a live USB, mount your target drive, and run rsync from the backup to the target:

```bash
# Mount target drive
sudo mount /dev/sda1 /mnt/target

# Restore the full system
sudo rsync -aAXv /mnt/backup/snapshots/latest/ /mnt/target/

# Reinstall bootloader after restore
sudo grub-install --root-directory=/mnt/target /dev/sda
```

## Verifying Backup Integrity

Never assume a backup is good without verifying it. rsync has a `--checksum` flag that compares files by content rather than modification time:

```bash
# Verify backup matches source (dry run - no changes made)
sudo rsync -aAXvn --checksum \
  --exclude-from='/etc/rsync-exclude.txt' \
  / /mnt/backup/snapshots/latest/ 2>&1 | grep -v "/$"
```

If the output shows few or no differences, your backup is current. Any files listed have changed since the backup was taken.

## Common Troubleshooting

**Backup fails with "No space left on device":** Check disk space on the backup destination with `df -h`. Remove old backup snapshots if needed.

**Permission denied errors:** The backup script should run as root. Check that your cron job uses `sudo crontab -e` (root's crontab), not the user crontab.

**SSH connection timeouts for remote backups:** Add `-o ServerAliveInterval=60` to your SSH options in the rsync command to keep the connection alive during large transfers.

**Slow backup performance:** Use `--bwlimit=1000` to limit bandwidth to 1 MB/s, preventing the backup from saturating your network. For local backups, try adding `--no-compress` to skip compression overhead.

rsync is a mature, battle-tested tool that handles full system backups reliably. Combined with a solid exclusion list, incremental hard-link backups, and automated scheduling, it forms a robust foundation for your Ubuntu backup strategy.
