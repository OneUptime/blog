# How to Configure rdiff-backup for Versioned Backups on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, rdiff-backup, Versioning

Description: Set up rdiff-backup on Ubuntu for versioned, space-efficient backups that let you restore files from any point in time with reverse incremental storage.

---

rdiff-backup combines the best aspects of rsync and versioned backups. It maintains an exact mirror of your source data at the destination and keeps reverse diffs to let you restore any previous version of any file. This approach means the latest backup is immediately accessible as a plain directory - you do not need to extract anything to get your most recent files.

## Understanding rdiff-backup's Approach

Unlike tar-based backups where you apply incrementals in sequence, rdiff-backup stores the current state of your data as regular files in the backup directory, plus a set of reverse diffs in a special `rdiff-backup-data` subdirectory. When you want an older version of a file, rdiff-backup applies the diffs backward to reconstruct it.

This means:
- The backup directory is always a current, usable mirror
- Restoring the latest version requires no special tooling
- Older versions are accessed through rdiff-backup commands
- Storage is efficient because only differences between versions are kept

## Installing rdiff-backup

```bash
sudo apt update
sudo apt install rdiff-backup

# Check version
rdiff-backup --version
```

For Ubuntu 22.04 and newer, the package is called `rdiff-backup` and installs version 2.x. For Ubuntu 20.04, you may want to install from the project's GitHub releases for the latest version:

```bash
# Install pip if needed
sudo apt install python3-pip

# Install latest rdiff-backup via pip
sudo pip3 install rdiff-backup
```

## Running Your First Backup

The basic syntax is `rdiff-backup source destination`:

```bash
# Back up /home to /mnt/backup/rdiff-home
rdiff-backup /home /mnt/backup/rdiff-home

# Backup with verbose output
rdiff-backup -v5 /home /mnt/backup/rdiff-home
```

rdiff-backup creates the destination directory if it does not exist. After the first run, the destination looks just like the source - you can browse it with `ls` and read files directly.

## Excluding Files and Directories

Use include/exclude patterns to control what gets backed up:

```bash
# Exclude specific directories
rdiff-backup \
  --exclude '/home/*/.cache' \
  --exclude '/home/*/.thumbnails' \
  --exclude '/home/*/.local/share/Trash' \
  --exclude '/home/*/Downloads' \
  /home \
  /mnt/backup/rdiff-home

# Use a glob pattern with exclude-globbing-filelist
cat > /etc/rdiff-backup-excludes.txt << 'EOF'
# Cache and temporary files
- /home/*/.cache
- /home/*/.thumbnails
- /home/*/.local/share/Trash
- /home/*/Downloads
- **/*.tmp
- **/*.swp
EOF

rdiff-backup \
  --exclude-globbing-filelist /etc/rdiff-backup-excludes.txt \
  /home \
  /mnt/backup/rdiff-home
```

## Remote Backups over SSH

rdiff-backup can back up to or from a remote host using SSH. The remote side must also have rdiff-backup installed:

```bash
# Install rdiff-backup on both local and remote machines first
# Then back up local /home to remote server
rdiff-backup /home user@backup-server::/backups/rdiff-home

# Back up remote host to local storage
rdiff-backup user@remote-server::/var/www /mnt/backup/rdiff-www

# Specify SSH key and port
rdiff-backup \
  --remote-schema 'ssh -p 2222 -i /root/.ssh/backup_key %s rdiff-backup --server' \
  /home \
  user@backup-server::/backups/rdiff-home
```

## Listing Backup Increments

Each time you run rdiff-backup, it creates an "increment" - a point-in-time snapshot accessible for restoration:

```bash
# List all increments (backup history)
rdiff-backup --list-increments /mnt/backup/rdiff-home

# Example output:
# Found 14 increments:
# Fri Mar  1 02:00:00 2026
# Thu Feb 28 02:00:00 2026
# Wed Feb 27 02:00:00 2026
# ...

# List increments with sizes
rdiff-backup --list-increment-sizes /mnt/backup/rdiff-home
```

## Restoring Files and Directories

### Restore the Latest Version

Since the backup destination is already the current state, you can copy files directly:

```bash
# Just copy from the backup directory
cp /mnt/backup/rdiff-home/username/documents/important.txt ~/documents/important.txt

# Or rsync the entire directory back
rsync -av /mnt/backup/rdiff-home/username/ /home/username/
```

### Restore a Previous Version

Use `--restore-as-of` to get older versions:

```bash
# Restore to state from 3 days ago
rdiff-backup \
  --restore-as-of 3D \
  /mnt/backup/rdiff-home/username/documents \
  /tmp/restore/documents

# Restore from a specific date
rdiff-backup \
  --restore-as-of '2026-02-27T02:00:00' \
  /mnt/backup/rdiff-home/username/documents/important.txt \
  /tmp/restore/important.txt

# Restore the entire backup from 1 week ago
rdiff-backup \
  --restore-as-of 1W \
  /mnt/backup/rdiff-home \
  /tmp/full-restore
```

Time specification formats:
- `3D` - 3 days ago
- `2W` - 2 weeks ago
- `1M` - 1 month ago
- `'2026-02-27'` - specific date
- `'2026-02-27T14:30:00'` - specific date and time

## Removing Old Increments

Old increments accumulate over time. Remove older ones to free up disk space:

```bash
# Remove increments older than 30 days
rdiff-backup --remove-older-than 30D /mnt/backup/rdiff-home

# Remove increments older than 2 months
rdiff-backup --remove-older-than 2M /mnt/backup/rdiff-home

# Preview what would be removed (dry run)
rdiff-backup --remove-older-than 30D --test /mnt/backup/rdiff-home
```

## Creating an Automated Backup Script

```bash
sudo nano /usr/local/bin/rdiff-backup-daily.sh
```

```bash
#!/bin/bash
# rdiff-backup automated daily backup
# Backs up /home and /etc with retention policy

set -euo pipefail

# Configuration
SOURCES=("/home" "/etc")
BACKUP_BASE="/mnt/backup/rdiff"
RETENTION="60D"  # Keep 60 days of history
LOG_FILE="/var/log/rdiff-backup.log"
EXCLUDE_FILE="/etc/rdiff-backup-excludes.txt"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Back up each source directory
for SOURCE in "${SOURCES[@]}"; do
    # Create destination directory name from source path
    DEST_NAME=$(echo "$SOURCE" | tr '/' '-' | sed 's/^-//')
    DEST="$BACKUP_BASE/$DEST_NAME"

    log "Backing up $SOURCE -> $DEST"

    rdiff-backup \
        --exclude-globbing-filelist "$EXCLUDE_FILE" \
        --print-statistics \
        "$SOURCE" \
        "$DEST" 2>&1 | tee -a "$LOG_FILE"

    log "Removing increments older than $RETENTION from $DEST"
    rdiff-backup --remove-older-than "$RETENTION" "$DEST" 2>&1 | tee -a "$LOG_FILE"
done

log "All backups complete"
```

```bash
sudo chmod +x /usr/local/bin/rdiff-backup-daily.sh
```

Schedule with cron:

```bash
sudo crontab -e
```

```bash
# Run rdiff-backup at 2 AM daily
0 2 * * * /usr/local/bin/rdiff-backup-daily.sh
```

## Verifying Backup Integrity

rdiff-backup includes a built-in verification command that checks all backup data:

```bash
# Verify the backup repository (checks checksums)
rdiff-backup --verify /mnt/backup/rdiff-home

# Verify a specific file
rdiff-backup --verify /mnt/backup/rdiff-home/username/documents

# Compare backup to source (shows files that differ)
rdiff-backup --compare /home /mnt/backup/rdiff-home

# Compare with specific time
rdiff-backup --compare-at-time now /home /mnt/backup/rdiff-home
```

## Checking Backup Statistics

```bash
# Show statistics for the last backup session
rdiff-backup --list-session-statistics /mnt/backup/rdiff-home

# View the change summary for a specific increment
rdiff-backup --list-changed-since 1D /mnt/backup/rdiff-home
```

## Troubleshooting Common Issues

**"Connection refused" on remote backup:** Ensure rdiff-backup is installed on the remote server and the SSH user has access to the backup directory.

```bash
# Test SSH connectivity
ssh user@backup-server "rdiff-backup --version"
```

**"Failed to connect to ... No module named rdiff_backup":** Both sides must have the same major version of rdiff-backup. Check versions:

```bash
rdiff-backup --version
ssh user@backup-server "rdiff-backup --version"
```

**Backup directory locked after crash:** If rdiff-backup crashed mid-backup, it may leave a lock file:

```bash
# Force unlock the repository (only if no backup is running)
rdiff-backup --check-destination-dir /mnt/backup/rdiff-home
```

**Disk space growing unexpectedly:** Run `--list-increment-sizes` to see which increments are large, then remove old ones:

```bash
rdiff-backup --list-increment-sizes /mnt/backup/rdiff-home
rdiff-backup --remove-older-than 30D /mnt/backup/rdiff-home
```

rdiff-backup's combination of a live mirror and version history makes it excellent for use cases where you frequently need to access recent backup data directly, while still being able to reach back weeks or months for older file versions. Its main limitation is that it requires rdiff-backup on both ends for remote backups, which is worth considering when evaluating it against rsync-based solutions.
