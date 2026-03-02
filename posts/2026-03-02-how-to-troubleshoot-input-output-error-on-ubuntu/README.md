# How to Troubleshoot 'Input/Output Error' on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Troubleshooting, Disk Health, Filesystem, System Administration

Description: Diagnose and resolve Input/Output errors on Ubuntu, covering disk failure detection, filesystem corruption repair, SMART monitoring, and data recovery procedures.

---

An Input/Output error (EIO) means the kernel attempted to read or write data but the storage device couldn't complete the operation. This is typically a sign of hardware problems - bad sectors on a drive, failing storage controller, damaged cables, or filesystem corruption. The urgency depends on frequency: occasional I/O errors on a nearly-full drive might be filesystem issues, while frequent errors almost certainly indicate hardware failure.

## Immediate Assessment

When you see an I/O error, check the system log immediately:

```bash
# Check recent kernel messages for I/O errors
sudo dmesg | tail -50 | grep -iE "error|fail|warning|I/O"

# Check with timestamps
sudo dmesg -T | grep -iE "ata|sd[a-z]|nvme|error|fail" | tail -30

# Example of what disk I/O errors look like in dmesg:
# [12345.678901] ata1.00: failed command: READ DMA EXT
# [12345.678902] ata1.00: error: { ICRC ABRT }
# [12345.678903] ata1.00: exception Emask 0x0 SAct 0x0 SErr 0x0 action 0x6 frozen
# [12345.678910] sd 0:0:0:0: [sda] tag#0 FAILED Result: hostbyte=DID_ERROR driverbyte=DRIVER_OK

# Check persistent system logs
sudo journalctl -k --since "1 hour ago" | grep -iE "error|fail|I/O"
```

## Identifying Which Device Has Errors

```bash
# List all block devices and their mount points
lsblk

# Check filesystem usage
df -h

# Identify the device associated with a specific mount point
findmnt /home
# Or
cat /proc/mounts | grep sda
```

## Checking Disk Health with SMART

SMART (Self-Monitoring, Analysis and Reporting Technology) is a disk's built-in health monitoring system. It logs failure indicators that you can read before the disk completely fails:

```bash
# Install smartmontools if needed
sudo apt-get install -y smartmontools

# Check if SMART is available and enabled
sudo smartctl -i /dev/sda

# Run a quick SMART test (takes 1-2 minutes)
sudo smartctl -t short /dev/sda
# Wait for completion, then view results
sudo smartctl -a /dev/sda

# Run a comprehensive long test (hours for large drives)
sudo smartctl -t long /dev/sda

# View SMART report for all drives
for disk in /dev/sd[a-z] /dev/nvme[0-9]n[0-9]; do
    [ -b "$disk" ] && echo "=== $disk ===" && sudo smartctl -H "$disk"
done
```

### Critical SMART Attributes

Look for these specific attributes in the SMART output:

```bash
sudo smartctl -a /dev/sda | grep -E "Reallocated|Uncorrectable|Pending|Offline_Uncorrectable"

# Important SMART attributes:
# 5  Reallocated_Sector_Ct  - Sectors remapped due to errors (any > 0 is concerning)
# 187 Reported_Uncorrect    - Uncorrectable errors (should be 0)
# 196 Reallocated_Event_Count - Times sectors were reallocated
# 197 Current_Pending_Sector  - Sectors waiting to be reallocated (bad sectors)
# 198 Offline_Uncorrectable   - Uncorrectable errors during offline scan

# SMART overall health
sudo smartctl -H /dev/sda
# SMART overall-health self-assessment test result: PASSED
# (or FAILED - which means imminent failure)
```

## Checking Filesystem Integrity

If SMART looks OK but you're still getting I/O errors, the filesystem itself may be corrupted:

```bash
# Check filesystem for errors (the filesystem must be UNMOUNTED)
# For the root filesystem, do this from a live USB or recovery mode

# Check ext4 filesystem
sudo umount /dev/sdb1  # Only if it's not the root partition
sudo e2fsck -f /dev/sdb1

# Force check and auto-repair
sudo e2fsck -f -y /dev/sdb1

# Verbose output showing what's checked and fixed
sudo e2fsck -f -v -C 0 /dev/sdb1
```

### Checking Root Filesystem Without Unmounting

The root filesystem can't be checked while it's mounted in read-write mode. Schedule a check on next boot:

```bash
# Force fsck on next reboot for a specific partition
sudo tune2fs -C 100 /dev/sda1  # Set mount count high to trigger fsck

# Or touch this file (for root filesystem check on next boot)
sudo touch /forcefsck

# Reboot the system (fsck runs before mounting root read-write)
sudo reboot

# Check the result after reboot
sudo dmesg | grep -i fsck
sudo journalctl -b -1 | grep -i fsck
```

### Checking XFS Filesystems

```bash
# Check XFS filesystem (must be unmounted)
sudo xfs_check /dev/sdb1

# Repair XFS filesystem
sudo xfs_repair /dev/sdb1

# If xfs_repair fails, try with -L (dangerous - clears the log)
sudo xfs_repair -L /dev/sdb1
```

## Identifying Bad Sectors

```bash
# Scan for bad sectors (read-only test - safe to run on mounted filesystem)
# WARNING: Takes hours on large drives
sudo badblocks -v /dev/sdb 2>&1 | tee /tmp/badblocks-output.txt

# Non-destructive read-write test (VERY DANGEROUS - only on unmounted disks with no important data)
# sudo badblocks -w -v /dev/sdb

# Run badblocks as part of e2fsck (reads existing bad block list)
sudo e2fsck -c /dev/sdb1  # Uses badblocks internally
```

## Handling Read Errors on a Mounted Filesystem

When a drive has read errors on a currently mounted filesystem:

```bash
# Check which files are affected by I/O errors
# Look for files that fail to read
sudo find /affected/directory -type f -exec md5sum {} \; 2>&1 | grep "Input/output error"

# Try to copy readable data from a damaged partition
# ddrescue is much smarter than dd for failing drives
sudo apt-get install -y gddrescue

# Create an image of the damaged disk, skipping errors
sudo ddrescue -d -r3 /dev/sdb /mnt/backup/sdb.img /mnt/backup/sdb.log

# If the first run fails on some sectors, retry with more passes
sudo ddrescue -d -r10 /dev/sdb /mnt/backup/sdb.img /mnt/backup/sdb.log

# Mount the recovered image to extract files
sudo mount -o loop,ro /mnt/backup/sdb.img /mnt/recovered
```

## Remounting a Filesystem Read-Only

When a filesystem detects unrecoverable errors, the kernel may automatically remount it read-only to prevent further corruption. You'll see this in logs:

```bash
sudo dmesg | grep "remounting"
# EXT4-fs error: ... Remounting filesystem read-only

# Check current mount options
cat /proc/mounts | grep sda1

# If this happens on the root filesystem, the system is severely impaired
# Reboot and run fsck from recovery mode
```

## Replacing a Failing Drive

If SMART indicates imminent failure, replace the drive immediately:

```bash
# For non-RAID systems:
# 1. Back up all data NOW before doing anything else
rsync -av --progress /important/data /backup/location/

# 2. Replace the physical drive
# 3. Restore from backup or reinstall the OS

# For RAID systems (mdadm):
# Check RAID status
cat /proc/mdstat
sudo mdadm --detail /dev/md0

# Remove the failing drive from the RAID array
sudo mdadm /dev/md0 --fail /dev/sdb1
sudo mdadm /dev/md0 --remove /dev/sdb1

# After replacing the physical drive, add the new drive to the array
sudo mdadm /dev/md0 --add /dev/sdc1

# Monitor the rebuild
watch cat /proc/mdstat
```

## NVMe-Specific Diagnostics

For NVMe drives, use `nvme-cli`:

```bash
# Install nvme-cli
sudo apt-get install -y nvme-cli

# List NVMe devices
sudo nvme list

# Check health
sudo nvme smart-log /dev/nvme0

# Run self-test
sudo nvme device-self-test /dev/nvme0 --self-test-code=1  # Short test

# View self-test results
sudo nvme self-test-log /dev/nvme0
```

## Monitoring for I/O Errors

Set up proactive monitoring to catch problems before they cause data loss:

```bash
# Enable SMART daemon to monitor all drives
sudo apt-get install -y smartmontools

# Configure smartd
sudo nano /etc/smartd.conf
```

```
# /etc/smartd.conf
# Monitor all drives, run short test weekly, long test monthly
# Email on failure or attribute change
DEVICESCAN -a -o on -S on \
    -s (S/../.././02|L/../../6/03) \
    -m root \
    -M exec /usr/share/smartmontools/smartd-runner
```

```bash
sudo systemctl enable --now smartd

# Verify smartd is monitoring your drives
sudo smartctl -a /dev/sda | grep "SMART Attribute"
```

## Summary

I/O errors on Ubuntu follow a diagnostic hierarchy:

1. Check `dmesg` immediately for kernel error messages identifying the failing device
2. Run SMART diagnostics to assess drive health - any reallocated sectors or uncorrectable errors indicate hardware problems
3. If SMART is clean, check the filesystem with `e2fsck` or `xfs_repair`
4. Use `ddrescue` for data recovery from partially failing drives
5. Replace any drive showing SMART failure predictions before the situation becomes unrecoverable

The most critical rule: when you see recurring I/O errors, back up data immediately before doing any diagnostics. Diagnostic operations can stress an already-failing drive and accelerate complete failure.
