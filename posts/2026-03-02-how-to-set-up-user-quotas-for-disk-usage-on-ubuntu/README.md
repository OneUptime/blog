# How to Set Up User Quotas for Disk Usage on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, Linux, System Administration

Description: Learn how to configure user and group disk quotas on Ubuntu to limit filesystem usage, prevent storage exhaustion, and monitor disk consumption by user.

---

Disk quotas prevent individual users from consuming unlimited filesystem space and causing issues for everyone else. On shared servers - development machines, file servers, web hosting environments - quotas are a practical necessity. Ubuntu includes quota tools in its repositories, and implementation requires enabling quota support in the filesystem and then configuring limits per user or group.

## How Disk Quotas Work

Quotas track and limit disk usage at the filesystem level. When a user tries to write data that would exceed their quota, the write fails with a "Disk quota exceeded" error. There are two types of limits:

- **Soft limit**: A warning threshold. Users can exceed this temporarily (during the grace period)
- **Hard limit**: An absolute ceiling. Writes fail immediately when this is reached

Each limit applies to both:
- **Blocks** (disk space, measured in 1KB blocks by default)
- **Inodes** (number of files and directories)

## Installing Quota Tools

```bash
# Install quota utilities
sudo apt install quota quotatool

# Verify installation
quota --version
repquota --version
```

## Enabling Quotas on a Filesystem

Quota support must be enabled in the filesystem's mount options. First, identify which filesystem you want to apply quotas to:

```bash
# View mounted filesystems
df -h
mount | grep -E "ext4|xfs|ext3"

# For this example, we'll use the /home partition (common quota target)
cat /etc/fstab
```

### Enabling Quotas on ext4

Edit `/etc/fstab` to add quota options:

```bash
# Original /etc/fstab entry:
# UUID=abc123 /home ext4 defaults 0 2

# Modified entry (add usrquota and/or grpquota):
sudo nano /etc/fstab

# Change:
# UUID=abc123 /home ext4 defaults,usrquota,grpquota 0 2
```

```bash
# Remount with new options
sudo mount -o remount /home

# Verify options are in effect
mount | grep /home
# Should show: usrquota,grpquota in the options
```

### Enabling Quotas on XFS

XFS handles quotas differently - you enable them at mount time rather than creating separate quota files:

```bash
# XFS /etc/fstab entry with quotas:
# UUID=abc123 /home xfs defaults,usrquota,grpquota 0 2

# XFS doesn't need separate quota initialization steps
# The mount options alone are sufficient
```

## Initializing Quota Databases (ext4)

After remounting with quota options, create the quota database files:

```bash
# Create quota database files
sudo quotacheck -cugm /home
# -c  Create new quota files
# -u  Include user quotas
# -g  Include group quotas
# -m  Don't remount read-only during check

# Verify the quota files were created
ls -la /home/aquota.*
# /home/aquota.group  (group quota database)
# /home/aquota.user   (user quota database)

# Turn on quota enforcement
sudo quotaon /home

# Verify quotas are running
sudo quotaon -p /home
# /dev/sda1 [/home]: user quotas turned on
# /dev/sda1 [/home]: group quotas turned on
```

## Setting Quotas for Individual Users

Use `edquota` to set limits for a user:

```bash
# Edit quotas for user alice (opens in $EDITOR, typically nano or vi)
sudo edquota alice
```

This displays something like:

```
Disk quotas for user alice (uid 1001):
  Filesystem                   blocks       soft       hard     inodes     isoft     ihard
  /dev/sda1                         0      0          0          0        0         0
```

Set the limits:

```
Disk quotas for user alice (uid 1001):
  Filesystem                   blocks       soft       hard     inodes     isoft     ihard
  /dev/sda1                         0   2097152    2621440          0        0         0
```

In this example:
- Soft block limit: 2097152 KB (2 GB) - warning threshold
- Hard block limit: 2621440 KB (2.5 GB) - absolute maximum
- Inodes: 0 means no inode limit

### Setting Quotas Non-Interactively with setquota

For scripting:

```bash
# setquota user soft-blocks hard-blocks soft-inodes hard-inodes filesystem
sudo setquota alice 2097152 2621440 0 0 /home

# Set both block and inode limits
sudo setquota alice 2097152 2621440 50000 60000 /home

# Parameters:
# 2097152 = soft block limit (2GB in KB)
# 2621440 = hard block limit (2.5GB in KB)
# 50000   = soft inode limit (50,000 files)
# 60000   = hard inode limit (60,000 files)
```

## Setting Quotas for Groups

Group quotas apply to all files owned by that group:

```bash
# Set quota for a group
sudo edquota -g developers

# Non-interactively:
sudo setquota -g developers 10485760 13107200 0 0 /home
# 10GB soft / 12.5GB hard for the developers group
```

## Using a Template for Multiple Users

If you need to apply the same quota to many users:

```bash
# Set up a template user with the desired limits
sudo edquota alice  # Configure alice's limits as your template

# Apply alice's quota settings to other users
sudo edquota -p alice bob charlie dave

# Or copy to many users with a loop
for user in bob charlie dave; do
    sudo edquota -p alice "$user"
    echo "Applied quota to $user"
done
```

## Setting the Grace Period

The grace period is how long users can exceed their soft limit before it becomes enforced like a hard limit:

```bash
# Set grace period (opens editor similar to edquota)
sudo edquota -t

# Example output to edit:
# Grace period before enforcing soft limits for users:
# Time units may be: days, hours, minutes, or seconds
#   Filesystem             Block grace period     Inode grace period
#   /dev/sda1              7days                  7days

# Change to 3 days:
#   /dev/sda1              3days                  3days
```

## Monitoring Quota Usage

```bash
# Check quota for a specific user (run as that user or as root)
quota alice
quota -s alice  # Human-readable sizes

# Check quota for the current user
quota

# Summary report for all users on a filesystem
sudo repquota /home

# Human-readable repquota
sudo repquota -s /home

# Example repquota output:
# User            used    soft    hard  grace    used  soft  hard  grace
# alice     --  1024M   2048M   2560M           1234     0     0
# bob       --   500M   2048M   2560M            567     0     0
# charlie   +-  2100M   2048M   2560M  6days     800     0     0
# (+ next to name means soft limit exceeded, - means under limit)

# Report on all filesystems with quota
sudo repquota -a
```

## Checking Quota Status and Turning On/Off

```bash
# Check if quotas are running
sudo quotaon -p -a

# Turn quotas on for all filesystems with quota options
sudo quotaon -a

# Turn quotas off (for maintenance)
sudo quotaoff /home

# Check quota usage stats
sudo quotacheck -v /home
```

## Scripted Quota Setup for Multiple Users

```bash
#!/bin/bash
# setup-user-quotas.sh
# Apply standard quotas to all users in the standard UID range

FILESYSTEM="/home"
SOFT_BLOCKS=2097152     # 2GB in KB
HARD_BLOCKS=2621440     # 2.5GB in KB
SOFT_INODES=50000
HARD_INODES=60000

# Get all regular users (UID >= 1000, not nobody)
awk -F: '$3 >= 1000 && $3 < 65534 {print $1}' /etc/passwd | while read username; do
    echo "Setting quota for $username..."
    sudo setquota "$username" \
        $SOFT_BLOCKS $HARD_BLOCKS \
        $SOFT_INODES $HARD_INODES \
        $FILESYSTEM
done

echo "Quotas set. Current status:"
sudo repquota -s $FILESYSTEM
```

## Notifications for Users Near Quota

Ubuntu's quota tools can send email warnings:

```bash
# Install warnquota
sudo apt install quota

# Configure warnquota
sudo nano /etc/warnquota.conf

# Set up a cron job to send warnings
echo "0 7 * * * root /usr/sbin/warnquota" | sudo tee /etc/cron.d/warnquota
```

Disk quotas work transparently to users until they reach their limits. The combination of soft limits with grace periods and hard limits provides flexibility - a user can temporarily exceed their allocated space (for a download, build process, etc.) while still having a firm ceiling that prevents unbounded growth. Regular `repquota` reports give visibility into storage consumption before it becomes a problem.
