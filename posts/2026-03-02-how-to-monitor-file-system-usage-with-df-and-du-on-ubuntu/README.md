# How to Monitor File System Usage with df and du on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, System Administration, Linux, Disk Management

Description: Learn how to use df and du on Ubuntu to monitor filesystem disk usage, find large files and directories, and set up disk space alerts before storage problems cause outages.

---

Running out of disk space causes some of the most abrupt and unpleasant failures in Linux administration. Databases stop accepting writes, log files stop rotating, package upgrades fail, and sometimes systems stop booting entirely. `df` and `du` are the two core tools for monitoring and diagnosing disk usage, and knowing how to use them effectively prevents most of these situations.

## df - Disk Free Space

`df` shows how much space is available on each mounted filesystem.

### Basic Usage

```bash
# Show all filesystems in human-readable format
df -h
```

Output:

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        50G   32G   16G  68% /
tmpfs           7.8G  1.2M  7.8G   1% /dev/shm
/dev/sda2       100G   78G   22G  79% /data
/dev/nvme0n1p1  500G  420G   80G  84% /backup
```

Key columns:
- `Size` - Total filesystem capacity
- `Used` - Space currently used
- `Avail` - Space available for use
- `Use%` - Usage percentage
- `Mounted on` - Mount point

### Show All Filesystems Including Virtual

```bash
# Include pseudo-filesystems like tmpfs
df -ha

# Show only real storage devices (exclude tmpfs, devtmpfs, etc.)
df -hx tmpfs -x devtmpfs -x squashfs
```

### Show Inode Usage

Filesystems can run out of inodes before running out of space. This happens when a directory contains millions of small files:

```bash
# Show inode usage
df -i

# Human-readable inode stats
df -ih
```

Output:

```
Filesystem      Inodes IUsed IFree IUse% Mounted on
/dev/sda1        3.2M   980K  2.3M   30% /
/dev/sda2        6.5M   6.5M     0  100% /var/mail
```

A filesystem at 100% inode usage cannot create new files even if space is available. This frequently happens with mail spools or session directories.

### Show Specific Filesystem

```bash
# Show only the filesystem containing /var
df -h /var

# Show a specific device
df -h /dev/sda1
```

### Show Filesystem Type

```bash
df -hT
```

This adds a `Type` column showing `ext4`, `xfs`, `btrfs`, `tmpfs`, etc.

## du - Disk Usage

`du` walks a directory tree and reports how much space each directory consumes.

### Basic Usage

```bash
# Total size of a directory
du -sh /var/log

# Size of each immediate subdirectory
du -h --max-depth=1 /var

# Equivalent shorthand
du -h -d 1 /var
```

### Finding the Largest Directories

```bash
# Show top 20 largest directories under /
du -h --max-depth=2 / 2>/dev/null | sort -rh | head -20

# Find large directories under /var specifically
du -h --max-depth=3 /var 2>/dev/null | sort -rh | head -20
```

### Finding Large Files

```bash
# Find files larger than 1GB
find / -type f -size +1G 2>/dev/null

# Find files larger than 100MB, show size, sort by size
find /var -type f -size +100M 2>/dev/null -exec du -h {} \; | sort -rh | head -20
```

### Excluding Mount Points

When checking disk usage on `/`, you usually don't want to traverse other mounted filesystems:

```bash
# Don't cross filesystem boundaries
du -h --max-depth=2 -x / 2>/dev/null | sort -rh | head -20
```

The `-x` or `--one-file-system` flag prevents du from descending into other mounted filesystems.

## Common Disk Space Investigations

### Why is / Almost Full?

```bash
# Step 1: Find the biggest top-level directories
sudo du -h --max-depth=1 -x / 2>/dev/null | sort -rh | head -10

# Step 2: Drill into the biggest one (e.g., /var)
sudo du -h --max-depth=2 /var 2>/dev/null | sort -rh | head -10

# Step 3: Find specific large files
sudo find /var/log -type f -size +50M 2>/dev/null -exec ls -lh {} \;
```

### Large Log Files

```bash
# Check log directory
du -sh /var/log/*

# Find logs not being rotated properly
find /var/log -name "*.log" -size +100M

# Compressed logs taking space
find /var/log -name "*.gz" | xargs du -sh | sort -rh | head -20
```

### Docker Disk Usage

Docker images and containers frequently consume large amounts of space:

```bash
# Docker's own disk usage summary
docker system df

# Detailed breakdown
docker system df -v

# Clean up unused resources
docker system prune -a
```

### Package Manager Cache

```bash
# APT cache size
du -sh /var/cache/apt/archives/

# Clean the cache
sudo apt clean
```

### Core Dumps

```bash
# Find core dump files
find / -name "core" -o -name "core.*" 2>/dev/null | xargs du -sh

# Check systemd coredump storage
du -sh /var/lib/systemd/coredump/
sudo journalctl --list-boots | xargs -I{} sudo journalctl -b {} | grep coredump
```

## Disk Space Alerting

### Simple Bash Alert Script

```bash
#!/bin/bash
# disk-alert.sh - send alert if any filesystem exceeds threshold

THRESHOLD=85
ALERT_EMAIL="admin@example.com"

df -h | awk 'NR>1 && $5+0 > '"$THRESHOLD"' {
    print "ALERT: " $6 " is at " $5 " usage (" $3 " used of " $2 ")"
}' | while read line; do
    echo "$line"
    echo "$line" | mail -s "Disk Space Alert on $(hostname)" "$ALERT_EMAIL"
done
```

Add to cron to run hourly:

```bash
crontab -e
# Add:
0 * * * * /usr/local/bin/disk-alert.sh
```

### Using ncdu for Interactive Navigation

For interactive directory browsing:

```bash
sudo apt install ncdu -y

# Scan root filesystem interactively
sudo ncdu -x /
```

`ncdu` provides a visual, navigable view of disk usage - far more convenient than repeated `du` commands when you're exploring an unfamiliar system.

## Monitoring Inode Usage

Set up inode monitoring alongside space monitoring:

```bash
#!/bin/bash
# inode-alert.sh

THRESHOLD=80

df -i | awk 'NR>1 && $5 != "-" {
    gsub(/%/, "", $5)
    if ($5+0 > '"$THRESHOLD"') {
        print "INODE ALERT: " $6 " at " $5 "% inode usage"
    }
}'
```

## Understanding the Reserve Space

By default, ext4 reserves 5% of capacity for root. This is why `df` shows less usable space than the total size suggests:

```bash
# Check reserved blocks
sudo tune2fs -l /dev/sda1 | grep "Reserved block"

# Reduce reserve to 1% for non-root data partitions
sudo tune2fs -m 1 /dev/sda2
```

## Checking Disk Usage in Containers

Within Docker containers:

```bash
# Check each container's overlay filesystem size
docker ps -s

# Per-container disk usage
docker inspect $(docker ps -q) | python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data:
    print(c['Name'], c.get('SizeRootFs', 'N/A'))
"
```

## Quick Reference

```bash
# How full is each filesystem?
df -h

# What's taking up space in /var?
du -h --max-depth=2 /var | sort -rh | head -15

# What's the single largest directory?
du -sx /* 2>/dev/null | sort -rn | head -5

# Find files modified in last 24h over 50MB
find / -mtime -1 -size +50M -type f 2>/dev/null

# Show inode usage
df -ih
```

Running `df -h` takes a second and can prevent hours of emergency firefighting. Make it part of your regular system checks, and automate alerts before filesystems hit the point where services start failing.
