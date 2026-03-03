# How to Recover from a Full Root Partition on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Troubleshooting, Disk Management, System Recovery, Administration

Description: Recover an Ubuntu system when the root partition is 100% full, including emergency cleanup steps, identifying large files, and preventing future disk full incidents.

---

A full root partition is a crisis. When `/` hits 100% usage, the system becomes unpredictable - services crash, SSH logins fail, log writes fail, and package managers break. The situation looks dire but it's usually recoverable without data loss if you act methodically.

## Immediate Assessment

If you can still SSH in or access a console, start with a quick assessment:

```bash
# Check which filesystems are full
df -h

# Example output showing a full root partition:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        20G   20G     0 100% /
# tmpfs           2.0G  102M  1.9G   6% /dev/shm

# If you can't run df, check manually
cat /proc/mounts
```

If `df` itself hangs or fails, the system is severely impaired. Try to get to a root console.

## Emergency: Creating Immediate Space

You need to free a few megabytes immediately to make the system usable again.

### Clear the Journal Log

The systemd journal is often a large consumer and can be cleared safely:

```bash
# Check current journal size
journalctl --disk-usage

# Truncate journal immediately (keep only the last 100MB)
sudo journalctl --rotate
sudo journalctl --vacuum-size=100M

# Or by time (keep only last 1 day)
sudo journalctl --vacuum-time=1d
```

### Remove Cached Package Files

APT caches downloaded packages in `/var/cache/apt/archives`:

```bash
# Check the size of the package cache
du -sh /var/cache/apt/archives/

# Remove cached packages (safe - they can be re-downloaded)
sudo apt-get clean

# Also remove orphaned packages
sudo apt-get autoremove -y
```

### Remove Old Kernel Images

Old kernels accumulate over time and can take significant space:

```bash
# List installed kernels
dpkg --list | grep linux-image

# Your current kernel (don't remove this one)
uname -r

# Remove old kernels (keeping the current + 1 previous is safe)
# This command removes all but the current kernel
sudo apt-get autoremove --purge -y

# More aggressive: manually purge specific old kernel versions
sudo dpkg --purge linux-image-5.15.0-91-generic
sudo dpkg --purge linux-image-5.15.0-88-generic
```

### Clear Temporary Files

```bash
# Check /tmp size
du -sh /tmp

# Clear temp files (system processes will recreate what they need)
sudo find /tmp -type f -atime +1 -delete
sudo find /var/tmp -type f -atime +7 -delete
```

### Clear Thumbnail Caches

On desktop systems, thumbnail caches can become enormous:

```bash
# Clear user thumbnail caches
rm -rf ~/.cache/thumbnails/*

# For all users
sudo find /home -path '*/.cache/thumbnails' -exec rm -rf {} + 2>/dev/null
```

## Finding What's Using Disk Space

Once you have a few megabytes free, find the real culprit:

```bash
# Top-level breakdown of disk usage
sudo du -sh /* 2>/dev/null | sort -rh | head -20

# Drill into the largest directory
sudo du -sh /var/* 2>/dev/null | sort -rh | head -20

# Find the largest individual files on the entire system
sudo find / -xdev -type f -size +100M -exec ls -lh {} \; 2>/dev/null | sort -k5 -rh | head -20

# Alternative using ncdu (interactive, if installed)
sudo ncdu /
# Install if missing: sudo apt-get install ncdu
```

### Common Culprits and Their Fixes

**Log files that have grown unbounded:**

```bash
# Check for large log files
sudo find /var/log -type f -size +1G -ls 2>/dev/null

# Truncate a specific log file without breaking the process writing to it
sudo truncate -s 0 /var/log/application.log

# Never delete an open log file - truncate it instead
# Check what process has a log file open
sudo lsof /var/log/large-logfile.log

# Configure log rotation to prevent recurrence
sudo nano /etc/logrotate.d/myapp
```

Example logrotate configuration:

```text
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        systemctl reload myapp
    endscript
}
```

**Docker images and containers:**

```bash
# Check Docker's disk usage
sudo docker system df

# Remove stopped containers, unused images, unused networks
sudo docker system prune

# More aggressive: remove everything not in use
sudo docker system prune -a --volumes
```

**Core dump files:**

```bash
# Find core dumps
sudo find / -name "core" -o -name "core.[0-9]*" 2>/dev/null | head -20

# Check if coredumps are being collected
coredumpctl list

# Clean them
sudo coredumpctl clean
sudo journalctl --rotate && sudo journalctl --vacuum-time=1s
```

**MySQL/PostgreSQL data growth:**

```bash
# Check PostgreSQL database sizes
sudo -u postgres psql -c "\l+"

# Check for PostgreSQL bloat (tables needing VACUUM)
sudo -u postgres psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 20;"

# Run VACUUM to reclaim dead row space
sudo -u postgres psql -c "VACUUM FULL VERBOSE;"
```

## Fixing a Full Filesystem When Completely Unresponsive

If you cannot login or run commands due to the full disk, boot from a live USB or recovery mode:

```bash
# Boot into recovery mode: hold Shift during boot, select "Recovery mode"
# Then select "Drop to root shell prompt"

# Remount the root filesystem as read-write
mount -o remount,rw /

# Now perform cleanup as described above
apt-get clean
journalctl --vacuum-size=100M
find /tmp -type f -delete

# After freeing space, continue normally
```

## Resizing the Root Partition

If cleanup isn't enough, you need to grow the partition.

### With LVM (Most Common on Ubuntu Server)

If your root filesystem is on LVM, extending it online is straightforward:

```bash
# Check LVM structure
sudo lvs
sudo vgs

# If there's free space in the volume group, extend the logical volume
sudo lvextend -L +10G /dev/ubuntu-vg/ubuntu-lv

# Or use all available free space
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv

# Resize the filesystem to use the new space (online, no unmount needed)
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv

# Verify
df -h /
```

### Without LVM (Standard Partitioning)

Resizing without LVM requires resizing the partition, which typically requires a live environment:

```bash
# Boot from Ubuntu live USB
# Identify your disk
lsblk

# Use parted or gparted to resize
sudo parted /dev/sda
# (interactive) resizepart 1 30GB  # Resize partition 1 to 30GB end point

# Resize the filesystem
sudo e2fsck -f /dev/sda1
sudo resize2fs /dev/sda1
```

## Preventing Future Full Disk Incidents

### Set Up Monitoring

Monitor disk usage and alert before it becomes critical:

```bash
#!/bin/bash
# /usr/local/bin/disk-usage-check.sh
# Alert when disk usage exceeds threshold

THRESHOLD=80
CRITICAL=90

while IFS= read -r line; do
    usage=$(echo "$line" | awk '{print $5}' | tr -d '%')
    mount=$(echo "$line" | awk '{print $6}')

    if [ "$usage" -ge "$CRITICAL" ]; then
        echo "CRITICAL: $mount is ${usage}% full"
        # Send alert here
    elif [ "$usage" -ge "$THRESHOLD" ]; then
        echo "WARNING: $mount is ${usage}% full"
    fi
done < <(df -h --output=source,size,used,avail,pcent,target | tail -n+2)
```

```bash
# Add to cron - check every 15 minutes
echo "*/15 * * * * root /usr/local/bin/disk-usage-check.sh | logger -t disk-check" \
    | sudo tee /etc/cron.d/disk-usage-check
```

### Configure Logrotate

Ensure logrotate is configured for all applications:

```bash
# Check logrotate runs daily
systemctl status logrotate.timer

# Force a logrotate run to verify configs work
sudo logrotate -f /etc/logrotate.conf
```

### Reserve Space for Root

Ext4 reserves 5% of space for the root user by default. On large data partitions you can reduce this:

```bash
# View current reserved space (tune2fs)
sudo tune2fs -l /dev/sda1 | grep 'Reserved block'

# Reduce reserved space to 1% on a data partition (NOT on the root partition)
sudo tune2fs -m 1 /dev/sdb1
```

Keep the default 5% reservation on the root partition - it's what saves you when the disk fills up.

## Summary

A full root partition requires immediate action to create breathing room, then methodical investigation to find and fix the root cause. The recovery order is:

1. Clear journal logs and apt cache for quick wins
2. Find and truncate unbounded log files
3. Remove unused Docker images, kernels, and temp files
4. If still insufficient, grow the filesystem with LVM extension or partition resize

After recovery, add disk monitoring so you get an alert at 80% usage rather than discovering the problem at 100%.
