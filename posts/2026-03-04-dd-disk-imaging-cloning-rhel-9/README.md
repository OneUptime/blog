# How to Use dd for Disk Imaging and Cloning on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Dd, Disk Imaging, Cloning

Description: Use dd on RHEL 9 for disk imaging, drive cloning, and byte-level backups.

---

## Overview

Use dd on RHEL 9 for disk imaging, drive cloning, and byte-level backups. A solid backup strategy protects against data loss from hardware failures, human errors, and security incidents.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Sufficient storage for backup files (local or remote)
- For remote backups: SSH access to the backup destination

## Step 1 - Choose Your Backup Tool

RHEL 9 provides several backup tools:

- **tar** - full archive backups
- **rsync** - incremental file synchronization
- **ReaR** - bare-metal disaster recovery images
- **LVM snapshots** - point-in-time filesystem snapshots
- **dd** - byte-level disk cloning

Select the tool that best matches your recovery requirements.

## Step 2 - Create the Backup

Identify the source disk before running dd:

```bash
lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS
```

Create a compressed disk image:

```bash
sudo sh -c 'dd if=/dev/sdX bs=64K status=progress conv=noerror,sync | gzip > /backups/sdX-$(date +%Y%m%d).img.gz'
```

Clone one disk to another disk:

```bash
sudo dd if=/dev/sdX of=/dev/sdY bs=64K status=progress conv=noerror,sync,fsync
```

## Step 3 - Automate with Cron

```bash
echo "0 2 * * * root /usr/local/bin/backup.sh" | sudo tee /etc/cron.d/daily-backup
```

## Step 4 - Verify the Backup

Always verify that backups are readable:

```bash
# For a compressed dd image
gzip -t /backups/sdX-*.img.gz

# For a cloned disk, compare the source and destination sizes
sudo blockdev --getsize64 /dev/sdX /dev/sdY
```

## Step 5 - Test Restoration

Periodically restore backups to a test environment to confirm they work:

```bash
# Restore a compressed dd image to a disk
sudo sh -c 'gzip -dc /backups/sdX-20260304.img.gz | dd of=/dev/sdY bs=64K status=progress conv=fsync'
```

## Summary

You have learned how to use dd for disk imaging and cloning. Remember the 3-2-1 rule: keep three copies of your data, on two different media types, with one copy stored off-site.
