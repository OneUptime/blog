# How to Optimize Ubuntu for SSD Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, SSD, Storage, Performance, Optimization

Description: Optimize Ubuntu for SSD storage with TRIM configuration, appropriate I/O schedulers, and mount options for longevity and performance.

---

Solid State Drives (SSDs) have become the standard for modern computing, offering dramatically faster read and write speeds compared to traditional Hard Disk Drives (HDDs). However, SSDs operate fundamentally differently from HDDs, and Ubuntu's default configurations may not be optimized for SSD storage. This comprehensive guide will walk you through the essential optimizations to maximize your SSD's performance and lifespan on Ubuntu.

## Understanding SSD vs HDD Differences

Before diving into optimizations, it's crucial to understand why SSDs require different handling than traditional HDDs.

### How HDDs Work

Traditional hard disk drives use spinning magnetic platters and a mechanical read/write head. Data is stored in concentric tracks, and the head must physically move to access different locations. This mechanical nature introduces:

- **Seek time**: The time to move the head to the correct track
- **Rotational latency**: Waiting for the platter to rotate to the correct position
- **Sequential advantage**: Reading consecutive sectors is much faster than random access

### How SSDs Work

SSDs use NAND flash memory with no moving parts. Data is stored in cells organized into pages (typically 4KB-16KB) and blocks (typically 256KB-4MB). Key characteristics include:

- **No seek time**: Any location can be accessed equally fast
- **Parallel access**: Multiple chips can be accessed simultaneously
- **Write limitations**: Cells can only be written a finite number of times
- **Erase before write**: Blocks must be erased before new data can be written
- **Write amplification**: Writing small amounts of data may require erasing and rewriting entire blocks

### Why Default Linux Settings May Not Be Optimal

Linux was originally designed with HDDs in mind. Some default behaviors that benefit HDDs can actually harm SSD performance and longevity:

- **I/O schedulers** designed for seek time optimization are unnecessary for SSDs
- **Access time updates** cause unnecessary writes
- **Lack of TRIM** can lead to performance degradation over time

## Verifying Your SSD Configuration

Before making changes, let's verify your current storage setup.

Check if your drive is an SSD by examining the rotational flag:

```bash
# Check if the drive is rotational (0 = SSD, 1 = HDD)
# The lsblk command with the ROTA column shows rotation status
cat /sys/block/sda/queue/rotational
```

If the output is `0`, your drive is an SSD. You can also use:

```bash
# List all block devices with their rotation status and other details
# ROTA column: 0 = SSD, 1 = HDD
lsblk -d -o NAME,ROTA,SIZE,TYPE,MOUNTPOINT
```

Check if TRIM is supported by your SSD:

```bash
# Verify TRIM/discard support on your SSD
# Look for "Deterministic read ZEROs after TRIM" or similar
sudo hdparm -I /dev/sda | grep -i trim
```

## Enabling TRIM for SSD Longevity

TRIM is a command that allows the operating system to inform the SSD which blocks of data are no longer in use. This is critical for SSD performance and longevity.

### Understanding TRIM

When you delete a file on an SSD, the operating system marks the space as available but doesn't immediately inform the SSD. Without TRIM, the SSD must perform expensive read-modify-write operations when it eventually needs to use those blocks. TRIM allows the SSD to proactively erase unused blocks during idle time.

### Method 1: Periodic TRIM with fstrim

The recommended approach for most systems is periodic TRIM using `fstrim`. This runs TRIM on a schedule rather than with every delete operation.

Check if the fstrim timer is enabled:

```bash
# Check if the fstrim timer service is enabled and running
# This timer typically runs weekly to TRIM all mounted filesystems
systemctl status fstrim.timer
```

Enable the fstrim timer if not already active:

```bash
# Enable and start the fstrim timer service
# This schedules weekly TRIM operations on all eligible filesystems
sudo systemctl enable fstrim.timer
sudo systemctl start fstrim.timer
```

Verify the timer is scheduled:

```bash
# List all timers and when they're scheduled to run next
# Look for fstrim.timer in the output
systemctl list-timers --all | grep fstrim
```

You can also run fstrim manually for immediate TRIM:

```bash
# Manually run TRIM on the root filesystem
# The -v flag provides verbose output showing freed space
sudo fstrim -v /
```

To TRIM all mounted filesystems at once:

```bash
# TRIM all mounted filesystems that support the discard operation
# Useful for systems with multiple SSD partitions
sudo fstrim -av
```

### Method 2: Continuous TRIM with discard Mount Option

Continuous TRIM issues the TRIM command with every delete operation. While this keeps the SSD constantly optimized, it can impact performance on some systems.

Edit your fstab to add the discard option:

```bash
# View your current fstab configuration
# Note your SSD filesystem entries for modification
cat /etc/fstab
```

Add the discard option to your SSD mount entries:

```bash
# Example fstab entry with discard option enabled
# UUID is your filesystem's unique identifier
# discard enables continuous TRIM operations
UUID=your-uuid-here  /  ext4  defaults,discard,noatime  0  1
```

However, periodic TRIM is generally preferred because:

- It batches TRIM operations for better efficiency
- Reduces potential performance impact during normal use
- Works better with certain SSD controllers

### Method 3: Creating a Custom TRIM Schedule

For more control over TRIM timing, create a custom systemd timer:

Create a new timer unit file:

```bash
# Create a custom fstrim timer that runs daily instead of weekly
# This is useful for systems with heavy write activity
sudo tee /etc/systemd/system/fstrim-daily.timer << 'EOF'
[Unit]
Description=Daily TRIM timer for SSDs

[Timer]
# Run daily at 3 AM when system is likely idle
OnCalendar=*-*-* 03:00:00
# Randomize start time by up to 1 hour to prevent thundering herd
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

Create the corresponding service unit:

```bash
# Create the service that the timer will trigger
# This runs fstrim on all mounted filesystems
sudo tee /etc/systemd/system/fstrim-daily.service << 'EOF'
[Unit]
Description=Daily TRIM of all SSD filesystems

[Service]
Type=oneshot
# Run fstrim on all mounted filesystems with verbose output
ExecStart=/usr/sbin/fstrim -av
# Log output for monitoring
StandardOutput=journal
EOF
```

Enable and start the custom timer:

```bash
# Reload systemd to recognize new unit files
sudo systemctl daemon-reload

# Enable and start the daily TRIM timer
sudo systemctl enable fstrim-daily.timer
sudo systemctl start fstrim-daily.timer
```

## Configuring the Optimal I/O Scheduler

I/O schedulers determine how read and write requests are ordered and processed. SSDs don't benefit from the complex scheduling designed for HDDs.

### Understanding I/O Schedulers

Linux offers several I/O schedulers:

- **none (noop)**: No reordering, minimal CPU overhead - ideal for SSDs
- **mq-deadline**: Provides latency guarantees with minimal overhead - good for SSDs
- **bfq (Budget Fair Queuing)**: Fair bandwidth distribution - typically for HDDs
- **kyber**: Targets latency goals - can work for SSDs

### Checking Current I/O Scheduler

View the current scheduler for your drive:

```bash
# Display the current I/O scheduler for sda
# The active scheduler is shown in brackets
cat /sys/block/sda/queue/scheduler
```

### Setting the I/O Scheduler Temporarily

Test a scheduler before making permanent changes:

```bash
# Temporarily set the I/O scheduler to 'none' (noop)
# This change is lost on reboot
echo none | sudo tee /sys/block/sda/queue/scheduler
```

Or use mq-deadline if you need fairness guarantees:

```bash
# Set mq-deadline scheduler for balanced performance
# Good choice for mixed workloads on SSDs
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
```

### Making I/O Scheduler Changes Permanent

Create a udev rule to set the scheduler automatically on boot:

```bash
# Create a udev rule to set I/O scheduler based on drive type
# This automatically applies the correct scheduler for SSDs and HDDs
sudo tee /etc/udev/rules.d/60-io-scheduler.rules << 'EOF'
# Set I/O scheduler for SSDs (non-rotational drives)
# ACTION=="add|change" triggers on device addition or change
# ATTR{queue/rotational}=="0" matches SSDs only
# ATTR{queue/scheduler}="none" sets the noop scheduler
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"

# Set I/O scheduler for HDDs (rotational drives)
# BFQ provides good performance for mechanical drives
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="bfq"

# Handle NVMe SSDs separately
# NVMe drives use different kernel naming convention
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
EOF
```

Reload udev rules to apply changes:

```bash
# Reload udev rules without rebooting
# Then trigger the rules for existing devices
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Alternative: Kernel Parameter Method

You can also set the default scheduler via kernel parameters:

```bash
# Edit GRUB configuration to set default I/O scheduler
# This affects all drives system-wide
sudo nano /etc/default/grub
```

Add the elevator parameter:

```bash
# Add or modify the GRUB_CMDLINE_LINUX_DEFAULT line
# elevator=none sets the noop scheduler for all drives
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash elevator=none"
```

Update GRUB and reboot:

```bash
# Regenerate GRUB configuration with new parameters
sudo update-grub

# Reboot to apply kernel parameter changes
sudo reboot
```

## Optimizing Mount Options

Mount options significantly impact SSD performance and longevity.

### Understanding noatime

By default, Linux updates the access time (atime) every time a file is read. On SSDs, this causes unnecessary writes.

### Recommended Mount Options

Edit your fstab file:

```bash
# Make a backup of fstab before editing
# This is critical - a broken fstab can prevent booting
sudo cp /etc/fstab /etc/fstab.backup

# Edit fstab with your preferred editor
sudo nano /etc/fstab
```

Recommended mount options for SSD ext4 filesystems:

```bash
# Optimized fstab entry for SSD with ext4 filesystem
# noatime: Don't update access times (reduces writes)
# nodiratime: Don't update directory access times
# discard: Enable continuous TRIM (optional - see TRIM section)
# errors=remount-ro: Remount read-only on errors for safety
UUID=your-uuid-here  /  ext4  defaults,noatime,nodiratime,errors=remount-ro  0  1
```

For systems using periodic TRIM (recommended):

```bash
# Optimized fstab without continuous discard
# Periodic TRIM via fstrim.timer is more efficient
UUID=your-uuid-here  /  ext4  defaults,noatime,nodiratime  0  1
```

### Mount Options Explained

Here's a comprehensive list of relevant mount options:

```bash
# noatime: Disables access time updates completely
# - Significant write reduction
# - Safe for most systems

# nodiratime: Disables access time updates for directories
# - Included in noatime, but explicit doesn't hurt

# relatime: Updates atime only if older than mtime
# - Compromise between atime and noatime
# - Default on modern Linux

# discard: Enables continuous TRIM
# - Can impact performance during heavy deletes
# - Consider using fstrim.timer instead

# commit=N: Seconds between journal commits (default 5)
# - Higher values reduce writes but risk data on crash
# - commit=60 is reasonable for non-critical data

# barrier=0: Disables write barriers
# - NOT RECOMMENDED - risks data integrity
# - Only consider with battery-backed cache
```

### Applying Mount Option Changes

After editing fstab, remount filesystems:

```bash
# Remount root filesystem with new options
# This applies changes without rebooting
sudo mount -o remount /

# Verify the new mount options are active
mount | grep "on / "
```

## Tuning Swappiness for SSD

Swappiness controls how aggressively Linux moves memory pages to swap space. With SSDs, while swap is fast, excessive swapping still causes unnecessary writes.

### Checking Current Swappiness

View the current swappiness value:

```bash
# Display current swappiness value (default is usually 60)
# Range is 0-100: lower = prefer RAM, higher = more swap use
cat /proc/sys/vm/swappiness
```

### Recommended Swappiness for SSDs

For systems with adequate RAM, lower swappiness reduces SSD wear:

```bash
# Temporarily set swappiness to 10 for testing
# Lower values keep more data in RAM
sudo sysctl vm.swappiness=10
```

Make the change permanent:

```bash
# Add swappiness setting to sysctl configuration
# This persists across reboots
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.d/99-ssd-optimization.conf

# Also tune vfs_cache_pressure while we're at it
# Lower values retain inode/dentry caches longer
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.d/99-ssd-optimization.conf
```

Apply the settings immediately:

```bash
# Apply all sysctl settings from configuration files
sudo sysctl --system
```

### Understanding vfs_cache_pressure

The vfs_cache_pressure parameter controls the tendency to reclaim memory used for caching directory and inode objects:

```bash
# View current vfs_cache_pressure (default is 100)
# Lower values = keep caches longer
# Higher values = reclaim cache more aggressively
cat /proc/sys/vm/vfs_cache_pressure
```

For SSDs with ample RAM, a lower value (50) helps maintain cached filesystem metadata, reducing disk reads.

### Complete SSD Sysctl Configuration

Create a comprehensive SSD optimization configuration:

```bash
# Create comprehensive SSD optimization sysctl config
sudo tee /etc/sysctl.d/99-ssd-optimization.conf << 'EOF'
# Swappiness: Lower value means less swap usage
# 10 is good for systems with enough RAM
vm.swappiness=10

# VFS cache pressure: Lower value keeps inode/dentry caches longer
# Reduces metadata reads from disk
vm.vfs_cache_pressure=50

# Dirty ratio: Percentage of RAM that can be dirty before sync
# Higher values allow more write caching
vm.dirty_ratio=15

# Dirty background ratio: When background writeback starts
# Lower values start writing back sooner
vm.dirty_background_ratio=5

# Dirty writeback centisecs: How often writeback thread wakes up
# 500 = 5 seconds
vm.dirty_writeback_centisecs=500

# Dirty expire centisecs: How old dirty pages can get before writeout
# 3000 = 30 seconds
vm.dirty_expire_centisecs=3000
EOF

# Apply the new settings
sudo sysctl --system
```

## Ensuring Proper Filesystem Alignment

Proper partition alignment is crucial for SSD performance. Misaligned partitions can cause read-modify-write cycles.

### Understanding Alignment

SSDs have an internal page size (typically 4KB) and erase block size (typically 1-4MB). Partitions should start at boundaries that align with these.

### Checking Current Alignment

Check partition alignment:

```bash
# Display partition information with sector alignment
# Start sector should be divisible by 2048 (1MB boundary)
sudo fdisk -l /dev/sda
```

Verify alignment with parted:

```bash
# Check if partitions are optimally aligned
# parted's align-check verifies alignment
sudo parted /dev/sda align-check optimal 1
```

Check all partitions:

```bash
# Script to check alignment of all partitions on a device
# Aligned partitions show "1 aligned" for each
for part in $(seq 1 $(sudo parted -s /dev/sda print | grep -c "^ ")); do
    echo -n "Partition $part: "
    sudo parted /dev/sda align-check optimal $part
done
```

### Modern Partitioning Tools

Modern tools like `gdisk`, `parted`, and Ubuntu's installer align partitions correctly by default. However, if you need to create new partitions:

```bash
# Using parted with optimal alignment
# The -a optimal flag ensures proper alignment
sudo parted -a optimal /dev/sdb mklabel gpt

# Create a partition starting at 1MB boundary
# 0% to 100% means use the entire disk with optimal alignment
sudo parted -a optimal /dev/sdb mkpart primary ext4 0% 100%
```

Using gdisk for GPT partitions:

```bash
# gdisk automatically aligns to 1MB boundaries by default
# Start interactive partitioning
sudo gdisk /dev/sdb

# Within gdisk:
# n - new partition
# Accept defaults for proper alignment
# w - write changes
```

### Verifying Block Size

Check the filesystem block size matches your SSD:

```bash
# Display filesystem block size (usually 4096 bytes)
# Should match or be multiple of SSD page size
sudo blockdev --getbsz /dev/sda1
```

Check physical and logical sector sizes:

```bash
# Display physical and logical sector sizes
# Modern SSDs typically report 512/4096 or 4096/4096
sudo fdisk -l /dev/sda | grep "Sector size"

# More detailed information
sudo hdparm -I /dev/sda | grep -i "sector size"
```

## Monitoring SSD Health

Regular monitoring helps predict SSD failures before they happen.

### Using smartmontools

Install smartmontools if not present:

```bash
# Install SMART monitoring tools for drive health checking
sudo apt update
sudo apt install -y smartmontools
```

Check SSD health status:

```bash
# Display overall SMART health status
# PASSED means the drive is healthy
sudo smartctl -H /dev/sda
```

View detailed SMART attributes:

```bash
# Display all SMART attributes with current values
# Key attributes for SSDs include wear level and error rates
sudo smartctl -A /dev/sda
```

View comprehensive drive information:

```bash
# Display complete SMART information
# Includes drive info, health, attributes, and self-test logs
sudo smartctl -a /dev/sda
```

### Key SMART Attributes for SSDs

Monitor these critical attributes:

```bash
# Script to display key SSD health metrics
# These are the most important attributes for SSD longevity
echo "=== SSD Health Check ==="

# Get SMART data and filter for key attributes
sudo smartctl -A /dev/sda | grep -E "(Wear_Leveling_Count|Media_Wearout_Indicator|Reallocated_Sector_Ct|Runtime_Bad_Block|Reported_Uncorrect|Power_On_Hours|Host_Writes|NAND_Writes)"
```

Understanding the key attributes:

```bash
# Important SMART attributes for SSDs:
#
# Wear_Leveling_Count (177):
#   - Indicates SSD wear level
#   - Starts at 100, decreases over time
#   - Below 10 = consider replacement
#
# Media_Wearout_Indicator (233):
#   - Overall wear indicator
#   - 0 = end of rated life
#
# Reallocated_Sector_Ct (5):
#   - Count of remapped sectors
#   - Increasing values indicate wear
#
# Host_Writes (241):
#   - Total data written by host
#   - Compare to TBW rating
#
# Power_On_Hours (9):
#   - Total hours of operation
```

### Setting Up Automatic SMART Monitoring

Configure smartd for automatic monitoring:

```bash
# Edit smartd configuration
sudo nano /etc/smartd.conf
```

Add monitoring configuration:

```bash
# Add this line to monitor your SSD
# -a: monitor all attributes
# -o on: enable automatic offline testing
# -S on: enable automatic attribute autosave
# -n standby: don't spin up drive for checks
# -s (S/../.././02|L/../../6/03): short test daily at 2AM, long weekly Sat 3AM
# -W 0,0,45: warn if temp rises 45C from baseline
# -m root: email alerts to root
/dev/sda -a -o on -S on -n standby -s (S/../.././02|L/../../6/03) -W 0,0,45 -m root
```

Enable and start smartd:

```bash
# Enable smartd to start on boot
sudo systemctl enable smartd

# Restart smartd to apply new configuration
sudo systemctl restart smartd

# Check smartd status
sudo systemctl status smartd
```

### Creating a Health Monitoring Script

Create a script for regular SSD health checks:

```bash
# Create an SSD health monitoring script
sudo tee /usr/local/bin/ssd-health-check.sh << 'EOF'
#!/bin/bash
# SSD Health Monitoring Script
# Run periodically via cron or systemd timer

set -euo pipefail

# Configuration
DEVICE="${1:-/dev/sda}"
LOG_FILE="/var/log/ssd-health.log"
WARN_THRESHOLD=20  # Warn when wear level drops below this

# Get current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check if device exists
if [[ ! -b "$DEVICE" ]]; then
    echo "[$TIMESTAMP] ERROR: Device $DEVICE not found" >> "$LOG_FILE"
    exit 1
fi

# Get SMART health status
HEALTH=$(sudo smartctl -H "$DEVICE" | grep -i "result" | awk '{print $NF}')

# Get wear level (attribute 177 or 233, depending on SSD)
WEAR=$(sudo smartctl -A "$DEVICE" | grep -E "(Wear_Leveling|Wearout)" | awk '{print $4}' | head -1)
WEAR=${WEAR:-100}  # Default to 100 if not found

# Get power-on hours
POH=$(sudo smartctl -A "$DEVICE" | grep "Power_On_Hours" | awk '{print $10}')
POH=${POH:-0}

# Get total host writes (in GB if available)
HOST_WRITES=$(sudo smartctl -A "$DEVICE" | grep "Host_Writes" | awk '{print $10}')

# Log the results
echo "[$TIMESTAMP] Device: $DEVICE | Health: $HEALTH | Wear: $WEAR% | Hours: $POH | Writes: ${HOST_WRITES:-N/A}" >> "$LOG_FILE"

# Check for warnings
if [[ "$HEALTH" != "PASSED" ]]; then
    echo "[$TIMESTAMP] WARNING: SMART health check failed for $DEVICE" >> "$LOG_FILE"
    # Send alert (configure as needed)
    # mail -s "SSD Health Warning" admin@example.com < /dev/null
fi

if [[ "$WEAR" -lt "$WARN_THRESHOLD" ]]; then
    echo "[$TIMESTAMP] WARNING: SSD wear level at $WEAR% for $DEVICE" >> "$LOG_FILE"
fi

echo "SSD Health Check Complete - see $LOG_FILE for details"
EOF

# Make the script executable
sudo chmod +x /usr/local/bin/ssd-health-check.sh
```

Schedule the health check:

```bash
# Create a systemd timer for daily health checks
sudo tee /etc/systemd/system/ssd-health-check.timer << 'EOF'
[Unit]
Description=Daily SSD Health Check

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Create the corresponding service
sudo tee /etc/systemd/system/ssd-health-check.service << 'EOF'
[Unit]
Description=SSD Health Check Service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/ssd-health-check.sh /dev/sda
EOF

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable ssd-health-check.timer
sudo systemctl start ssd-health-check.timer
```

### Checking SSD Write Statistics

Monitor how much data you're writing to your SSD:

```bash
# Check lifetime writes to the SSD
# Uses kernel statistics from /sys
cat /sys/block/sda/stat | awk '{print "Read sectors:", $3, "\nWrite sectors:", $7}'
```

Calculate total writes in GB:

```bash
# Calculate total GB written to SSD
# Sectors are typically 512 bytes
SECTORS=$(cat /sys/block/sda/stat | awk '{print $7}')
GB_WRITTEN=$(echo "scale=2; $SECTORS * 512 / 1024 / 1024 / 1024" | bc)
echo "Total data written: ${GB_WRITTEN} GB"
```

## Additional SSD Optimization Tips

### Reducing Unnecessary Writes

Configure journald to reduce logging writes:

```bash
# Configure journald to reduce disk writes
# Store logs in RAM instead of disk (volatile)
sudo mkdir -p /etc/systemd/journald.conf.d/

sudo tee /etc/systemd/journald.conf.d/ssd-optimize.conf << 'EOF'
[Journal]
# Store journal in RAM (optional - logs lost on reboot)
# Storage=volatile

# If keeping persistent storage, compress logs
Compress=yes

# Limit journal size
SystemMaxUse=500M
RuntimeMaxUse=100M

# Rate limit logging
RateLimitInterval=30s
RateLimitBurst=1000
EOF

# Restart journald to apply changes
sudo systemctl restart systemd-journald
```

### Moving Browser Cache to RAM

Reduce browser disk writes by using tmpfs:

```bash
# Create a script to set up browser profile in tmpfs
# This reduces writes but loses cache on reboot
mkdir -p ~/.cache/browser-ramdisk

# Add to fstab for automatic mounting
echo 'tmpfs /home/$USER/.cache/browser-ramdisk tmpfs noatime,nodev,nosuid,size=512M 0 0' | sudo tee -a /etc/fstab
```

### Optimizing tmp Directories

Mount temporary directories in RAM:

```bash
# Check if tmp is already tmpfs
mount | grep tmpfs | grep tmp

# If not using tmpfs for /tmp, add to fstab
# Note: This limits /tmp size to specified amount
echo 'tmpfs /tmp tmpfs defaults,noatime,nosuid,nodev,size=2G,mode=1777 0 0' | sudo tee -a /etc/fstab
```

### Disabling Hibernation

Hibernation writes entire RAM contents to disk:

```bash
# Disable hibernation to reduce large writes to SSD
# This saves SSD wear if you don't use hibernation
sudo systemctl mask hibernate.target

# Also disable hybrid sleep
sudo systemctl mask hybrid-sleep.target
```

### Enabling Write Caching

Ensure write caching is enabled for better performance:

```bash
# Check if write cache is enabled
sudo hdparm -W /dev/sda

# Enable write cache if disabled
sudo hdparm -W 1 /dev/sda
```

## Verifying Your Optimizations

After applying all optimizations, verify they're active:

```bash
# Create a comprehensive verification script
sudo tee /usr/local/bin/verify-ssd-optimizations.sh << 'EOF'
#!/bin/bash
# Verify SSD optimizations are properly configured

echo "=== SSD Optimization Verification ==="
echo ""

# Check if drive is SSD
echo "1. Drive Type:"
ROTATIONAL=$(cat /sys/block/sda/queue/rotational 2>/dev/null)
if [[ "$ROTATIONAL" == "0" ]]; then
    echo "   [OK] SSD detected (non-rotational)"
else
    echo "   [INFO] HDD or unknown drive type"
fi
echo ""

# Check I/O scheduler
echo "2. I/O Scheduler:"
SCHEDULER=$(cat /sys/block/sda/queue/scheduler 2>/dev/null)
echo "   Current: $SCHEDULER"
if [[ "$SCHEDULER" == *"[none]"* ]] || [[ "$SCHEDULER" == *"[mq-deadline]"* ]]; then
    echo "   [OK] Optimal scheduler for SSD"
else
    echo "   [WARN] Consider using 'none' or 'mq-deadline'"
fi
echo ""

# Check TRIM timer
echo "3. TRIM Configuration:"
FSTRIM_STATUS=$(systemctl is-enabled fstrim.timer 2>/dev/null)
if [[ "$FSTRIM_STATUS" == "enabled" ]]; then
    echo "   [OK] fstrim.timer is enabled"
else
    echo "   [WARN] fstrim.timer is not enabled"
fi
echo ""

# Check mount options
echo "4. Mount Options:"
MOUNT_OPTS=$(mount | grep "on / " | grep -o "([^)]*)")
echo "   Root filesystem: $MOUNT_OPTS"
if [[ "$MOUNT_OPTS" == *"noatime"* ]]; then
    echo "   [OK] noatime is set"
else
    echo "   [WARN] noatime is not set"
fi
echo ""

# Check swappiness
echo "5. Swappiness:"
SWAPPINESS=$(cat /proc/sys/vm/swappiness)
echo "   Current value: $SWAPPINESS"
if [[ "$SWAPPINESS" -le 20 ]]; then
    echo "   [OK] Swappiness is optimized for SSD"
else
    echo "   [INFO] Consider lowering swappiness for SSD"
fi
echo ""

# Check VFS cache pressure
echo "6. VFS Cache Pressure:"
VFS_CACHE=$(cat /proc/sys/vm/vfs_cache_pressure)
echo "   Current value: $VFS_CACHE"
if [[ "$VFS_CACHE" -le 75 ]]; then
    echo "   [OK] VFS cache pressure is optimized"
else
    echo "   [INFO] Consider lowering vfs_cache_pressure"
fi
echo ""

# Check SMART status
echo "7. SMART Health:"
if command -v smartctl &> /dev/null; then
    SMART_STATUS=$(sudo smartctl -H /dev/sda 2>/dev/null | grep -i "result" | awk '{print $NF}')
    if [[ "$SMART_STATUS" == "PASSED" ]]; then
        echo "   [OK] SMART health check passed"
    else
        echo "   [WARN] SMART health: $SMART_STATUS"
    fi
else
    echo "   [INFO] smartmontools not installed"
fi
echo ""

echo "=== Verification Complete ==="
EOF

# Make executable
sudo chmod +x /usr/local/bin/verify-ssd-optimizations.sh

# Run the verification
sudo /usr/local/bin/verify-ssd-optimizations.sh
```

## Summary and Quick Reference

Here's a quick reference of all the optimizations covered:

### Essential Optimizations

| Optimization | Command/Setting | Impact |
|-------------|-----------------|--------|
| Enable TRIM Timer | `systemctl enable fstrim.timer` | High |
| Set I/O Scheduler | `echo none > /sys/block/sda/queue/scheduler` | Medium |
| noatime Mount | Add `noatime` to fstab | Medium |
| Lower Swappiness | `vm.swappiness=10` | Medium |

### Configuration Files Reference

```bash
# Key files modified during optimization:
# /etc/fstab - Mount options
# /etc/udev/rules.d/60-io-scheduler.rules - I/O scheduler rules
# /etc/sysctl.d/99-ssd-optimization.conf - Kernel parameters
# /etc/smartd.conf - SMART monitoring configuration
```

### Complete One-Command Setup

For convenience, here's a script that applies all essential optimizations:

```bash
# Complete SSD optimization script
# Run with: sudo bash ssd-optimize.sh

sudo tee /tmp/ssd-optimize.sh << 'EOF'
#!/bin/bash
set -euo pipefail

echo "Applying SSD optimizations..."

# Enable TRIM timer
systemctl enable fstrim.timer
systemctl start fstrim.timer

# Create I/O scheduler rule
cat > /etc/udev/rules.d/60-io-scheduler.rules << 'RULE'
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
RULE

# Apply sysctl optimizations
cat > /etc/sysctl.d/99-ssd-optimization.conf << 'SYSCTL'
vm.swappiness=10
vm.vfs_cache_pressure=50
vm.dirty_ratio=15
vm.dirty_background_ratio=5
SYSCTL

# Apply sysctl changes
sysctl --system

# Reload udev rules
udevadm control --reload-rules
udevadm trigger

echo "SSD optimizations applied successfully!"
echo "Note: Update /etc/fstab manually to add noatime option"
echo "Reboot recommended for all changes to take effect"
EOF

sudo bash /tmp/ssd-optimize.sh
```

## Conclusion

Optimizing Ubuntu for SSD storage involves several key areas: enabling TRIM for maintaining write performance, selecting the appropriate I/O scheduler to reduce CPU overhead, configuring mount options to minimize unnecessary writes, and tuning system parameters like swappiness for better RAM utilization.

The most impactful optimizations are:

1. **Enable periodic TRIM** via the fstrim.timer service
2. **Use the 'none' or 'mq-deadline' I/O scheduler** for SSDs
3. **Add noatime mount option** to reduce write operations
4. **Lower swappiness** to prefer RAM over swap

Regular monitoring of your SSD's health using SMART tools helps predict failures and ensures you're aware of wear levels. With these optimizations in place, your Ubuntu system will take full advantage of SSD performance while maximizing drive longevity.

Remember that SSDs are highly reliable and modern Ubuntu installations already include some of these optimizations by default. Always verify your current configuration before making changes, and test modifications in a non-critical environment first.
