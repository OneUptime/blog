# How to Find and Delete Large Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, Linux, System Administration, Storage

Description: Identify and safely remove large files consuming disk space on Ubuntu using command-line tools, with strategies for logs, temp files, old kernels, and unused packages.

---

Disks fill up gradually until they don't and your applications start failing. The trick to efficient disk cleanup is identifying what's actually taking space before deleting anything. Disk usage rarely distributes the way you'd expect, and the biggest files are often in locations you'd never look manually.

## Quick Overview of What's Using Space

Start with a high-level view before drilling down:

```bash
# Check overall disk usage on all partitions
df -h

# Find the top-level directories consuming the most space
# Excludes mounted filesystems (network shares, external drives)
sudo du -h --max-depth=1 --exclude-from=<(findmnt -n -o TARGET | grep -v "^/$") /
# Or the simpler version:
sudo du -sh /* 2>/dev/null | sort -rh | head -20

# Focus on the directories most likely to have runaway growth
sudo du -sh /var/* 2>/dev/null | sort -rh | head -10
sudo du -sh /home/* 2>/dev/null | sort -rh | head -10
sudo du -sh /tmp /var/tmp 2>/dev/null | sort -rh
```

## Finding Large Files

```bash
# Find the 20 largest files on the entire system
# Excludes /proc and /sys which contain virtual files
sudo find / -type f -printf "%s %p\n" \
  -not -path "/proc/*" \
  -not -path "/sys/*" \
  -not -path "/dev/*" \
  2>/dev/null | \
  sort -rn | \
  head -20 | \
  awk '{printf "%s\t%s\n", $1/1024/1024 " MB", $2}'

# Simpler: find files over 100MB
sudo find / -type f -size +100M \
  -not -path "/proc/*" \
  -not -path "/sys/*" \
  2>/dev/null \
  -exec ls -lh {} \; | \
  sort -k5 -rh | \
  head -30

# Find files over 1GB
sudo find / -type f -size +1G \
  -not -path "/proc/*" \
  -not -path "/sys/*" \
  2>/dev/null

# Find large files in a specific directory tree
sudo find /var -type f -size +50M -exec ls -lh {} \;

# Find files not accessed in 30+ days (candidates for archival or deletion)
sudo find /home -type f -atime +30 -size +100M 2>/dev/null
```

## Using ncdu for Interactive Exploration

`ncdu` (NCurses Disk Usage) is the most efficient tool for interactively finding what's using space:

```bash
# Install ncdu
sudo apt install -y ncdu

# Analyze the root filesystem (excludes other mounts)
sudo ncdu /

# Analyze a specific directory
ncdu /home/username/
ncdu /var/

# Navigate with arrow keys, enter to drill down
# 'd' to delete the selected item (be careful!)
# 'q' to quit
```

## Cleaning Up Specific Common Culprits

### Log Files

```bash
# Find large log files
sudo find /var/log -type f -name "*.log" -size +100M | \
  xargs ls -lh | sort -k5 -rh

# Truncate a log file safely (preserves the file, applications can still write to it)
sudo truncate -s 0 /var/log/large-application.log

# For compressed old logs, just delete them
sudo find /var/log -type f -name "*.gz" -mtime +30 -delete
sudo find /var/log -type f -name "*.1" -mtime +30 -delete

# Clean up specific application logs
sudo find /var/log/nginx -name "*.log.*" -mtime +14 -delete
sudo find /var/log/apache2 -name "*.log.*" -mtime +14 -delete
```

### Temporary Files

```bash
# Check /tmp and /var/tmp usage
du -sh /tmp /var/tmp

# Delete files in /tmp older than 7 days
sudo find /tmp -type f -mtime +7 -delete
sudo find /tmp -type d -empty -mtime +7 -delete

# /var/tmp is for files that persist across reboots
# Clean files older than 30 days
sudo find /var/tmp -type f -mtime +30 -delete

# Some applications leave temp files in /var/cache
sudo du -sh /var/cache/*/  | sort -rh | head -10
```

### Old Linux Kernels

Ubuntu keeps old kernel packages by default. Over time these accumulate:

```bash
# List installed kernel packages
dpkg --list | grep -E "linux-(image|headers|modules)" | grep -v $(uname -r)

# Check current kernel
uname -r

# See how many kernels are installed and their sizes
dpkg --list | grep "linux-image" | awk '{print $2}' | \
  xargs -I{} dpkg-query -Wf '${Package}\t${Installed-Size}\n' {} | \
  sort -k2 -rn | \
  awk '{printf "%s\t%s MB\n", $1, $2/1024}'

# Remove old kernels automatically with apt
sudo apt autoremove --purge

# This is usually safe - apt will NOT remove the currently running kernel
# It removes kernels that are not the current one and not needed by any other package
```

### Docker and Container Data

```bash
# Docker can accumulate a lot of data
sudo docker system df

# Remove all stopped containers, unused networks, dangling images, build cache
sudo docker system prune

# More aggressive: also remove unused volumes and all unused images
sudo docker system prune -a --volumes

# List large Docker volumes
sudo docker volume ls -q | \
  xargs docker volume inspect | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for v in data:
    print(v['Name'], v.get('Mountpoint',''))
"
```

### APT Package Cache

```bash
# Check apt cache size
du -sh /var/cache/apt/archives/

# Clean old downloaded packages
sudo apt clean

# Or remove only packages no longer needed for installation
sudo apt autoclean

# Remove orphaned packages
sudo apt autoremove --purge
```

## Finding Files Deleted but Still Open

A common situation: a large log file is deleted, but a process still has it open, so the disk space isn't actually freed yet. The file still shows up in `/proc/<pid>/fd` but not in the filesystem:

```bash
# Find deleted files that are still open by processes
sudo lsof | grep "(deleted)"

# Filter for large deleted-but-open files
sudo lsof | grep "(deleted)" | \
  awk '{printf "%s\t%s\t%s\t%s\n", $1, $2, $7, $9}' | \
  sort -k3 -rn | \
  head -20

# The fix: either restart the process holding the file open,
# or truncate it through the /proc filesystem
# PID is column 2 from lsof output, FD is column 4
# Find the file descriptor for the deleted file
sudo ls -la /proc/<PID>/fd/ | grep deleted

# Truncate through proc to free space without killing the process
sudo truncate -s 0 /proc/<PID>/fd/<FD>
```

## Creating a Disk Usage Report

```bash
#!/bin/bash
# /usr/local/bin/disk-report.sh - Generate a disk usage report

echo "=== Disk Usage Report - $(date) ==="
echo ""

echo "--- Filesystem Usage ---"
df -h | grep -v tmpfs | grep -v udev

echo ""
echo "--- Top 10 Largest Directories under / ---"
sudo du -sh /* 2>/dev/null | sort -rh | head -10

echo ""
echo "--- Files over 500MB ---"
sudo find / -type f -size +500M \
  -not -path "/proc/*" -not -path "/sys/*" \
  2>/dev/null \
  -exec ls -lh {} \; | sort -k5 -rh

echo ""
echo "--- APT Cache Size ---"
du -sh /var/cache/apt/archives/

echo ""
echo "--- Journal Size ---"
journalctl --disk-usage

echo ""
echo "--- Snap Revisions ---"
snap list --all | grep disabled | wc -l
echo " disabled snap revisions"
```

Run this script to get a complete picture before starting cleanup. Knowing what's actually large before deleting anything prevents accidentally removing files that need to stay.
