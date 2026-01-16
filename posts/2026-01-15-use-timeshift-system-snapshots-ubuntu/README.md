# How to Use Timeshift for System Snapshots on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Timeshift, Snapshots, Backup, System Restore, Tutorial

Description: Complete guide to using Timeshift for creating and restoring system snapshots on Ubuntu.

---

System snapshots are an essential safety net for any Linux user. Whether you are experimenting with new software, performing major system updates, or simply want peace of mind, having the ability to restore your system to a previous working state is invaluable. Timeshift is a powerful, user-friendly tool that makes creating and managing system snapshots on Ubuntu straightforward and reliable.

In this comprehensive guide, we will explore everything you need to know about using Timeshift for system snapshots on Ubuntu, from installation and configuration to advanced command-line usage and troubleshooting.

## Understanding Timeshift

Timeshift is a system restore utility for Linux that creates incremental snapshots of your filesystem. Unlike traditional backup tools that focus on user data, Timeshift is specifically designed to protect system files and configurations. It works similarly to the System Restore feature in Windows or Time Machine in macOS, but with more flexibility and control.

### What Timeshift Backs Up

By default, Timeshift backs up:
- The root filesystem (`/`)
- System configuration files in `/etc`
- Installed applications and packages
- Boot loader configuration

### What Timeshift Does NOT Back Up

Timeshift is not intended for backing up personal data:
- User home directories (`/home`) are excluded by default
- User documents, photos, and media files
- Database files and application data in user directories

This distinction is important because Timeshift is meant to restore your system to a working state, not to serve as a comprehensive backup solution for personal files. For user data backup, consider using dedicated backup tools like Deja Dup, rsync, or cloud-based solutions.

## RSYNC vs BTRFS Snapshots

Timeshift supports two snapshot modes, each with distinct advantages and use cases. Understanding the differences will help you choose the right mode for your system.

### RSYNC Mode

RSYNC mode creates snapshots using hard links and the rsync utility. This is the most compatible mode and works on any Linux filesystem.

**Advantages:**
- Works on any filesystem (ext4, ext3, XFS, etc.)
- Snapshots can be stored on external drives
- Easy to browse and restore individual files
- Snapshots are portable and can be copied to other locations

**Disadvantages:**
- Initial snapshot takes longer and uses more disk space
- Incremental snapshots still require some additional space
- Restoration process takes longer than BTRFS

```bash
# Example: Check if your system uses ext4 (common for RSYNC mode)
df -T /

# Output example:
# Filesystem     Type  1K-blocks     Used Available Use% Mounted on
# /dev/sda2      ext4  102400000 45678912  51234567  48% /
```

### BTRFS Mode

BTRFS mode leverages the native snapshot capabilities of the BTRFS filesystem. This mode offers near-instantaneous snapshots with minimal disk overhead.

**Advantages:**
- Snapshots are created almost instantly
- Minimal disk space overhead (only changes are stored)
- Faster restoration
- Better integration with system boot process

**Disadvantages:**
- Only works on BTRFS filesystems
- Cannot store snapshots on external drives (must be on same BTRFS volume)
- Requires specific BTRFS subvolume layout

```bash
# Example: Check if your system uses BTRFS
df -T /

# Output example for BTRFS:
# Filesystem     Type   1K-blocks     Used Available Use% Mounted on
# /dev/sda2      btrfs  102400000 45678912  51234567  48% /

# List BTRFS subvolumes (if using BTRFS)
sudo btrfs subvolume list /
```

### Choosing the Right Mode

| Feature | RSYNC | BTRFS |
|---------|-------|-------|
| Filesystem Support | Any | BTRFS only |
| Snapshot Speed | Slower | Near-instant |
| Disk Usage | Higher | Lower |
| External Storage | Yes | No |
| Restoration Speed | Slower | Faster |

For most Ubuntu users with the default ext4 filesystem, RSYNC mode is the appropriate choice. If you installed Ubuntu with BTRFS or converted your system to BTRFS, you can take advantage of the faster BTRFS mode.

## Installing Timeshift

Timeshift is available in the official Ubuntu repositories, making installation straightforward.

### Installation via APT

```bash
# Update package lists to ensure you get the latest version
sudo apt update

# Install Timeshift
sudo apt install timeshift

# Verify installation
timeshift --version

# Expected output:
# Timeshift v22.11.1
```

### Installation via PPA (for latest version)

If you want the most recent version of Timeshift, you can add the developer's PPA:

```bash
# Add the Timeshift PPA
sudo add-apt-repository -y ppa:teejee2008/timeshift

# Update package lists
sudo apt update

# Install or upgrade Timeshift
sudo apt install timeshift
```

### Verifying Installation

After installation, you can launch Timeshift from the application menu or via terminal:

```bash
# Launch Timeshift GUI (requires root privileges)
sudo timeshift-gtk

# Or check available commands
timeshift --help
```

## Initial Configuration

When you first launch Timeshift, a setup wizard guides you through the initial configuration. Here is how to configure it manually or understand each option.

### Step 1: Select Snapshot Type

```bash
# The configuration file is stored at:
# /etc/timeshift/timeshift.json

# View current configuration
sudo cat /etc/timeshift/timeshift.json
```

Choose between RSYNC and BTRFS based on your filesystem type as discussed earlier.

### Step 2: Select Snapshot Location

For RSYNC mode, you need to select where snapshots will be stored:

```bash
# List available partitions
lsblk -f

# Example output:
# NAME   FSTYPE LABEL  UUID                                 MOUNTPOINT
# sda
# ├─sda1 vfat   EFI    1234-5678                            /boot/efi
# ├─sda2 ext4   Ubuntu abcd1234-ef56-...                    /
# └─sda3 ext4   Backup efgh5678-ij90-...                    /mnt/backup
```

Best practices for snapshot location:
- Use a separate partition from your root filesystem
- Ensure sufficient free space (at least 50GB recommended)
- External drives work well for additional redundancy

### Step 3: Configure Snapshot Schedule

You can set up automatic snapshots at various intervals:

```bash
# Example timeshift.json configuration for scheduling
{
  "backup_device_uuid": "efgh5678-ij90-...",
  "parent_device_uuid": "",
  "do_first_run": "false",
  "btrfs_mode": "false",
  "include_btrfs_home_for_backup": "false",
  "include_btrfs_home_for_restore": "false",
  "stop_cron_emails": "true",
  "schedule_monthly": "true",
  "schedule_weekly": "true",
  "schedule_daily": "true",
  "schedule_hourly": "false",
  "schedule_boot": "false",
  "count_monthly": "2",
  "count_weekly": "3",
  "count_daily": "5",
  "count_hourly": "6",
  "count_boot": "5"
}
```

### Step 4: Select Directories to Include

By default, Timeshift includes the root filesystem and excludes home directories. You can customize this:

```bash
# Example: Configuration showing included/excluded directories
# In timeshift.json, the exclude section:
{
  "exclude": [
    "/home/**",
    "/root/**",
    "/var/log/**",
    "/var/cache/**",
    "/tmp/**"
  ],
  "exclude-apps": []
}
```

## Creating Manual Snapshots

While scheduled snapshots provide automatic protection, manual snapshots are essential before making significant system changes.

### Creating a Snapshot via GUI

1. Launch Timeshift: `sudo timeshift-gtk`
2. Click the "Create" button
3. Enter an optional comment describing the snapshot
4. Wait for the snapshot to complete

### Creating a Snapshot via Command Line

```bash
# Create a snapshot with default settings
sudo timeshift --create

# Create a snapshot with a descriptive comment
sudo timeshift --create --comments "Before upgrading to Ubuntu 24.04"

# Create a snapshot and display verbose output
sudo timeshift --create --verbose --comments "Pre-kernel-update snapshot"

# Example output:
# /dev/sda3 is mounted at: /run/timeshift/backup
# Creating new snapshot...(RSYNC)
# Saving to device: /dev/sda3, mounted at path: /run/timeshift/backup
# Syncing files with rsync...
# Created snapshot: 2026-01-15_10-30-45
# Tagged snapshot '2026-01-15_10-30-45': ondemand
```

### Best Times to Create Manual Snapshots

- Before system upgrades (`sudo apt upgrade`)
- Before installing new software
- Before modifying system configuration files
- Before running system cleanup tools
- Before experimenting with new kernel versions

```bash
# Example workflow: Create snapshot before major update
sudo timeshift --create --comments "Before January 2026 updates"
sudo apt update && sudo apt upgrade -y
```

## Automated Snapshot Schedules

Timeshift can automatically create and manage snapshots based on a schedule. Here is how to configure automated snapshots.

### Understanding Schedule Options

Timeshift offers five scheduling intervals:

| Schedule | Description | Recommended Count |
|----------|-------------|-------------------|
| Boot | Creates snapshot at every boot | 3-5 |
| Hourly | Creates snapshot every hour | 6-12 |
| Daily | Creates snapshot once per day | 5-7 |
| Weekly | Creates snapshot once per week | 2-4 |
| Monthly | Creates snapshot once per month | 2-3 |

### Configuring Schedules via Command Line

```bash
# Edit the Timeshift configuration file
sudo nano /etc/timeshift/timeshift.json

# Example: Enable daily and weekly snapshots only
# Set these values in the JSON file:
{
  "schedule_monthly": "true",
  "schedule_weekly": "true",
  "schedule_daily": "true",
  "schedule_hourly": "false",
  "schedule_boot": "false",
  "count_monthly": "2",
  "count_weekly": "3",
  "count_daily": "5",
  "count_hourly": "0",
  "count_boot": "0"
}
```

### How Automatic Cleanup Works

Timeshift automatically removes old snapshots to conserve disk space. The retention policy is based on the count values you configure:

```bash
# Example: With these settings
# count_daily = 5
# count_weekly = 3
# count_monthly = 2

# Timeshift will maintain:
# - 5 most recent daily snapshots
# - 3 most recent weekly snapshots
# - 2 most recent monthly snapshots
# Older snapshots are automatically deleted
```

### Verifying Scheduled Snapshots

```bash
# Check if the Timeshift cron job is active
cat /etc/cron.d/timeshift-hourly

# Example content:
# # Timeshift scheduler
# 0 * * * * root /usr/bin/timeshift --check --scripted

# List existing snapshots to verify scheduling is working
sudo timeshift --list
```

## Excluding Directories

Proper exclusion configuration ensures efficient use of disk space and faster snapshot creation.

### Default Exclusions

Timeshift excludes these directories by default:
- `/home/**` - User home directories
- `/root/**` - Root user home directory
- `/tmp/**` - Temporary files
- `/var/tmp/**` - Variable temporary files
- `/var/cache/**` - Application caches
- `/var/log/**` - System logs
- `/swapfile` - Swap file

### Adding Custom Exclusions via GUI

1. Open Timeshift: `sudo timeshift-gtk`
2. Click "Settings" or the gear icon
3. Navigate to the "Filters" tab
4. Add directories or files to exclude

### Adding Custom Exclusions via Configuration

```bash
# Edit the configuration file
sudo nano /etc/timeshift/timeshift.json

# Add custom exclusions to the exclude array
{
  "exclude": [
    "/home/**",
    "/root/**",
    "/tmp/**",
    "/var/tmp/**",
    "/var/cache/**",
    "/var/log/**",
    "/swapfile",
    "/var/lib/docker/**",
    "/var/lib/lxc/**",
    "/var/lib/libvirt/**",
    "*.iso",
    "*.tmp",
    "/mnt/**",
    "/media/**"
  ]
}
```

### Recommended Additional Exclusions

```bash
# For Docker users - exclude Docker data
"/var/lib/docker/**"

# For virtual machine users - exclude VM images
"/var/lib/libvirt/images/**"
"/home/*/VirtualBox VMs/**"

# For developers - exclude large build directories
"**/node_modules/**"
"**/.gradle/**"
"**/target/**"
"**/__pycache__/**"

# For download directories
"/home/*/Downloads/**"
```

### Including Home Directories (Optional)

If you want Timeshift to include home directories (not typically recommended):

```bash
# In timeshift.json, remove /home/** from exclude list
# Or for BTRFS mode:
{
  "include_btrfs_home_for_backup": "true",
  "include_btrfs_home_for_restore": "true"
}
```

**Warning:** Including home directories significantly increases snapshot size and creation time. Consider using a separate backup solution for personal files.

## Restoring from Snapshots

The ability to restore your system is the primary purpose of Timeshift. Here is how to restore from snapshots in various scenarios.

### Scenario 1: System Still Bootable

If your system boots normally but you want to revert changes:

#### Restore via GUI

```bash
# Launch Timeshift
sudo timeshift-gtk

# In the GUI:
# 1. Select the snapshot you want to restore
# 2. Click "Restore"
# 3. Review the files that will be changed
# 4. Confirm the restoration
# 5. Reboot when prompted
```

#### Restore via Command Line

```bash
# List available snapshots
sudo timeshift --list

# Example output:
# Num  Name                 Tags  Description
# ----------------------------------------------
# 0    2026-01-15_10-30-45  O     Before January 2026 updates
# 1    2026-01-14_00-00-01  D     Daily snapshot
# 2    2026-01-13_00-00-01  D     Daily snapshot
# 3    2026-01-12_00-00-01  D W   Daily/Weekly snapshot
# 4    2026-01-01_00-00-01  M     Monthly snapshot

# Restore a specific snapshot (by name)
sudo timeshift --restore --snapshot "2026-01-15_10-30-45"

# Restore with confirmation prompts skipped (use with caution)
sudo timeshift --restore --snapshot "2026-01-15_10-30-45" --yes

# Restore and skip GRUB reinstallation
sudo timeshift --restore --snapshot "2026-01-15_10-30-45" --skip-grub
```

### Scenario 2: System Won't Boot

If your system fails to boot, you have several options:

#### Option A: Use Live USB

```bash
# 1. Boot from Ubuntu Live USB
# 2. Open terminal and install Timeshift
sudo apt update && sudo apt install timeshift

# 3. List snapshots from the installed system
# First, mount your system partition
sudo mount /dev/sda2 /mnt

# 4. Run Timeshift restore targeting the mounted system
sudo timeshift --restore --target /mnt --snapshot "2026-01-15_10-30-45"

# 5. Unmount and reboot
sudo umount /mnt
sudo reboot
```

#### Option B: Use Recovery Mode (see GRUB section below)

### Scenario 3: Restore Specific Files Only

Sometimes you only need to restore specific files, not the entire system:

```bash
# Snapshots are stored in a readable format
# Navigate to the snapshot directory
ls /run/timeshift/backup/timeshift/snapshots/

# Example: Restore a specific configuration file
sudo cp /run/timeshift/backup/timeshift/snapshots/2026-01-15_10-30-45/localhost/etc/nginx/nginx.conf /etc/nginx/nginx.conf

# Example: Compare a file before restoring
diff /etc/apt/sources.list /run/timeshift/backup/timeshift/snapshots/2026-01-15_10-30-45/localhost/etc/apt/sources.list
```

## Booting from Snapshot (GRUB)

For BTRFS systems, Timeshift can integrate with GRUB to allow booting directly into snapshots. This is incredibly useful when your system fails to boot.

### Installing GRUB-BTRFS (for BTRFS users)

```bash
# Install grub-btrfs for snapshot boot menu entries
sudo apt install grub-btrfs

# Update GRUB configuration
sudo update-grub

# Verify GRUB configuration includes snapshots
grep -i timeshift /boot/grub/grub.cfg
```

### Booting into a Snapshot

1. Restart your computer
2. Hold SHIFT or press ESC during boot to access GRUB menu
3. Select "Ubuntu Timeshift snapshots" or "Snapshots"
4. Choose the snapshot you want to boot into
5. The system boots using files from that snapshot

### Making Changes Permanent After Booting into Snapshot

```bash
# After booting into a snapshot and verifying it works
# Open Timeshift and restore that snapshot permanently
sudo timeshift --restore --snapshot "2026-01-15_10-30-45"
```

### Configuring GRUB for RSYNC Snapshots

RSYNC snapshots do not integrate directly with GRUB. For RSYNC users, the Live USB method is the recommended recovery approach:

```bash
# Create a bootable USB with Ubuntu
# Boot from USB, install Timeshift, and restore

# Alternative: Add a recovery option to GRUB
# Edit /etc/grub.d/40_custom
sudo nano /etc/grub.d/40_custom

# Add recovery menu entry pointing to snapshot
# This is an advanced configuration - use with caution
```

## Command-Line Usage

Timeshift offers comprehensive command-line options for scripting and automation.

### Basic Commands Reference

```bash
# Display help and all available options
timeshift --help

# List all snapshots
sudo timeshift --list

# Example output:
# Device : /dev/sda3
# UUID   : efgh5678-ij90-...
# Path   : /run/timeshift/backup
# Mode   : RSYNC
# Status : OK
#
# Num  Name                 Tags  Description
# ----------------------------------------------
# 0    2026-01-15_10-30-45  O     Before January 2026 updates
# 1    2026-01-14_00-00-01  D
# 2    2026-01-13_00-00-01  D

# Create a new snapshot
sudo timeshift --create --comments "Description here"

# Create snapshot with specific tag
sudo timeshift --create --tags D  # Daily
sudo timeshift --create --tags W  # Weekly
sudo timeshift --create --tags M  # Monthly
sudo timeshift --create --tags O  # On-demand

# Delete a specific snapshot
sudo timeshift --delete --snapshot "2026-01-15_10-30-45"

# Delete all snapshots (use with extreme caution)
sudo timeshift --delete-all
```

### Advanced Command-Line Options

```bash
# Restore with specific options
sudo timeshift --restore \
  --snapshot "2026-01-15_10-30-45" \
  --target /mnt \
  --skip-grub \
  --verbose

# Check for scheduled snapshots and create if needed
sudo timeshift --check

# Run in scripted mode (no prompts, for automation)
sudo timeshift --create --scripted

# Specify snapshot device
sudo timeshift --create --snapshot-device /dev/sdb1

# Clone system to another device
sudo timeshift --restore --snapshot "2026-01-15_10-30-45" \
  --target-device /dev/sdc1 --clone
```

### Scripting Examples

```bash
#!/bin/bash
# pre-upgrade-snapshot.sh
# Creates a snapshot before system upgrades

# Script description and usage
# This script creates a Timeshift snapshot before running apt upgrade
# Run with: sudo ./pre-upgrade-snapshot.sh

set -e  # Exit on error

echo "Creating pre-upgrade snapshot..."
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Create snapshot with descriptive comment
sudo timeshift --create --scripted \
  --comments "Pre-upgrade snapshot ${TIMESTAMP}"

if [ $? -eq 0 ]; then
    echo "Snapshot created successfully"
    echo "Proceeding with system upgrade..."
    sudo apt update && sudo apt upgrade -y
else
    echo "Snapshot creation failed. Aborting upgrade."
    exit 1
fi
```

```bash
#!/bin/bash
# snapshot-cleanup.sh
# Remove snapshots older than specified days

# Default to 30 days if not specified
DAYS=${1:-30}

echo "Removing snapshots older than ${DAYS} days..."

# Get list of snapshots
sudo timeshift --list | grep -E "^[0-9]+" | while read line; do
    snapshot_name=$(echo $line | awk '{print $2}')
    snapshot_date=$(echo $snapshot_name | cut -d'_' -f1)

    # Calculate age
    snapshot_epoch=$(date -d "$snapshot_date" +%s 2>/dev/null || echo 0)
    current_epoch=$(date +%s)
    age_days=$(( (current_epoch - snapshot_epoch) / 86400 ))

    if [ $age_days -gt $DAYS ]; then
        echo "Deleting old snapshot: $snapshot_name (${age_days} days old)"
        sudo timeshift --delete --snapshot "$snapshot_name" --scripted
    fi
done
```

```bash
#!/bin/bash
# monitor-snapshot-space.sh
# Alert if snapshot storage is running low

# Configuration
THRESHOLD=80  # Percentage
EMAIL="admin@example.com"

# Get snapshot device usage
USAGE=$(df /run/timeshift/backup 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//')

if [ -z "$USAGE" ]; then
    echo "Error: Could not determine snapshot storage usage"
    exit 1
fi

if [ $USAGE -gt $THRESHOLD ]; then
    echo "Warning: Snapshot storage at ${USAGE}% capacity"

    # List snapshots for review
    echo "Current snapshots:"
    sudo timeshift --list

    # Optional: Send email alert
    # echo "Snapshot storage at ${USAGE}%" | mail -s "Timeshift Alert" $EMAIL
fi
```

## Best Practices for Snapshot Storage

Proper storage management ensures Timeshift works reliably when you need it most.

### Disk Space Recommendations

```bash
# Check current disk usage
df -h

# Recommended minimum space for snapshots:
# - Root partition: 20-50 GB
# - Snapshot storage: 50-100 GB (2-3x root usage)

# Calculate space needed
ROOT_USED=$(df -h / | tail -1 | awk '{print $3}')
echo "Current root usage: ${ROOT_USED}"
echo "Recommended snapshot storage: 2-3x this amount"
```

### Storage Location Best Practices

1. **Use a Separate Partition**
   ```bash
   # Ideal setup: dedicated snapshot partition
   # /dev/sda2 - Root filesystem (/)
   # /dev/sda3 - Snapshot storage (/mnt/timeshift)

   # Create mount point
   sudo mkdir -p /mnt/timeshift

   # Add to fstab for automatic mounting
   echo "UUID=your-partition-uuid /mnt/timeshift ext4 defaults 0 2" | sudo tee -a /etc/fstab
   ```

2. **Use an External Drive**
   ```bash
   # External drive provides additional protection
   # against drive failure

   # List connected drives
   lsblk -f

   # Configure Timeshift to use external drive
   # via GUI or configuration file
   ```

3. **Avoid Storing on Root Partition**
   ```bash
   # Check if snapshots are on root (not recommended)
   mount | grep timeshift

   # If on root, consider moving to separate partition
   ```

### Retention Policy Recommendations

```bash
# Conservative policy (less space, shorter history)
{
  "count_monthly": "1",
  "count_weekly": "2",
  "count_daily": "3",
  "count_hourly": "0",
  "count_boot": "0"
}
# Approximate space: 2-3x root partition size

# Standard policy (balanced)
{
  "count_monthly": "2",
  "count_weekly": "3",
  "count_daily": "5",
  "count_hourly": "0",
  "count_boot": "3"
}
# Approximate space: 3-4x root partition size

# Aggressive policy (more history, more space)
{
  "count_monthly": "3",
  "count_weekly": "4",
  "count_daily": "7",
  "count_hourly": "12",
  "count_boot": "5"
}
# Approximate space: 4-5x root partition size
```

### Monitoring Snapshot Health

```bash
# Regular health check script
#!/bin/bash
# snapshot-health-check.sh

echo "=== Timeshift Health Check ==="
echo ""

# Check if Timeshift is installed
if ! command -v timeshift &> /dev/null; then
    echo "ERROR: Timeshift is not installed"
    exit 1
fi

# Check snapshot storage
echo "Snapshot Storage:"
sudo timeshift --list | head -10

# Check disk space
echo ""
echo "Disk Space:"
df -h /run/timeshift/backup 2>/dev/null || echo "Snapshot device not mounted"

# Check last snapshot date
echo ""
echo "Most Recent Snapshot:"
sudo timeshift --list | grep -E "^0" || echo "No snapshots found"

# Check for errors in system log
echo ""
echo "Recent Timeshift Errors:"
journalctl -u timeshift --since "7 days ago" --no-pager | grep -i error | tail -5 || echo "No errors found"
```

## Troubleshooting

Here are solutions to common Timeshift issues.

### Issue: "No snapshots found on device"

```bash
# Cause: Snapshot device not detected or mounted

# Solution 1: Check device is connected and mounted
lsblk -f
mount | grep timeshift

# Solution 2: Manually mount the device
sudo mount /dev/sda3 /run/timeshift/backup

# Solution 3: Reconfigure Timeshift
sudo timeshift-gtk
# Select the correct device in settings
```

### Issue: "Not enough disk space"

```bash
# Cause: Snapshot storage is full

# Solution 1: Delete old snapshots
sudo timeshift --list
sudo timeshift --delete --snapshot "old-snapshot-name"

# Solution 2: Reduce retention counts
sudo nano /etc/timeshift/timeshift.json
# Decrease count_daily, count_weekly, etc.

# Solution 3: Exclude large directories
sudo nano /etc/timeshift/timeshift.json
# Add exclusions for large directories

# Solution 4: Move to larger storage
# Configure Timeshift to use a larger partition
```

### Issue: "Failed to create snapshot"

```bash
# Check system logs for details
journalctl -xe | grep timeshift

# Common causes and solutions:

# 1. Permission issues
sudo chown root:root /etc/timeshift/timeshift.json

# 2. Corrupted configuration
sudo rm /etc/timeshift/timeshift.json
sudo timeshift-gtk  # Reconfigure

# 3. Rsync errors
sudo apt install --reinstall rsync

# 4. Filesystem errors
sudo fsck /dev/sda3  # Check snapshot partition
```

### Issue: "Restore failed" or "Restore incomplete"

```bash
# Solution 1: Try restore from Live USB
# Boot from Live USB and run:
sudo apt update && sudo apt install timeshift
sudo mount /dev/sda2 /mnt
sudo timeshift --restore --target /mnt

# Solution 2: Manually copy files from snapshot
sudo cp -a /run/timeshift/backup/timeshift/snapshots/SNAPSHOT_NAME/localhost/* /

# Solution 3: Check filesystem integrity
sudo fsck -y /dev/sda2
```

### Issue: "Timeshift GUI won't start"

```bash
# Check for errors
sudo timeshift-gtk 2>&1 | head -20

# Solution 1: Reset display configuration
export DISPLAY=:0
sudo timeshift-gtk

# Solution 2: Use command line instead
sudo timeshift --list
sudo timeshift --create

# Solution 3: Reinstall Timeshift
sudo apt remove --purge timeshift
sudo apt install timeshift
```

### Issue: "BTRFS snapshots not working"

```bash
# Verify BTRFS filesystem
df -T / | grep btrfs

# Check subvolume layout
sudo btrfs subvolume list /

# Required subvolumes for Timeshift BTRFS:
# @ for root
# @home for home (if including home)

# If subvolumes are different, reconfigure:
sudo timeshift-gtk
# Switch to RSYNC mode, or
# Recreate BTRFS with correct subvolume layout
```

### Issue: "Scheduled snapshots not running"

```bash
# Check cron job exists
cat /etc/cron.d/timeshift-hourly

# Check cron service is running
systemctl status cron

# Manually trigger scheduled check
sudo timeshift --check

# Check system time is correct
date
timedatectl status

# Review cron logs
grep timeshift /var/log/syslog | tail -20
```

### Diagnostic Commands Summary

```bash
# Complete diagnostic script
#!/bin/bash
echo "=== Timeshift Diagnostics ==="

echo -e "\n1. Version:"
timeshift --version

echo -e "\n2. Configuration:"
sudo cat /etc/timeshift/timeshift.json 2>/dev/null || echo "No config found"

echo -e "\n3. Snapshots:"
sudo timeshift --list 2>/dev/null || echo "Could not list snapshots"

echo -e "\n4. Storage:"
df -h /run/timeshift/backup 2>/dev/null || echo "Backup device not mounted"

echo -e "\n5. Filesystem Type:"
df -T / | tail -1

echo -e "\n6. Cron Job:"
cat /etc/cron.d/timeshift-hourly 2>/dev/null || echo "No cron job found"

echo -e "\n7. Recent Logs:"
journalctl -u timeshift --since "24 hours ago" --no-pager 2>/dev/null | tail -10 || echo "No journal entries"
```

## Conclusion

Timeshift is an invaluable tool for Ubuntu system administration, providing a safety net that can save hours of work when system issues occur. By following this guide, you should now be able to:

- Choose between RSYNC and BTRFS snapshot modes
- Install and configure Timeshift for your needs
- Create manual snapshots before critical changes
- Set up automated snapshot schedules
- Properly exclude directories to optimize storage
- Restore your system from snapshots when needed
- Use command-line options for scripting and automation
- Troubleshoot common issues

Remember that Timeshift protects your system files, not your personal data. Always maintain separate backups of your important documents, photos, and other personal files.

### Key Takeaways

1. **Create snapshots before changes**: Always snapshot before updates, installations, or configuration changes
2. **Use appropriate retention**: Balance disk space with recovery needs
3. **Test your backups**: Periodically verify that restoration works
4. **Separate storage**: Use a different partition or drive for snapshots
5. **Automate wisely**: Configure scheduled snapshots based on your usage patterns

---

## Monitor Your Ubuntu Systems with OneUptime

While Timeshift helps you recover from system issues, proactive monitoring helps you prevent them in the first place. [OneUptime](https://oneuptime.com) is a comprehensive monitoring platform that can help you keep your Ubuntu servers and applications running smoothly.

With OneUptime, you can:

- **Monitor server health**: Track CPU, memory, disk usage, and system load in real-time
- **Set up alerts**: Get notified before disk space runs low or services fail
- **Track uptime**: Monitor your services and receive instant notifications when they go down
- **Analyze performance**: Identify trends and potential issues before they impact users
- **Incident management**: Coordinate response when issues do occur

Combining Timeshift snapshots with OneUptime monitoring gives you both reactive recovery capabilities and proactive issue prevention, creating a robust system administration strategy for your Ubuntu infrastructure.

Visit [OneUptime](https://oneuptime.com) to learn more about how comprehensive monitoring can complement your backup strategy and keep your systems running reliably.
