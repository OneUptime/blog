# How to Use rsync for Efficient File Transfers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Rsync, File Transfer, Backup, Linux

Description: Master rsync for efficient file transfers and synchronization on Ubuntu, covering local and remote transfers, common options, bandwidth limiting, and practical backup workflows.

---

rsync is the standard tool for file synchronization on Linux. It transfers only the differences between source and destination rather than copying everything from scratch, making it dramatically faster than `cp` or `scp` for repeated transfers. It works locally, over SSH, or through the rsync daemon protocol.

## How rsync Works

rsync's efficiency comes from the "rsync algorithm." For each file, it:

1. Breaks the destination file into fixed-size blocks and computes checksums
2. Compares those checksums with the source file
3. Transfers only the blocks that differ

For the first transfer (when no destination exists), rsync copies the full file. For subsequent transfers, only changed blocks are sent. On a slow link or for large files, this can reduce transfer time from hours to seconds.

## Basic Syntax

```text
rsync [options] source destination
```

Both source and destination can be:
- A local path: `/home/user/documents`
- A remote path via SSH: `user@host:/path`
- A rsync daemon path: `rsync://host/module/path`

The trailing slash on the source matters:
- `rsync /src/ /dst/` - copies the *contents* of `/src` into `/dst`
- `rsync /src /dst/` - copies the *directory* `/src` into `/dst`, creating `/dst/src`

## Common rsync Options

```text
-a, --archive    Archive mode: recursive, preserves symlinks, permissions, timestamps,
                 owner, group. Equivalent to -rlptgoD.
-v, --verbose    Show files being transferred
-z, --compress   Compress data during transfer (good for slow networks)
-h, --human-readable  Human-readable file sizes
-n, --dry-run    Show what would be done without actually doing it
-P               Equivalent to --partial --progress: keep partial files and show progress
--delete         Delete files in destination that don't exist in source
--exclude=PATTERN  Exclude files matching PATTERN
--include=PATTERN  Include files matching PATTERN
--bwlimit=RATE   Limit bandwidth (KB/s)
--checksum       Compare files by checksum rather than size+timestamp
--no-perms       Don't preserve permissions (useful when syncing to different owner)
```

## Local File Transfers

```bash
# Copy a directory (contents only)
rsync -av /home/user/documents/ /backup/documents/

# Copy a directory (including the directory itself)
rsync -av /home/user/documents /backup/

# Synchronize with deletion (mirror source to destination)
rsync -av --delete /home/user/documents/ /backup/documents/

# Dry run first to see what will change
rsync -avn --delete /home/user/documents/ /backup/documents/
# Add -v for verbose, -n for dry run
```

## Remote Transfers via SSH

```bash
# Transfer local to remote
rsync -avz /home/user/documents/ remoteuser@192.168.1.10:/backup/documents/

# Transfer remote to local (note the reversed arguments)
rsync -avz remoteuser@192.168.1.10:/var/www/html/ /local/html-backup/

# Use a specific SSH key
rsync -avz -e "ssh -i ~/.ssh/mykey" /source/ user@host:/destination/

# Use a non-standard SSH port
rsync -avz -e "ssh -p 2222" /source/ user@host:/destination/

# Transfer with progress bar
rsync -avz --progress /source/ user@host:/destination/

# Or use -P (combines --partial and --progress)
rsync -avzP /large-file.tar user@host:/destination/
```

## Excluding Files and Directories

```bash
# Exclude a specific directory
rsync -av --exclude='.git' /source/ /destination/

# Exclude multiple patterns
rsync -av --exclude='.git' --exclude='*.tmp' --exclude='__pycache__' \
    /source/ /destination/

# Exclude patterns from a file
cat /tmp/rsync-excludes.txt
# .git
# *.tmp
# __pycache__
# node_modules
# .DS_Store

rsync -av --exclude-from=/tmp/rsync-excludes.txt /source/ /destination/

# Exclude all hidden files and directories
rsync -av --exclude='.*' /source/ /destination/
```

## Bandwidth Limiting

```bash
# Limit to 5 MB/s (specified in KB/s)
rsync -avz --bwlimit=5120 /large-data/ user@host:/destination/

# Run a large sync in the background with bandwidth limiting
nohup rsync -avz --bwlimit=10240 /data/ user@host:/backup/ > /tmp/rsync.log 2>&1 &
echo $!  # note the PID to monitor it
```

## Practical Backup Workflows

### Simple Daily Backup Script

```bash
sudo nano /usr/local/bin/daily-backup.sh
```

```bash
#!/bin/bash
# Daily backup with rsync

SOURCE="/home"
DEST="backupserver:/backups/$(hostname)"
LOG="/var/log/rsync-backup.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Exclude caches and temporary files
EXCLUDES=(
    --exclude='.cache'
    --exclude='*.tmp'
    --exclude='.local/share/Trash'
    --exclude='__pycache__'
)

echo "[$DATE] Starting backup" >> "$LOG"

rsync -avz --delete "${EXCLUDES[@]}" "$SOURCE/" "$DEST/" >> "$LOG" 2>&1

EXIT_CODE=$?
DATE_END=$(date '+%Y-%m-%d %H:%M:%S')

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$DATE_END] Backup completed successfully" >> "$LOG"
else
    echo "[$DATE_END] Backup failed with exit code $EXIT_CODE" >> "$LOG"
    # Send alert (adapt to your alerting system)
    echo "Backup failed" | mail -s "Backup Alert: $(hostname)" admin@example.com
fi

exit $EXIT_CODE
```

```bash
sudo chmod +x /usr/local/bin/daily-backup.sh

# Schedule with cron (run at 2 AM daily)
sudo crontab -e
```

Add:
```text
0 2 * * * /usr/local/bin/daily-backup.sh
```

### Incremental Backup with Hard Links

rsync can create snapshot-style backups where each day's backup is a complete directory, but unchanged files are hard links to previous backups (saving space):

```bash
sudo nano /usr/local/bin/snapshot-backup.sh
```

```bash
#!/bin/bash
# Snapshot-style backup using rsync and hard links

SOURCE="/home"
BACKUP_DIR="/backups"
SNAPSHOT_DIR="$BACKUP_DIR/$(date +%Y-%m-%d)"
LINK_DIR="$BACKUP_DIR/latest"

# Create today's snapshot, using yesterday's as the link-dest
rsync -av --delete \
    --link-dest="$LINK_DIR" \
    "$SOURCE/" \
    "$SNAPSHOT_DIR/"

# Update the 'latest' symlink
rm -f "$LINK_DIR"
ln -s "$SNAPSHOT_DIR" "$LINK_DIR"

# Remove snapshots older than 30 days
find "$BACKUP_DIR" -maxdepth 1 -name '????-??-??' -type d -mtime +30 -exec rm -rf {} \;

echo "Snapshot backup to $SNAPSHOT_DIR completed"
```

Each day creates a complete directory of the current state, but identical files are hard links rather than copies. A week of backups might use only slightly more space than a single backup.

## Verifying Transfers

```bash
# Verify that source and destination match (using checksums, not timestamps)
rsync -avn --checksum /source/ /destination/
# No output = everything matches

# Check the exit code
echo $?
# 0 = success, non-zero = errors occurred

# See a summary of what would change
rsync -avz --dry-run --stats /source/ user@host:/destination/
```

## rsync Exit Codes

Understanding rsync exit codes helps in scripts:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Syntax/usage error |
| 2 | Protocol incompatibility |
| 11 | Error in file I/O |
| 23 | Partial transfer (some files failed) |
| 24 | Partial transfer (source files vanished) |
| 30 | Timeout |
| 35 | Timeout waiting for daemon connection |

## Monitoring a Running rsync Job

```bash
# Find the rsync process
ps aux | grep rsync

# See what file it is currently transferring
ls -la /proc/$(pgrep rsync)/fd | grep -v "^total"

# Send SIGUSR1 to get the current transfer status
kill -USR1 $(pgrep rsync)

# Or just watch the log file if you redirected output
tail -f /tmp/rsync.log
```

## Useful rsync Patterns

```bash
# Sync only files newer than a certain date
rsync -av --newer-mtime='2026-01-01' /source/ /dest/

# Delete excluded files from destination too (dangerous - test with -n first)
rsync -av --delete --delete-excluded --exclude='*.tmp' /source/ /dest/

# Preserve extended attributes (if supported by filesystem)
rsync -av -X /source/ /dest/

# Transfer files larger than 10MB only
rsync -av --min-size=10m /source/ /dest/

# Transfer only specific file types
rsync -av --include='*.pdf' --include='*/' --exclude='*' /source/ /dest/
# Note: --include for directories (*/) is required to recurse into them
```

rsync is one of those tools that rewards learning its options well. Once you understand the trailing slash behavior and the --delete flag, most backup and synchronization workflows become straightforward. The combination of efficiency, reliability, and SSH integration makes it the right tool for most file transfer tasks on Ubuntu.
