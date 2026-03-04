# How to Use rsync for Incremental Backups on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, rsync, Backup, Incremental, System Administration, Linux

Description: Use rsync to perform efficient incremental backups on RHEL, transferring only changed files to save time and storage.

---

rsync is a fast file-copying utility that supports incremental transfers. It only copies files that have changed since the last sync, making it ideal for daily backups on RHEL systems.

## Basic rsync Backup

Create a mirror of a directory:

```bash
# Sync /etc to a backup location, preserving attributes
rsync -avz --delete /etc/ /backup/etc-backup/
```

Flags explained:
- `-a` archive mode (preserves permissions, ownership, timestamps, symlinks)
- `-v` verbose output
- `-z` compress data during transfer
- `--delete` remove files from destination that no longer exist in source

## Incremental Backups with Hard Links

Use hard links to create space-efficient daily snapshots. Each backup appears as a full copy, but unchanged files are hard-linked to the previous backup:

```bash
#!/bin/bash
# /usr/local/bin/incremental-backup.sh
# Creates daily snapshots using rsync and hard links

SOURCE="/home"
BACKUP_BASE="/backup/home-snapshots"
DATE=$(date +%Y-%m-%d)
LATEST="${BACKUP_BASE}/latest"
CURRENT="${BACKUP_BASE}/${DATE}"

# Create backup using hard links to the previous snapshot
rsync -avz --delete \
  --link-dest="${LATEST}" \
  "${SOURCE}/" \
  "${CURRENT}/"

# Update the 'latest' symlink to point to today's backup
rm -f "${LATEST}"
ln -s "${CURRENT}" "${LATEST}"

echo "Incremental backup completed: ${CURRENT}"
```

The `--link-dest` flag tells rsync to hard-link unchanged files from the specified directory, saving disk space.

## Excluding Files from Backup

Create an exclusion list for files you do not need to back up:

```bash
# Create an exclude file
cat > /etc/rsync-exclude.txt << 'EXCL'
*.tmp
*.cache
.Trash-*
/proc
/sys
/dev
/run
/tmp
EXCL

# Use the exclude file in rsync
rsync -avz --delete \
  --exclude-from=/etc/rsync-exclude.txt \
  / /backup/system-backup/
```

## Checking What Would Change (Dry Run)

Before running a large backup, preview what rsync will do:

```bash
# Dry run to see what would be transferred
rsync -avzn --delete /home/ /backup/home-backup/
```

The `-n` (or `--dry-run`) flag shows what would be copied without actually transferring anything. This is helpful for verifying your exclude lists and source paths before committing to a full sync.
