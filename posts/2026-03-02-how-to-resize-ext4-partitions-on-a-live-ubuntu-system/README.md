# How to Resize ext4 Partitions on a Live Ubuntu System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Disk Management, Storage, ext4, System Administration

Description: Grow or shrink ext4 partitions on a live Ubuntu system without downtime, covering both partition resizing and filesystem resizing with practical cloud and physical disk scenarios.

---

Running out of disk space on a production server is stressful. Fortunately, growing an ext4 filesystem on Ubuntu can often be done while the system is running and the filesystem is mounted. Shrinking requires unmounting and is riskier. This covers both operations with the practical detail needed to do them safely.

## Understanding the Two-Layer Resize

Resizing a mounted filesystem involves two distinct operations:

1. **Partition resize** - changing how much space the partition occupies on the disk (using `parted`, `fdisk`, or `growpart`)
2. **Filesystem resize** - expanding or contracting the filesystem to use the new partition size (using `resize2fs`)

Both steps are needed. You can't just resize the partition without telling the filesystem about the change, and you can't resize the filesystem larger than the partition.

## Growing an ext4 Partition (Live, No Downtime)

The common scenario: you've increased the disk size on a cloud VM or attached a new disk and extended an LVM volume group. The partition and filesystem need to be expanded to use the new space.

### Scenario 1: Growing a partition in-place

This applies when the physical or virtual disk has been made larger and you need to grow the last partition to fill it.

```bash
# Check current disk and partition sizes
lsblk
sudo fdisk -l /dev/sda
```

Example output before resizing:

```
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda      8:0    0   50G  0 disk         # Disk is now 50G
├─sda1   8:1    0  512M  0 part /boot/efi
├─sda2   8:2    0    1G  0 part /boot
└─sda3   8:3    0 38.5G  0 part /       # But sda3 only uses 40G worth of sectors
```

The disk is 50G but sda3 ends at the old 40G boundary.

#### Method 1: Using growpart (cloud-friendly, recommended)

```bash
# Install cloud-guest-utils if not present
sudo apt install cloud-guest-utils

# Grow partition 3 on sda to fill available space
sudo growpart /dev/sda 3

# Verify the partition grew
sudo fdisk -l /dev/sda
```

Now grow the filesystem to fill the partition:

```bash
# Resize the filesystem (ext4 can do this online)
sudo resize2fs /dev/sda3

# Verify the result
df -h /
```

#### Method 2: Using parted interactively

```bash
sudo parted /dev/sda
```

Inside parted:

```
(parted) print free
# Shows free space after last partition

(parted) resizepart 3 100%
# Resize partition 3 to use 100% of disk
Warning: Partition /dev/sda3 is being used.  # It's mounted - parted asks for confirmation
Yes/No? Yes

(parted) quit
```

Then resize the filesystem:

```bash
sudo resize2fs /dev/sda3
```

### Scenario 2: Growing an LVM logical volume

With LVM, resizing can be done in one step:

```bash
# Extend a logical volume by 20GB
sudo lvextend -L +20G /dev/mapper/ubuntu--vg-ubuntu--lv

# Or use all remaining free space in the volume group
sudo lvextend -l +100%FREE /dev/mapper/ubuntu--vg-ubuntu--lv

# Resize the filesystem to fill the new LV size
sudo resize2fs /dev/mapper/ubuntu--vg-ubuntu--lv

# Or combine both in one command
sudo lvextend -l +100%FREE --resizefs /dev/mapper/ubuntu--vg-ubuntu--lv
```

The `--resizefs` flag tells lvextend to call resize2fs automatically after growing the logical volume.

Verify the result:

```bash
df -h /
# Filesystem should show the new larger size
```

## Monitoring a Live Filesystem Resize

For very large filesystems, resize2fs prints progress:

```bash
sudo resize2fs /dev/sda3
```

Output:

```
resize2fs 1.46.5 (30-Dec-2021)
Filesystem at /dev/sda3 is mounted on /; on-line resizing required
old_desc_blocks = 5, new_desc_blocks = 7
The filesystem on /dev/sda3 is now 13107200 (4k) blocks long.
```

## Shrinking an ext4 Partition

Shrinking is riskier than growing because you can lose data if done incorrectly, and it requires unmounting the filesystem first. The root filesystem (`/`) cannot be unmounted while the system is running, so shrinking it requires booting from a live USB.

For non-root partitions, the procedure works as follows.

### Shrinking a non-root ext4 partition

```bash
# Step 1: Unmount the filesystem
sudo umount /mnt/data

# Step 2: Check the filesystem first (required before shrink)
sudo e2fsck -f /dev/sdb1

# Step 3: Resize the filesystem SMALLER than the target partition size
# (Leave some margin - resize to slightly less than the partition target)
# Target: reduce to 50GB partition, so resize filesystem to 48GB to be safe
sudo resize2fs /dev/sdb1 48G

# Step 4: Resize the partition to the target size
sudo parted /dev/sdb
```

Inside parted:

```
(parted) print
# Note the current end of the partition

(parted) resizepart 1 50G
# Set the end of partition 1 to 50GB from start of disk

(parted) quit
```

```bash
# Step 5: Grow the filesystem to fill the partition exactly
sudo resize2fs /dev/sdb1

# Step 6: Check filesystem consistency
sudo e2fsck -f /dev/sdb1

# Step 7: Mount it again
sudo mount /dev/sdb1 /mnt/data

# Verify
df -h /mnt/data
```

Always resize the filesystem first (to a size smaller than the target partition size), then resize the partition. Never resize the partition first when shrinking - you would lose data.

## Checking Filesystem Size Before and After

```bash
# Show filesystem size and usage
df -hT /dev/sda3

# Show detailed ext4 information
sudo tune2fs -l /dev/sda3 | grep -E "Block count|Block size|Filesystem size"

# Calculate actual filesystem size from tune2fs output
# Block count * Block size = filesystem size in bytes
```

## Verifying ext4 Integrity After Resize

```bash
# Read-only check (can run while mounted)
sudo e2fsck -n /dev/sda3

# Full check (requires unmounted filesystem)
sudo e2fsck -f /dev/sda3
```

## Practical: Recovering from "No space left on device"

When a filesystem is full and you have additional disk space available:

```bash
# Check what's consuming space
df -h
du -sh /var/log/* | sort -rh | head -10

# If it's a cloud VM, first resize the disk via your cloud provider's console
# Then use growpart and resize2fs as shown above

# Quick space recovery while you sort out the resize:
# Remove old package cache
sudo apt clean
# Remove old log files
sudo journalctl --vacuum-size=500M
# Find large files
sudo find / -xdev -type f -size +1G -ls 2>/dev/null | sort -k7 -rn | head -10
```

## Resizing Cloud VM Root Disks

Most cloud providers (AWS, GCP, Azure, DigitalOcean) let you resize the boot disk through their console or CLI. The general process:

1. Resize the disk in the cloud provider's console
2. Reboot (often optional for some providers)
3. Run `sudo growpart /dev/sda 1` (adjust device and partition number for your setup)
4. Run `sudo resize2fs /dev/sda1`

For Ubuntu cloud images, `cloud-init` may handle the partition and filesystem grow automatically on reboot if you've used the cloud provider's disk resize feature. Check whether this happened before manually intervening:

```bash
# Check if resize happened automatically
df -h /
# If the filesystem shows the new size, cloud-init already handled it
```

Growing a live ext4 filesystem is one of those operations that looks scary but is actually straightforward. The ext4 filesystem supports online growing reliably, and the tooling is mature. Shrinking is where care is needed - unmount first, check the filesystem, resize the filesystem, then resize the partition, in that order.
