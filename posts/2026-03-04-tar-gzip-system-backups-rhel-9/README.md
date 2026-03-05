# How to Use tar and gzip for System Backups on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, tar, Gzip, Backup, Linux

Description: Create compressed system backups on RHEL using tar and gzip, including full system archives and selective directory backups.

---

tar and gzip are the most basic and universal backup tools on Linux. They are installed everywhere, require no extra packages, and produce archives that can be extracted on any system. For many situations, they are all you need.

## Basic tar Commands

```bash
# Create a compressed backup of /etc
# c = create, z = gzip compression, v = verbose, f = filename
# p = preserve permissions
sudo tar -czvpf /backup/etc-backup-$(date +%Y%m%d).tar.gz /etc

# Create a backup of /home
sudo tar -czvpf /backup/home-backup-$(date +%Y%m%d).tar.gz /home

# Create a backup of multiple directories
sudo tar -czvpf /backup/system-backup-$(date +%Y%m%d).tar.gz \
    /etc /home /var/www /opt/app
```

## Full System Backup

```bash
#!/bin/bash
# /usr/local/bin/full-backup.sh
# Create a full system backup with tar

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d-%H%M)
HOSTNAME=$(hostname -s)
ARCHIVE="${BACKUP_DIR}/${HOSTNAME}-full-${DATE}.tar.gz"
LOG="/var/log/backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "$(date): Starting full system backup" >> "$LOG"

# Create the archive
# Exclude directories that should not be backed up
sudo tar -czvpf "$ARCHIVE" \
    --exclude='/proc' \
    --exclude='/sys' \
    --exclude='/dev' \
    --exclude='/run' \
    --exclude='/tmp' \
    --exclude='/mnt' \
    --exclude='/media' \
    --exclude='/backup' \
    --exclude='/var/tmp' \
    --exclude='/var/cache/dnf' \
    --exclude='*.swap' \
    --exclude='lost+found' \
    --one-file-system \
    / >> "$LOG" 2>&1

# Check if the backup was successful
if [ $? -eq 0 ]; then
    SIZE=$(du -sh "$ARCHIVE" | cut -f1)
    echo "$(date): Backup complete. File: $ARCHIVE Size: $SIZE" >> "$LOG"
else
    echo "$(date): Backup FAILED" >> "$LOG"
fi
```

## Backup with Better Compression (xz)

For smaller archive sizes at the cost of slower compression:

```bash
# Use xz compression (slower but smaller)
sudo tar -cJvpf /backup/etc-backup-$(date +%Y%m%d).tar.xz /etc

# Use zstd compression (fast and good compression)
sudo tar -I zstd -cvpf /backup/etc-backup-$(date +%Y%m%d).tar.zst /etc
```

Compression comparison:

| Method | Speed | Ratio | Flag |
|--------|-------|-------|------|
| gzip | Fast | Good | -z |
| bzip2 | Medium | Better | -j |
| xz | Slow | Best | -J |
| zstd | Fast | Better | -I zstd |

## Backup with Rotation Script

```bash
#!/bin/bash
# /usr/local/bin/backup-rotate.sh
# Backup with automatic rotation

BACKUP_DIR="/backup"
MAX_DAILY=7
MAX_WEEKLY=4
MAX_MONTHLY=6
DATE=$(date +%Y%m%d)
DOW=$(date +%u)  # Day of week
DOM=$(date +%d)  # Day of month

# Determine backup type
if [ "$DOM" = "01" ]; then
    TYPE="monthly"
    MAX=$MAX_MONTHLY
elif [ "$DOW" = "7" ]; then
    TYPE="weekly"
    MAX=$MAX_WEEKLY
else
    TYPE="daily"
    MAX=$MAX_DAILY
fi

DEST_DIR="$BACKUP_DIR/$TYPE"
mkdir -p "$DEST_DIR"

# Create the backup
ARCHIVE="$DEST_DIR/backup-${DATE}.tar.gz"
echo "Creating $TYPE backup: $ARCHIVE"

sudo tar -czpf "$ARCHIVE" \
    --exclude='/proc' \
    --exclude='/sys' \
    --exclude='/dev' \
    --exclude='/run' \
    --exclude='/tmp' \
    --exclude='/backup' \
    /etc /home /var/www /opt 2>/dev/null

# Rotate old backups
# Count existing backups of this type
COUNT=$(ls -1 "$DEST_DIR"/backup-*.tar.gz 2>/dev/null | wc -l)
if [ "$COUNT" -gt "$MAX" ]; then
    # Remove oldest backups
    REMOVE=$((COUNT - MAX))
    ls -1t "$DEST_DIR"/backup-*.tar.gz | tail -n "$REMOVE" | xargs rm -f
    echo "Removed $REMOVE old $TYPE backups"
fi

echo "Backup complete. Size: $(du -sh "$ARCHIVE" | cut -f1)"
```

## Listing and Verifying Archives

```bash
# List contents of an archive without extracting
tar -tzvf /backup/etc-backup-20260304.tar.gz

# List only the top-level directories
tar -tzvf /backup/etc-backup-20260304.tar.gz | head -20

# Verify archive integrity
gzip -t /backup/etc-backup-20260304.tar.gz && echo "Archive OK" || echo "Archive CORRUPT"

# Check archive with tar
tar -tzvf /backup/etc-backup-20260304.tar.gz > /dev/null && echo "Archive OK"
```

## Restoring from Backup

```bash
# Restore everything to the original location
sudo tar -xzvpf /backup/system-backup-20260304.tar.gz -C /

# Restore to a different directory (for review before overwriting)
sudo tar -xzvpf /backup/system-backup-20260304.tar.gz -C /tmp/restore/

# Restore a specific file
sudo tar -xzvpf /backup/etc-backup-20260304.tar.gz -C / etc/ssh/sshd_config

# Restore a specific directory
sudo tar -xzvpf /backup/system-backup-20260304.tar.gz -C /tmp/restore/ home/jdoe/
```

## Splitting Large Archives

For very large backups that need to fit on limited media:

```bash
# Create a split archive (1GB chunks)
sudo tar -czpf - /home | split -b 1G - /backup/home-backup-

# Restore from split archive
cat /backup/home-backup-* | tar -xzpf - -C /
```

## Scheduling with Cron

```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-rotate.sh >> /var/log/backup.log 2>&1
```

## Wrapping Up

tar and gzip are not the most sophisticated backup tools, but they are the most reliable and portable. Every Linux system has them, every sysadmin knows them, and the archives they produce will be readable decades from now. For simple backup needs (snapshot a directory, create a recoverable system image, archive old data), tar is often the right choice. For anything more complex (incremental backups, deduplication, remote replication), consider rsync or rdiff-backup.
