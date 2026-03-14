# How to Create Full System Backups with tar on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Backup, Tar, System Administration, Disaster Recovery, Linux

Description: Use tar to create full system backups on RHEL, including how to properly exclude virtual filesystems and restore from backup archives.

---

The tar (tape archive) utility is a reliable tool for creating full system backups on RHEL. It is included by default and can compress entire filesystems into a single archive file.

## Creating a Full System Backup

Back up the entire root filesystem while excluding virtual filesystems and the backup destination:

```bash
# Create a full system backup with gzip compression
# Exclude virtual filesystems, temporary files, and the backup destination
sudo tar czpf /backup/full-backup-$(date +%Y%m%d).tar.gz \
  --exclude=/proc \
  --exclude=/sys \
  --exclude=/dev \
  --exclude=/run \
  --exclude=/tmp \
  --exclude=/mnt \
  --exclude=/media \
  --exclude=/backup \
  --exclude=/var/tmp \
  --exclude=/lost+found \
  --one-file-system \
  /
```

Key flags explained:
- `c` creates a new archive
- `z` compresses with gzip
- `p` preserves file permissions
- `f` specifies the output file
- `--one-file-system` prevents crossing filesystem boundaries

## Using xz Compression for Smaller Archives

For better compression at the cost of speed:

```bash
# Use xz compression for a smaller backup file
sudo tar cJpf /backup/full-backup-$(date +%Y%m%d).tar.xz \
  --exclude=/proc \
  --exclude=/sys \
  --exclude=/dev \
  --exclude=/run \
  --exclude=/tmp \
  --exclude=/backup \
  /
```

## Listing Archive Contents

Verify what is inside the backup without extracting:

```bash
# List the contents of a gzip-compressed backup
tar tzf /backup/full-backup-20260304.tar.gz | head -50

# Get a detailed listing with permissions and sizes
tar tzvf /backup/full-backup-20260304.tar.gz | head -20
```

## Restoring from a tar Backup

To restore the full system, boot from rescue media and extract:

```bash
# Mount the target root filesystem
mount /dev/sda2 /mnt

# Extract the backup to the mounted filesystem
sudo tar xzpf /backup/full-backup-20260304.tar.gz -C /mnt

# Recreate excluded directories
mkdir -p /mnt/{proc,sys,dev,run,tmp,mnt,media}

# Reinstall the bootloader
chroot /mnt grub2-install /dev/sda
chroot /mnt grub2-mkconfig -o /boot/grub2/grub.cfg
```

## Automating with a Backup Script

```bash
#!/bin/bash
# /usr/local/bin/full-backup.sh
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d)
LOGFILE="/var/log/backup-${DATE}.log"

echo "Starting full backup at $(date)" | tee "$LOGFILE"
tar czpf "${BACKUP_DIR}/full-backup-${DATE}.tar.gz" \
  --exclude=/proc --exclude=/sys --exclude=/dev \
  --exclude=/run --exclude=/tmp --exclude=/backup \
  / 2>> "$LOGFILE"
echo "Backup completed at $(date)" | tee -a "$LOGFILE"
```
