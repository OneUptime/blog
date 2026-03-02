# How to Use the tar Command for Archiving and Compression on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, tar, Archiving, Shell

Description: Learn how to use the tar command on Ubuntu to create archives, compress files with gzip and bzip2, extract archives, and automate backup workflows.

---

`tar` (tape archive) combines files and directories into a single archive file, optionally compressing it. It's the standard tool for packaging, backups, and transferring directory structures on Linux. On Ubuntu, GNU tar is installed by default and handles everything from simple file archiving to multi-volume backups.

Understanding tar's option syntax and combining it with compression tools is a fundamental skill for any Ubuntu administrator.

## Basic Syntax

```bash
tar [mode] [options] [archive] [files]
```

The mode (operation) comes first:
- `c` - Create a new archive
- `x` - Extract files from an archive
- `t` - List archive contents
- `r` - Append files to an existing archive
- `u` - Update: only add files newer than those in archive

Modern tar accepts modes without the leading `-`:
```bash
tar cvf archive.tar files/  # Old style with leading letter
tar -cvf archive.tar files/ # Also valid
```

## Creating Archives

### Basic Archive (No Compression)

```bash
# Create an archive of a directory
tar cf backup.tar /var/www/html/

# With verbose output (shows files being added)
tar cvf backup.tar /var/www/html/

# Archive multiple directories/files
tar cvf backup.tar /etc/nginx /var/www /home/deploy
```

The `.tar` extension alone indicates no compression - just a single file combining the contents.

### Creating Compressed Archives

```bash
# With gzip compression (fastest, most compatible)
tar czf backup.tar.gz /var/www/html/
# Or equivalently:
tar czvf backup.tar.gz /var/www/html/

# With bzip2 compression (better compression, slower)
tar cjf backup.tar.bz2 /var/www/html/

# With xz compression (best compression ratio, slowest)
tar cJf backup.tar.xz /var/www/html/

# Let tar choose based on file extension (GNU tar feature)
tar caf backup.tar.gz /var/www/html/  # -a: auto-detect by extension
tar caf backup.tar.bz2 /var/www/html/
```

Common extension conventions:
- `.tar` - uncompressed archive
- `.tar.gz` or `.tgz` - gzip compressed
- `.tar.bz2` or `.tbz2` - bzip2 compressed
- `.tar.xz` - xz compressed
- `.tar.zst` - zstd compressed

### Excluding Files and Directories

```bash
# Exclude a specific directory
tar czf backup.tar.gz /var/www/ --exclude="/var/www/html/cache"

# Exclude by pattern
tar czf backup.tar.gz /home/user/ \
    --exclude="*.log" \
    --exclude="node_modules" \
    --exclude=".git"

# Exclude patterns from a file
cat > /tmp/exclude-list.txt << 'EOF'
*.log
*.tmp
node_modules
.git
__pycache__
EOF

tar czf backup.tar.gz /var/www/ --exclude-from=/tmp/exclude-list.txt
```

## Extracting Archives

### Extract Everything

```bash
# Extract to current directory
tar xf archive.tar.gz

# Extract with verbose output (shows filenames as extracted)
tar xvf archive.tar.gz

# Extract to a specific directory
tar xf archive.tar.gz -C /tmp/restore/

# Create destination directory if needed
mkdir -p /tmp/restore && tar xf archive.tar.gz -C /tmp/restore/
```

### Extract Specific Files

```bash
# Extract a single file from an archive
tar xf archive.tar.gz var/www/html/index.html

# Extract a directory from an archive
tar xf archive.tar.gz var/www/html/

# Extract using a wildcard (requires --wildcards)
tar xf archive.tar.gz --wildcards "*.conf"

# Show what would be extracted without actually extracting (dry run)
tar tf archive.tar.gz  # List contents only
```

## Listing Archive Contents

```bash
# List files in an archive
tar tf archive.tar.gz

# List with detailed information (permissions, size, date)
tar tvf archive.tar.gz

# List and search for a specific file
tar tf archive.tar.gz | grep "sshd_config"

# Check if a file exists in an archive
tar tf archive.tar.gz | grep -q "etc/nginx/nginx.conf" && echo "Found"
```

## Handling Absolute Paths

By default, tar strips the leading `/` from absolute paths to prevent overwriting system files on extraction:

```bash
# Create archive with absolute path
tar czf backup.tar.gz /etc/nginx/

# Extract - the leading / is stripped by default
# Files go to: ./etc/nginx/ in the current directory
tar xf backup.tar.gz

# To restore to original absolute path:
tar xf backup.tar.gz -C /

# Force absolute paths (dangerous - can overwrite system files!)
tar czf backup.tar.gz -P /etc/nginx/  # -P preserves absolute paths
```

## Incremental Backups

GNU tar supports incremental backups using a snapshot file:

```bash
# Level 0: Full backup with snapshot
tar czf /backups/full-$(date +%Y%m%d).tar.gz \
    --listed-incremental=/var/lib/backup/snapshot.snar \
    /var/www/

# Level 1: Incremental backup (only files changed since full backup)
tar czf /backups/incr-$(date +%Y%m%d-%H%M).tar.gz \
    --listed-incremental=/var/lib/backup/snapshot.snar \
    /var/www/
```

To restore from incremental backups, restore in order: full backup first, then each incremental in sequence.

## Splitting Large Archives

For archives that need to fit on size-limited media or be transferred in chunks:

```bash
# Split into 500MB chunks
tar czf - /var/www/ | split -b 500M - backup.tar.gz.part

# List the parts
ls backup.tar.gz.part*

# Reassemble and extract
cat backup.tar.gz.part* | tar xzf -
```

## Adding and Updating Files

```bash
# Append files to an existing (uncompressed) archive
tar rf archive.tar newfile.txt

# Update: add files only if they're newer than what's in the archive
tar uf archive.tar modified-file.txt

# Note: -r and -u don't work with compressed archives
# You must decompress first, then update, then recompress
```

## Viewing Progress

For large archives, progress feedback is helpful:

```bash
# Use pv (pipe viewer) to show progress
# Install: apt install pv

# Show progress when creating
tar czf - /large/directory/ | pv > backup.tar.gz

# Show progress when extracting
pv backup.tar.gz | tar xzf - -C /restore/

# Simple progress with verbose output piped to wc
tar czf backup.tar.gz /var/www/ -v 2>&1 | wc -l
```

## Verifying Archive Integrity

```bash
# Test integrity - extract to /dev/null and check exit code
tar tzf backup.tar.gz > /dev/null && echo "Archive OK" || echo "Archive CORRUPT"

# Verbose test (shows files being verified)
tar tvzf backup.tar.gz > /dev/null

# More thorough: compare archive with original
tar df backup.tar.gz  # Shows differences between archive and filesystem
```

## Practical Backup Script

A complete backup script using tar:

```bash
#!/bin/bash
# website-backup.sh - Creates compressed, versioned website backups

set -euo pipefail

SITE_DIR="/var/www/mysite"
BACKUP_DIR="/mnt/backups/mysite"
DATE=$(date +%Y%m%d)
TIME=$(date +%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mysite-${DATE}-${TIME}.tar.gz"
KEEP_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_FILE"

# Create the archive
tar czf "$BACKUP_FILE" \
    --exclude="$SITE_DIR/cache" \
    --exclude="$SITE_DIR/tmp" \
    --exclude="$SITE_DIR/.git" \
    --exclude="*.log" \
    "$SITE_DIR"

# Get archive size
SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)

# Verify the archive
if tar tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "Backup verified: $BACKUP_FILE ($SIZE)"
else
    echo "ERROR: Backup verification failed!" >&2
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Remove old backups
echo "Removing backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +"$KEEP_DAYS" -delete

# Report
echo "Current backups:"
ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null | awk '{print $5, $9}'
echo "Backup complete"
```

## Quick Reference

Common tar operations at a glance:

```bash
# Create
tar czf archive.tar.gz dir/          # gzip compressed
tar cjf archive.tar.bz2 dir/         # bzip2 compressed

# Extract
tar xzf archive.tar.gz               # Extract gzip
tar xzf archive.tar.gz -C /dest/     # Extract to directory
tar xzf archive.tar.gz path/to/file  # Extract specific file

# List
tar tzf archive.tar.gz               # List gzip archive
tar tvzf archive.tar.gz              # List with details

# Test
tar tzf archive.tar.gz > /dev/null   # Verify integrity
```

The `-f` option specifying the archive file must come last among the option letters because it takes a filename argument. This is why you see `czf` with the `f` at the end, not `fcz`.
