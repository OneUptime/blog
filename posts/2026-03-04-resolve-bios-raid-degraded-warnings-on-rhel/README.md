# How to Resolve 'BIOS RAID Degraded' Warnings on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RAID, Storage, Hardware, Troubleshooting

Description: Handle BIOS RAID degraded warnings on RHEL by identifying the failed disk, replacing it, and rebuilding the array to restore redundancy.

---

A "BIOS RAID Degraded" warning means one or more disks in a hardware or firmware RAID array have failed or been removed. The array is still functional but has lost redundancy. A second failure could mean data loss.

## Step 1: Identify the RAID Type

Determine if you are using hardware RAID, firmware (fake) RAID, or software RAID:

```bash
# Check for Linux software RAID (mdadm)
cat /proc/mdstat

# Check for device-mapper RAID (dmraid/fake RAID)
sudo dmraid -s

# Check for hardware RAID (vendor-specific tools)
# Dell: omreport
# HP/HPE: ssacli or hpssacli
# LSI/Broadcom: storcli or MegaCli
```

## Step 2: For Software RAID (mdadm)

```bash
# Check the array status
sudo mdadm --detail /dev/md0

# Look for "State : degraded" and identify the failed disk
# The output shows each member disk and its status

# Example output:
# /dev/sda1 - active sync
# /dev/sdb1 - removed (faulty)
```

### Remove the Failed Disk

```bash
# Mark the disk as failed (if not already)
sudo mdadm --manage /dev/md0 --fail /dev/sdb1

# Remove the failed disk from the array
sudo mdadm --manage /dev/md0 --remove /dev/sdb1
```

### Add a Replacement Disk

```bash
# After physically replacing the failed disk
# Partition the new disk to match the existing one
sudo sfdisk -d /dev/sda | sudo sfdisk /dev/sdb

# Add the new disk to the array
sudo mdadm --manage /dev/md0 --add /dev/sdb1

# Monitor the rebuild progress
watch cat /proc/mdstat

# The rebuild can take hours depending on disk size
```

## Step 3: For Firmware RAID (dmraid)

```bash
# Check dmraid status
sudo dmraid -s
sudo dmraid -r

# Firmware RAID is managed through the BIOS/UEFI setup
# Reboot and enter the RAID BIOS utility to:
# 1. Identify the failed disk
# 2. Mark it for replacement
# 3. Add the new disk to the array
# 4. Start the rebuild
```

## Step 4: For Hardware RAID (Dell PERC Example)

```bash
# Install the management tools
# Dell: sudo dnf install -y srvadmin-all
# Or use perccli/storcli

# Check the controller and array status
sudo perccli /c0 show

# Identify the failed drive
sudo perccli /c0/eall/sall show

# After physical replacement, the controller usually
# starts rebuilding automatically

# Monitor rebuild progress
sudo perccli /c0/eall/sall show rebuild
```

## Step 5: Verify the Rebuild

```bash
# For mdadm
sudo mdadm --detail /dev/md0
# State should return to "active" (not "degraded")

# Check dmesg for any errors during rebuild
dmesg | grep -i raid
```

## Monitoring and Alerts

```bash
# Set up mdadm monitoring
sudo vi /etc/mdadm.conf
# Add: MAILADDR admin@example.com

# Enable the mdadm monitor
sudo systemctl enable --now mdmonitor

# Test the alert
sudo mdadm --monitor --scan --test --oneshot
```

## Preventive Measures

```bash
# Regularly check RAID health
cat /proc/mdstat

# Schedule periodic RAID scrubs
echo "check" | sudo tee /sys/block/md0/md/sync_action

# Monitor SMART on all drives
sudo smartctl -H /dev/sda
sudo smartctl -H /dev/sdb
```

Do not delay replacing failed drives. A degraded array is one failure away from data loss. Always keep spare drives available for critical systems.
