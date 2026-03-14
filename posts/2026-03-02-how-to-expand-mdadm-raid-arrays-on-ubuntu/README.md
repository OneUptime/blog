# How to Expand mdadm RAID Arrays on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, RAID, Storage, Mdadm, Disk Management

Description: Expand an existing mdadm software RAID array on Ubuntu by adding disks or replacing smaller disks with larger ones to increase available storage capacity.

---

Growing a software RAID array without data loss is one of the more involved storage operations on Linux. mdadm supports several expansion methods depending on your RAID level and the type of expansion you need. This guide covers adding drives to increase disk count, replacing existing drives with larger ones, and expanding the filesystem after the RAID array grows.

**Important:** Always back up data before modifying RAID arrays. While these operations preserve data, hardware failures during a long reshape can cause data loss.

## Understanding RAID Expansion Methods

Different RAID levels expand differently:

- **RAID 1 (mirror):** Replace drives with larger ones, one at a time. The usable space increases only when all drives are replaced.
- **RAID 5/6:** Can add drives to increase both capacity and stripe count. mdadm reshapes the array, redistributing data across all drives.
- **RAID 10:** Add pairs of drives. More complex to expand.

## Checking Current Array Status

Before expanding, understand the current state:

```bash
# Show all RAID arrays and their status
sudo mdadm --detail --scan

# Show detailed information for a specific array
sudo mdadm --detail /dev/md0

# Check if any array is degraded
cat /proc/mdstat
```

Example output from `/proc/mdstat`:

```text
Personalities : [raid5]
md0 : active raid5 sda[0] sdb[1] sdc[2]
      2929000000 blocks super 1.2 level 5, 512k chunk, algorithm 2 [3/3] [UUU]
```

The `[3/3] [UUU]` means 3 of 3 drives active and healthy. A degraded array shows `[3/4] [UUU_]`.

## Method 1: Add Drives to Increase Stripe Count (RAID 5/6)

Adding a drive to RAID 5 increases both capacity and provides one more drive of redundancy.

### Prepare the New Drive

```bash
# Check the new drive is detected
lsblk | grep sdd

# Zero the superblock to ensure no old RAID data
sudo mdadm --zero-superblock /dev/sdd

# Partition the new drive to match existing drives (optional but recommended)
# Check existing drive partitioning
sudo fdisk -l /dev/sda

# Create matching partition on new drive
sudo fdisk /dev/sdd
# Create a new partition using the same type as existing drives
# Press n (new), p (primary), 1 (partition number), accept defaults, t (type), fd (Linux RAID), w (write)
```

### Add the Drive to the Array

```bash
# Add the new drive as a spare first
sudo mdadm --add /dev/md0 /dev/sdd

# Verify it was added as spare
sudo mdadm --detail /dev/md0 | grep -E "Spare|State"
```

### Grow the Array to Use the New Drive

```bash
# Grow RAID 5 from 3 to 4 drives
sudo mdadm --grow /dev/md0 --raid-devices=4

# Monitor the reshape progress - this takes hours for large arrays
watch -n 10 cat /proc/mdstat
```

During reshape, `/proc/mdstat` shows progress:

```text
md0 : active raid5 sdd[3] sda[0] sdb[1] sdc[2]
      3905000000 blocks super 1.2 level 5, 512k chunk, algorithm 2 [4/4] [UUUU]
      [==>..................]  reshape = 12.4% (145778432/1172947200) finish=180.0min speed=95000K/sec
```

Do not interrupt this process. The array remains usable during reshape, but performance is reduced.

### Expand the Filesystem

After the RAID grows, expand the filesystem to use the new space:

```bash
# Check that the RAID array is complete
sudo mdadm --detail /dev/md0 | grep "State"
# Should show "clean" or "active"

# Check new array size
sudo mdadm --detail /dev/md0 | grep "Array Size"

# For ext4 filesystem - can resize while mounted
sudo resize2fs /dev/md0

# For XFS filesystem - can resize while mounted
sudo xfs_growfs /mnt/data

# Verify new filesystem size
df -h /mnt/data
```

## Method 2: Replace Drives with Larger Ones (RAID 1/5/6)

When replacing all drives with larger ones in a RAID array, the process is one drive at a time.

### Step 1: Fail and Remove the First Drive

```bash
# Intentionally fail and remove one drive from the array
sudo mdadm --fail /dev/md0 /dev/sda
sudo mdadm --remove /dev/md0 /dev/sda

# Verify the drive is removed
sudo mdadm --detail /dev/md0
# Should show the array is degraded
```

Physically replace the drive if needed, or use a new drive that is already installed.

### Step 2: Prepare the New Drive

```bash
# Copy the partition table from a remaining drive to the new one
# For GPT partitions
sudo sgdisk -R /dev/sde /dev/sdb    # Copy from sdb to new sde
sudo sgdisk -G /dev/sde             # Randomize GUID on the new drive

# Or for MBR partitions
sudo sfdisk -d /dev/sdb | sudo sfdisk /dev/sde
```

### Step 3: Add the New Drive

```bash
# Add the new drive to the array
sudo mdadm --add /dev/md0 /dev/sde

# Watch the rebuild (sync)
watch -n 10 cat /proc/mdstat
```

Wait for the rebuild to complete before replacing the next drive. Running a RAID 1 degraded with a rebuild in progress is risky - another failure at this point means data loss.

### Step 4: Repeat for Remaining Drives

Repeat the fail/remove/replace/rebuild cycle for each drive.

### Step 5: Grow the Array to Use Extra Space

After all drives are replaced with larger ones, the RAID array still uses the old size. Grow it:

```bash
# For RAID 1 - grow to use full disk size
sudo mdadm --grow /dev/md0 --size=max

# Verify new array size
sudo mdadm --detail /dev/md0 | grep "Array Size"

# Expand the partition if using partitions
# Use parted or gdisk to resize the partition first
sudo parted /dev/md0 resizepart 1 100%

# Then expand the filesystem
sudo resize2fs /dev/md0    # ext4
# or
sudo xfs_growfs /mnt/data  # xfs
```

## Monitoring Long-Running Reshapes

Reshaping a large RAID array takes time. Set up monitoring:

```bash
# Check remaining time estimate
cat /proc/mdstat | grep "finish"

# Get email alerts on completion or failure
sudo mdadm --monitor --mail=admin@example.com --delay=300 /dev/md0 &

# Or watch with a script
while true; do
    STATUS=$(cat /proc/mdstat | grep "md0")
    echo "$(date): $STATUS"
    if echo "$STATUS" | grep -qv "reshape\|recover"; then
        echo "Reshape complete or stopped"
        break
    fi
    sleep 60
done
```

## Adjusting Reshape Speed

By default, mdadm limits reshape speed to avoid saturating I/O. You can adjust this:

```bash
# Check current speed limits
cat /proc/sys/dev/raid/speed_limit_min
cat /proc/sys/dev/raid/speed_limit_max

# Increase max speed for faster reshape (reduces system I/O performance)
echo 200000 | sudo tee /proc/sys/dev/raid/speed_limit_max

# Reduce speed to avoid impacting production workloads
echo 10000 | sudo tee /proc/sys/dev/raid/speed_limit_max

# Make permanent
echo "dev.raid.speed_limit_max = 200000" | sudo tee /etc/sysctl.d/60-raid.conf
sudo sysctl -p /etc/sysctl.d/60-raid.conf
```

## Updating mdadm Configuration

After expanding, update the mdadm configuration to reflect the new array:

```bash
# Scan and update /etc/mdadm/mdadm.conf
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf

# Or create a new config
sudo mdadm --detail --scan > /tmp/mdadm.conf
sudo cp /tmp/mdadm.conf /etc/mdadm/mdadm.conf

# Update initramfs to include the new configuration
sudo update-initramfs -u
```

## Verifying Array Integrity After Expansion

Run a check after the expansion completes:

```bash
# Start an array check
echo check | sudo tee /sys/block/md0/md/sync_action

# Monitor the check
watch -n 10 cat /proc/mdstat

# Check for mismatch count (should be 0 for clean arrays)
cat /sys/block/md0/md/mismatch_cnt
```

A mismatch count greater than 0 on RAID 5/6 after a check indicates potential data corruption. Run `echo repair` instead of `check` to attempt correction.

## Troubleshooting

**Reshape stalls:** If the reshape speed drops to zero, check for drive errors with `dmesg | grep -E "sda|sdb|error"`. A failing drive during a reshape is critical - the array may be at risk.

**Not enough space for reshape:** RAID 5 reshape requires temporary space. If the array is nearly full, the reshape may fail. Free up at least 10-15% of the array before growing.

**Array not recognized after reboot:** Run `sudo mdadm --assemble --scan` and update `/etc/mdadm/mdadm.conf`. Then rebuild initramfs with `sudo update-initramfs -u`.

**Filesystem size doesn't match array:** The filesystem must be explicitly grown after the RAID array grows. `resize2fs` for ext4, `xfs_growfs` for XFS. Neither will shrink a filesystem, only grow it.

Expanding mdadm RAID arrays is a tested, reliable process, but it requires patience. Large arrays with spinning disks can take 24 hours or more to reshape. Plan the expansion during a low-traffic period and ensure the system is on a UPS.
