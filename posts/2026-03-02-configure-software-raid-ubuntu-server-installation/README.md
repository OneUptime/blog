# How to Configure Software RAID During Ubuntu Server Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, RAID, Mdadm, Storage, High Availability

Description: Learn how to configure software RAID (mdadm) during Ubuntu Server installation, covering RAID 1, RAID 5, and RAID 10 configurations with practical setup and monitoring instructions.

---

Software RAID using Linux's `md` (Multiple Devices) subsystem and `mdadm` provides disk redundancy and performance benefits comparable to hardware RAID controllers, without the hardware cost and without the risk of losing data access if the RAID controller fails. Ubuntu Server supports RAID configuration directly in the installer, making it straightforward to set up a resilient storage layer before the OS is even installed.

## RAID Levels Overview

Choose the right RAID level based on your requirements:

### RAID 0 (Striping)

- **Disks required**: 2+
- **Usable capacity**: 100% of all disks combined
- **Redundancy**: None - one disk failure loses all data
- **Read/write performance**: Excellent (parallel access)
- **Use case**: Scratch space, non-critical fast storage

### RAID 1 (Mirroring)

- **Disks required**: 2 (or more for multi-mirror)
- **Usable capacity**: Size of the smallest disk
- **Redundancy**: Any disk can fail, data intact
- **Read performance**: Can read from either disk; write must complete on all
- **Use case**: OS drives, small databases, boot volumes

### RAID 5 (Striping with Distributed Parity)

- **Disks required**: 3+
- **Usable capacity**: (N-1) disks
- **Redundancy**: One disk failure tolerated
- **Performance**: Good reads, moderate writes (parity calculation)
- **Use case**: General file storage, cost-efficient redundancy

### RAID 6 (Striping with Double Parity)

- **Disks required**: 4+
- **Usable capacity**: (N-2) disks
- **Redundancy**: Two simultaneous disk failures tolerated
- **Performance**: Write overhead from double parity calculation
- **Use case**: Large storage arrays where rebuild time is long (risk of second failure during rebuild)

### RAID 10 (Striped Mirrors)

- **Disks required**: 4 (even number)
- **Usable capacity**: 50% of all disks
- **Redundancy**: One disk per mirror can fail; potentially multiple disk failures
- **Performance**: Best combination of reads and writes
- **Use case**: High-performance, high-availability storage; databases

## Configuring RAID During Ubuntu Installation

The Ubuntu Server installer (subiquity) supports RAID configuration in the custom storage layout view.

### RAID 1 for the OS Disk

RAID 1 for the system disk provides protection against disk failure without losing the server:

1. Select "Custom storage layout"
2. Select the first disk and create partitions:

```text
/dev/sda1  1 MB    BIOS boot (for BIOS) OR 512 MB fat32 EFI (for UEFI)
/dev/sda2  1 GB    Linux RAID (to be assembled as /boot)
/dev/sda3  rest    Linux RAID (to be assembled as / LV)
```

3. Repeat the same partition layout on the second disk (`/dev/sdb`)
4. Click "Create software RAID (md)"
5. Create RAID 1 array from `/dev/sda2` and `/dev/sdb2` - this becomes `md0`
6. Create RAID 1 array from `/dev/sda3` and `/dev/sdb3` - this becomes `md1`
7. Format `md0` as ext4 and mount as `/boot`
8. Use `md1` as an LVM PV, create VG, then LVs for `/` and swap

This gives you a server that survives a single disk failure and continues operating.

### RAID 5 with Three Disks

For RAID 5 in the installer:

1. Initialize all three disks with GPT
2. Create three partitions on each disk for EFI, /boot, and data
3. Use the installer's RAID creation UI to assemble:
   - `md0` = RAID 1 from `sda2`, `sdb2`, `sdc2` (or use one disk for /boot, mirror it across two)
   - `md1` = RAID 5 from `sda3`, `sdb3`, `sdc3` (data array)
4. Use `md1` as an LVM PV for the main storage

## Post-Installation RAID Setup with mdadm

For cases where you need to add RAID to an existing system or do more complex configurations:

### Creating a RAID 1 Array

```bash
# Install mdadm
sudo apt install mdadm -y

# Create RAID 1 with two disks
# The --create uses /dev/md0 as the array device
sudo mdadm --create /dev/md0 \
    --level=1 \
    --raid-devices=2 \
    /dev/sdb /dev/sdc

# Watch sync progress
cat /proc/mdstat

# Detailed status
sudo mdadm --detail /dev/md0
```

### Creating a RAID 5 Array

```bash
# RAID 5 with three disks
sudo mdadm --create /dev/md0 \
    --level=5 \
    --raid-devices=3 \
    /dev/sdb /dev/sdc /dev/sdd

# Optional: add a hot spare that automatically replaces a failed disk
sudo mdadm --create /dev/md0 \
    --level=5 \
    --raid-devices=3 \
    --spare-devices=1 \
    /dev/sdb /dev/sdc /dev/sdd /dev/sde

# Check sync status (RAID 5 initial sync takes time)
watch cat /proc/mdstat
```

### Creating a RAID 10 Array

```bash
# RAID 10 with four disks
sudo mdadm --create /dev/md0 \
    --level=10 \
    --raid-devices=4 \
    /dev/sdb /dev/sdc /dev/sdd /dev/sde

# RAID 10 starts immediately without needing initial sync
cat /proc/mdstat
```

### Making RAID Persistent Across Reboots

```bash
# Update /etc/mdadm/mdadm.conf with the new array
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf

# Update initramfs so the array is available at boot
sudo update-initramfs -u

# Verify the entry was added
grep md0 /etc/mdadm/mdadm.conf
```

### Formatting and Mounting

```bash
# Format the RAID array
sudo mkfs.ext4 /dev/md0

# Mount it
sudo mkdir -p /data
sudo mount /dev/md0 /data

# Add to /etc/fstab for automatic mounting
echo "$(sudo blkid -s UUID -o value /dev/md0)  /data  ext4  defaults,nofail  0  2" | \
    sudo tee -a /etc/fstab

# Verify fstab
sudo findmnt --verify
```

The `nofail` option is important - without it, a missing RAID array on boot can drop the system into emergency mode.

## Monitoring RAID Health

### Real-Time Status

```bash
# Quick status of all arrays
cat /proc/mdstat

# Example output for healthy RAID 5:
# Personalities : [raid5]
# md0 : active raid5 sdd[3] sdc[1] sdb[0]
#       2929893888 blocks super 1.2 level 5, 512k chunk, algorithm 2 [3/3] [UUU]
#
# unused devices: <none>

# Detailed status of a specific array
sudo mdadm --detail /dev/md0
```

### Email Alerts for RAID Events

Configure mdadm to send email when a disk fails or the array degrades:

```bash
# Edit mdadm configuration
sudo nano /etc/mdadm/mdadm.conf

# Add the MAILADDR line
MAILADDR admin@example.com

# Test that the monitoring works
sudo mdadm --monitor --test --oneshot /dev/md0
```

Enable the mdadm monitoring daemon:

```bash
sudo systemctl enable --now mdmonitor
sudo systemctl status mdmonitor
```

### Setting Up SMART Monitoring

SMART (Self-Monitoring, Analysis, and Reporting Technology) can predict disk failures:

```bash
# Install smartmontools
sudo apt install smartmontools -y

# Run a SMART self-test on each disk in the array
sudo smartctl -t short /dev/sdb
sudo smartctl -t short /dev/sdc
sudo smartctl -t short /dev/sdd

# Check results after the test completes (usually 2 minutes)
sudo smartctl -a /dev/sdb | grep -E "SMART|Health|Error"

# Enable periodic SMART testing in /etc/smartd.conf
sudo nano /etc/smartd.conf
# Add: DEVICESCAN -d removable -n standby -m admin@example.com -M exec /usr/share/smartmontools/smartd-runner
sudo systemctl enable --now smartd
```

## Simulating and Recovering from Disk Failure

### Simulating a Failure (Testing)

```bash
# Mark a disk as failed (for testing purposes)
sudo mdadm /dev/md0 --fail /dev/sdc

# Check the degraded state
cat /proc/mdstat
sudo mdadm --detail /dev/md0
# State should show "degraded"
```

### Removing the Failed Disk

```bash
# Remove the failed disk from the array
sudo mdadm /dev/md0 --remove /dev/sdc

# Verify the disk is removed
sudo mdadm --detail /dev/md0
```

### Adding a Replacement Disk

```bash
# The replacement disk must be equal to or larger than the others
# Partition it the same way as the other disks (if using partition-level RAID)
sudo fdisk /dev/sdc    # or sgdisk to copy partition table from sdb

# For whole-disk RAID, just add the new disk
sudo mdadm /dev/md0 --add /dev/sdc

# Watch the rebuild sync
watch cat /proc/mdstat
# Output shows resync progress:
# [==>..................]  recovery = 15.2% (2230144/14648384) finish=2.2min speed=89121K/sec
```

Rebuild time depends on array size and disk speed. A 1 TB RAID 5 can take 1-4 hours to rebuild.

### Rebuilding with a Hot Spare

If a hot spare was configured, the rebuild starts automatically when a disk fails:

```bash
# Verify the hot spare took over
cat /proc/mdstat
# The spare should appear as active, and the array should be syncing

# Add a new hot spare after replacing the failed disk
sudo mdadm /dev/md0 --add /dev/sde
```

## Checking and Repairing Arrays

```bash
# Check array for consistency (triggers a scrub)
sudo mdadm --action=check /dev/md0

# Monitor the check progress
cat /proc/mdstat

# Stop a running check
sudo mdadm --action=idle /dev/md0

# Schedule monthly checks via cron (or use the built-in mdadm cron)
cat /etc/cron.d/mdadm
```

## Growing a RAID Array

RAID 5 and RAID 6 can be grown by adding more disks (increasing redundancy or capacity):

```bash
# Add a new disk to an existing RAID 5 (growing from 3 to 4 disks)
sudo mdadm --add /dev/md0 /dev/sde

# Grow the array (use the new disk for data, not just as spare)
sudo mdadm --grow /dev/md0 --raid-devices=4

# Watch the reshape progress
cat /proc/mdstat
# This can take many hours on large arrays

# After reshape, grow the filesystem
sudo resize2fs /dev/md0
```

## RAID + LVM

Combining RAID and LVM gives you the best of both: RAID provides redundancy, LVM provides flexibility:

```bash
# Use the RAID array as an LVM physical volume
sudo pvcreate /dev/md0

# Create a volume group on the RAID array
sudo vgcreate vg-data /dev/md0

# Create logical volumes
sudo lvcreate -L 100G -n lv-db vg-data
sudo lvcreate -L 50G -n lv-files vg-data

# Format and mount
sudo mkfs.xfs /dev/vg-data/lv-db
sudo mount /dev/vg-data/lv-db /var/lib/postgresql
```

Software RAID on Ubuntu is reliable, mature, and performs well. The main advantage over hardware RAID is that the array is readable on any Linux system with mdadm installed - your data is not tied to a proprietary RAID controller that may fail or become unavailable. For servers where disk failure is a real concern, RAID 1 on the OS disks and RAID 5 or RAID 10 on the data disks is a solid and cost-effective architecture.
