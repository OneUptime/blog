# How to Replace a Failed Disk in mdadm RAID on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, RAID, Mdadm, Storage, Disk Management

Description: Step-by-step procedure for safely removing a failed disk from an mdadm RAID array on Ubuntu and replacing it with a new drive without data loss.

---

Disk failures in a RAID array are expected events, not exceptional ones. What matters is how quickly and correctly you replace the failed disk. Mdadm, the Linux software RAID tool, makes the replacement process well-defined. The key is acting promptly when a disk fails - a RAID-5 array can survive one disk loss, but you're exposed during the rebuild period. A second failure before rebuild completes means data loss.

This guide covers the complete process from detecting the failure to full array rebuild.

## Detecting the Failure

You should have email notifications configured for mdadm events. If not, check the array status manually:

```bash
# Check overall RAID status
cat /proc/mdstat

# Detailed status of a specific array
sudo mdadm --detail /dev/md0

# Check for disk-level errors
sudo mdadm --detail /dev/md0 | grep -E 'State|Failed|Active|Working'
```

Example output showing a failed disk:

```text
/dev/md0:
           Version : 1.2
     Creation Time : Mon Jan 20 10:00:00 2026
        Raid Level : raid5
        Array Size : 2929893888 (2793.96 GiB 2999.93 GB)
     Used Dev Size : 976631296 (931.32 GiB 999.97 GB)
      Raid Devices : 4
     Total Devices : 3
       Persistence : Superblock is persistent

         Raid Level : 5
       Chunk Size   : 512K

Consistency Policy : resync

              Name : server01:0 (local to host server01)
              UUID : xxxxxxxx:xxxx:xxxx:xxxx
            Events : 147

    Number   Major   Minor   RaidDevice State
       0     253        1        0      active sync   /dev/sda1
       1     253       17        1      active sync   /dev/sdb1
       4       0        0        2      removed
       3     253       49        3      active sync   /dev/sdd1
```

The "removed" entry and "Total Devices: 3" vs "Raid Devices: 4" confirm a failed disk. Also check system logs:

```bash
sudo journalctl -k | grep -E 'md|raid|disk|ata' | tail -30
dmesg | grep -E 'I/O error|error|failed' | tail -30
```

## Identifying the Failed Disk

Match the RAID member to a physical disk:

```bash
# See which disks are in the array and their current state
sudo mdadm --detail /dev/md0

# Check which physical device has errors
sudo dmesg | grep "I/O error" | tail -20

# Cross-reference with disk serial numbers (useful for physical replacement)
sudo hdparm -I /dev/sda | grep Serial
sudo smartctl -i /dev/sda | grep Serial

# Run a SMART test to confirm disk health
sudo smartctl -t short /dev/sdc
sudo smartctl -a /dev/sdc | grep -E 'SMART overall|Error|Hours'
```

## Marking the Disk as Failed (If Not Auto-Detected)

If mdadm hasn't already marked the disk as faulty:

```bash
# Force the disk to failed state
sudo mdadm --manage /dev/md0 --fail /dev/sdc1

# Verify it's marked as faulty
sudo mdadm --detail /dev/md0 | grep faulty
```

## Removing the Failed Disk from the Array

Before physically removing the disk, remove it from the array:

```bash
# Remove the failed device from the array
sudo mdadm --manage /dev/md0 --remove /dev/sdc1

# Confirm removal
sudo mdadm --detail /dev/md0
cat /proc/mdstat
```

Now the disk is safe to physically remove. For hot-swap capable systems (most modern servers with SATA or SAS backplanes), you can remove the disk without powering down. For systems without hot-swap:

```bash
# Power down the system
sudo shutdown -h now
# Physically replace the disk, then power back on
```

## Preparing the Replacement Disk

After inserting the new disk, identify it:

```bash
# List block devices to find the new disk
lsblk
ls /dev/sd*

# Check for any existing data on the new disk
sudo fdisk -l /dev/sdc

# Get disk identifiers
sudo hdparm -I /dev/sdc | grep -E 'Serial|Model|Firmware'
```

If the replacement disk is the same size or larger, partition it to match the other RAID members:

```bash
# View partitioning on a working disk to replicate it
sudo fdisk -l /dev/sda

# Option 1: Copy the partition table from a working disk
sudo sfdisk -d /dev/sda | sudo sfdisk /dev/sdc

# Option 2: Use sgdisk for GPT disks
sudo sgdisk /dev/sda -R /dev/sdc  # replicate partition table
sudo sgdisk -G /dev/sdc           # randomize GUID to avoid conflicts

# Option 3: Manual partition with fdisk
sudo fdisk /dev/sdc
# Create partition of same type and size as the original
```

Verify the partition is correct:

```bash
sudo fdisk -l /dev/sdc
# Should show sdc1 with same type (fd Linux raid autodetect or similar) and size
```

## Adding the Replacement Disk to the Array

```bash
# Add the new partition to the RAID array
sudo mdadm --manage /dev/md0 --add /dev/sdc1

# Watch the rebuild begin
cat /proc/mdstat
```

The rebuild starts immediately:

```text
Personalities : [raid5]
md0 : active raid5 sdd1[3] sdb1[1] sda1[0] sdc1[4]
      2929893888 blocks super 1.2 level 5, 512k chunk, algorithm 2 [4/3] [UUU_]
      [=>...................]  recovery = 8.5% (83221504/976631296) finish=68.4min speed=217520K/sec
```

The `[UUU_]` shows 3 of 4 disks healthy, with recovery underway.

## Monitoring the Rebuild

```bash
# Watch rebuild progress in real time
watch -n 5 cat /proc/mdstat

# Check estimated completion time
cat /proc/mdstat | grep -E 'recovery|resync'

# Detailed rebuild status
sudo mdadm --detail /dev/md0 | grep -E 'State|Rebuild|Active'
```

The array remains fully functional during rebuild - clients can still read and write. The rebuild does put additional I/O load on the remaining disks and can be slow (hours for large arrays).

## Tuning Rebuild Speed

By default, the kernel limits rebuild speed to minimize impact on production I/O. You can adjust this:

```bash
# Check current rebuild speed limits
cat /proc/sys/dev/raid/speed_limit_min
cat /proc/sys/dev/raid/speed_limit_max

# Increase rebuild speed (useful when the system is otherwise idle)
echo 200000 | sudo tee /proc/sys/dev/raid/speed_limit_min
echo 400000 | sudo tee /proc/sys/dev/raid/speed_limit_max

# Restore conservative limits when production load picks back up
echo 1000 | sudo tee /proc/sys/dev/raid/speed_limit_min
echo 200000 | sudo tee /proc/sys/dev/raid/speed_limit_max
```

## Verifying the Completed Rebuild

After the rebuild finishes (cat /proc/mdstat shows no recovery in progress):

```bash
# Check array is fully healthy
sudo mdadm --detail /dev/md0

# Expected output:
#   State : clean
#   Active Devices : 4
# Working Devices : 4
#   Failed Devices : 0
#  Spare Devices : 0

# Array status should show all [U]s
cat /proc/mdstat
```

## Updating mdadm Configuration

If the array configuration uses device names (not UUIDs), update the config to include the new disk:

```bash
# Regenerate the mdadm configuration
sudo mdadm --detail --scan | sudo tee /etc/mdadm/mdadm.conf

# Update the initramfs to include the new configuration
sudo update-initramfs -u

# Verify the config
cat /etc/mdadm/mdadm.conf
```

## Setting Up Monitoring to Catch Future Failures

```bash
# Configure mdadm to send email alerts
sudo nano /etc/mdadm/mdadm.conf

# Add or modify the MAILADDR line:
# MAILADDR admin@example.com

# Enable the mdadm monitoring daemon
sudo systemctl enable --now mdmonitor

# Test that alerts work
sudo mdadm --monitor --test --oneshot /dev/md0
```

## Running a Post-Replacement Check

After the rebuild, run a consistency check to verify data integrity:

```bash
# Start a check (runs in background, minimal impact)
echo check | sudo tee /sys/block/md0/md/sync_action

# Monitor progress
cat /proc/mdstat

# When complete, check for mismatches
cat /sys/block/md0/md/mismatch_cnt
# Should be 0 - any non-zero value indicates data inconsistency
```

Quick action after a disk failure and careful monitoring during rebuild are what separate a non-event from a crisis. With mdadm, the replacement procedure is straightforward, but don't delay - every hour running degraded is an hour of exposure to a second failure.
