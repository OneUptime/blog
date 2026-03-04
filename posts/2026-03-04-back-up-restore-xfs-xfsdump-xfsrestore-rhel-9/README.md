# How to Back Up and Restore XFS File Systems Using xfsdump and xfsrestore on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, xfsdump, xfsrestore, Backups, Storage, Linux

Description: Learn how to use xfsdump and xfsrestore on RHEL to create full and incremental backups of XFS file systems and restore them reliably.

---

The `xfsdump` and `xfsrestore` utilities are purpose-built tools for backing up and restoring XFS filesystems. Unlike generic backup tools, they understand XFS metadata such as extended attributes and are optimized for XFS's internal structure. This guide covers how to use these tools effectively on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- XFS filesystems to back up
- Sufficient storage for backup files
- The `xfsdump` package installed

```bash
sudo dnf install xfsdump -y
```

## Understanding xfsdump Dump Levels

`xfsdump` supports incremental backups through dump levels (0-9):

- **Level 0**: Full backup of the entire filesystem
- **Levels 1-9**: Incremental backup of files changed since the last lower-level dump

For example:
- Level 0 on Monday (full backup)
- Level 1 on Tuesday (changes since level 0)
- Level 2 on Wednesday (changes since level 1)
- Level 1 on Thursday (changes since level 0, capturing Tuesday and Wednesday changes)

## Step 1: Create a Full Backup (Level 0)

Back up the entire filesystem:

```bash
sudo xfsdump -l 0 -f /backup/data_full.dump /data
```

Parameters:
- `-l 0`: Dump level 0 (full backup)
- `-f /backup/data_full.dump`: Output file path
- `/data`: Mount point of the filesystem to back up

The tool will prompt for a session label and media label. To run non-interactively:

```bash
sudo xfsdump -l 0 -L "data_full_20260304" -M "backup_media" -f /backup/data_full.dump /data
```

## Step 2: Create an Incremental Backup

After a full backup, create incremental backups:

```bash
# Level 1 - changes since level 0
sudo xfsdump -l 1 -L "data_incr_20260305" -M "backup_media" -f /backup/data_incr_1.dump /data

# Level 2 - changes since level 1
sudo xfsdump -l 2 -L "data_incr_20260306" -M "backup_media" -f /backup/data_incr_2.dump /data
```

## Step 3: Back Up to Multiple Files

For large filesystems, split the backup across multiple files:

```bash
sudo xfsdump -l 0 -L "data_full" -M "media1" -M "media2" \
  -f /backup/data_part1.dump -f /backup/data_part2.dump /data
```

## Step 4: Back Up to a Remote System

Pipe the backup through SSH to a remote server:

```bash
sudo xfsdump -l 0 -L "data_full" -M "remote" -f - /data | \
  ssh user@backup-server "cat > /backups/data_full.dump"
```

## Step 5: Back Up a Subdirectory

To back up only a specific subdirectory:

```bash
sudo xfsdump -l 0 -s path/to/subdir -L "subdir_backup" -M "media" -f /backup/subdir.dump /data
```

The `-s` path is relative to the filesystem mount point.

## Step 6: View Backup Inventory

`xfsdump` maintains an inventory of all backups in `/var/lib/xfsdump/inventory/`. View it with:

```bash
sudo xfsdump -I
```

This shows all backup sessions, their levels, dates, and the filesystem they belong to.

## Restoring from Backups

### Full Restore

Restore a complete backup to the original location:

```bash
sudo xfsrestore -f /backup/data_full.dump /data
```

### Restore to a Different Location

```bash
sudo mkdir -p /restore
sudo xfsrestore -f /backup/data_full.dump /restore
```

### Restore with Incremental Backups

Restore in order: first the full backup, then each incremental:

```bash
# Restore level 0 (full)
sudo xfsrestore -f /backup/data_full.dump /data

# Restore level 1 (incremental)
sudo xfsrestore -f /backup/data_incr_1.dump /data

# Restore level 2 (incremental)
sudo xfsrestore -f /backup/data_incr_2.dump /data
```

### Restore Specific Files

Use interactive mode to select files:

```bash
sudo xfsrestore -f /backup/data_full.dump -i /data
```

In the interactive prompt:

```bash
xfsrestore > ls
xfsrestore > cd important_dir
xfsrestore > add file1.txt
xfsrestore > add file2.txt
xfsrestore > extract
```

### Restore a Single File Non-Interactively

```bash
sudo xfsrestore -f /backup/data_full.dump -s path/to/file.txt /data
```

### Restore from Remote Backup

```bash
ssh user@backup-server "cat /backups/data_full.dump" | \
  sudo xfsrestore -f - /data
```

## Step 7: Verify Backups

List the contents of a backup without restoring:

```bash
sudo xfsrestore -f /backup/data_full.dump -t 2>&1 | head -50
```

The `-t` flag lists the table of contents.

## Automating Backups with a Script

Create a backup script for scheduled runs:

```bash
sudo tee /usr/local/bin/xfs-backup.sh << 'SCRIPT'
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup"
FILESYSTEM="/data"
DOW=$(date +%u)

if [ "$DOW" -eq 1 ]; then
    LEVEL=0
    LABEL="full_${DATE}"
else
    LEVEL=1
    LABEL="incr_${DATE}"
fi

xfsdump -l $LEVEL -L "$LABEL" -M "auto" \
  -f "${BACKUP_DIR}/data_l${LEVEL}_${DATE}.dump" "$FILESYSTEM"

# Clean up backups older than 30 days
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete
SCRIPT
sudo chmod +x /usr/local/bin/xfs-backup.sh
```

Schedule it with cron:

```bash
echo '0 2 * * * root /usr/local/bin/xfs-backup.sh' | sudo tee /etc/cron.d/xfs-backup
```

## Best Practices

- **Always start restoration with the level 0 dump** before applying incrementals.
- **Test restores regularly** to verify backup integrity.
- **Store backups on separate storage** from the source filesystem.
- **Use compression** when backing up over the network (pipe through `gzip`).
- **Document your backup strategy** including dump levels and retention periods.

## Conclusion

`xfsdump` and `xfsrestore` provide a reliable, XFS-native backup and restore solution on RHEL. Their support for incremental backups, extended attributes, and interactive restoration makes them superior to generic tools for XFS filesystems. By implementing a regular backup schedule with appropriate dump levels, you can protect your data while minimizing backup storage requirements and backup windows.
