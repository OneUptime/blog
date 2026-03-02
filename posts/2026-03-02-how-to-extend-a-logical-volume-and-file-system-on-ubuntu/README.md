# How to Extend a Logical Volume and File System on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Storage, Disk Management, Linux

Description: Learn how to extend an LVM Logical Volume and resize its filesystem on Ubuntu, covering both ext4 and XFS with live resize capabilities.

---

One of the most common tasks for any sysadmin managing LVM is extending a volume. A disk fills up, a service needs more room, and you need to add space without downtime. LVM makes this straightforward - as long as there's free space in the Volume Group, you can extend a Logical Volume and resize its filesystem while it's mounted and in use.

## Before You Start

Check the current situation:

```bash
# How full is the filesystem?
df -h /var/lib/postgresql

# How much free space is in the Volume Group?
sudo vgs

# See the current LV details
sudo lvs /dev/data_vg/db_data
```

Example output:
```
  VG       #PV #LV #SN Attr   VSize    VFree
  data_vg    2   3   0 wz--n-   1.00t  200.00g
```

You have 200GB free in the VG - plenty to extend a volume.

If VFree shows 0, you need to add a new disk to the Volume Group first. See the guide on adding disks to an existing VG before continuing.

## Identifying What You're Working With

Know your LV path and filesystem type before starting:

```bash
# Get the LV path
sudo lvdisplay | grep "LV Path"

# Identify the filesystem type
df -T /var/lib/postgresql
# or
sudo blkid /dev/data_vg/db_data
```

The filesystem type matters because ext4 and XFS have different resize commands.

## Method 1: Two-Step Approach (Extend LV, Then Resize FS)

This method is explicit and gives you control over each step.

### Step 1: Extend the Logical Volume

```bash
# Extend by adding 50GB to the current size
sudo lvextend -L +50G /dev/data_vg/db_data

# Extend to a specific total size (e.g., make it exactly 250GB)
sudo lvextend -L 250G /dev/data_vg/db_data

# Extend to use all remaining free space in the VG
sudo lvextend -l +100%FREE /dev/data_vg/db_data
```

Expected output:
```
  Size of logical volume data_vg/db_data changed from 200.00 GiB (51200 extents) to 250.00 GiB (64000 extents).
  Logical volume data_vg/db_data successfully resized.
```

At this point the block device is larger, but the filesystem doesn't know it yet.

### Step 2: Resize the Filesystem

**For ext4:**

```bash
sudo resize2fs /dev/data_vg/db_data
```

`resize2fs` without a size argument grows the filesystem to fill the entire block device. For online (live) resize, the filesystem must be mounted. ext4 supports live resize.

Expected output:
```
resize2fs 1.46.5 (30-Dec-2021)
Filesystem at /dev/data_vg/db_data is mounted on /var/lib/postgresql; on-line resizing required
old_desc_blocks = 25, new_desc_blocks = 32
The filesystem on /dev/data_vg/db_data is now 65536000 (4k) blocks long.
```

**For XFS:**

```bash
# For XFS, specify the mount point, not the device
sudo xfs_growfs /var/lib/postgresql
```

XFS always requires the filesystem to be mounted for live resize - it cannot resize unmounted XFS filesystems.

```
meta-data=/dev/mapper/data_vg-db_data isize=512    agcount=4, agsize=13107200 blks
data     =                       bsize=4096   blocks=52428800, imaxpct=25
         =                       sunit=0      swidth=0 blks
...
data blocks changed from 52428800 to 65536000
```

## Method 2: Combined Extend and Resize (Recommended for ext4)

For ext4, `lvextend` has a `-r` flag that extends the LV and resizes the filesystem in one command:

```bash
# Extend by 50GB and resize ext4 filesystem automatically
sudo lvextend -L +50G -r /dev/data_vg/web_data

# Extend to use all free space and resize
sudo lvextend -l +100%FREE -r /dev/data_vg/web_data
```

The `-r` (or `--resizefs`) flag calls `resize2fs` for ext4 or `xfs_growfs` for XFS automatically. This is the most convenient method when you're confident about the operation.

## Verifying the Extension

After the resize, confirm the filesystem grew:

```bash
df -h /var/lib/postgresql
```

```
Filesystem                        Size  Used Avail Use% Mounted on
/dev/mapper/data_vg-db_data       246G  195G   51G  79% /var/lib/postgresql
```

Also verify the LV size:

```bash
sudo lvs /dev/data_vg/db_data
```

```
  LV      VG       Attr       LSize
  db_data data_vg  -wi-ao---- 250.00g
```

## Extending When VG Free Space is Insufficient

If the Volume Group is full, you need to add more Physical Volumes before extending. Here's the full sequence:

```bash
# 1. Initialize a new disk as a Physical Volume
sudo pvcreate /dev/sdd

# 2. Add the PV to the existing Volume Group
sudo vgextend data_vg /dev/sdd

# 3. Verify new free space
sudo vgs data_vg

# 4. Now extend the Logical Volume
sudo lvextend -L +200G -r /dev/data_vg/db_data
```

## Extending the Root Filesystem

Extending root (`/`) requires the same steps, but since resize2fs works on live mounted ext4, you can do it without a live CD or recovery mode:

```bash
# Check current root LV
sudo lvs /dev/ubuntu-vg/ubuntu-lv

# Extend root LV (assuming ubuntu-vg VG)
sudo lvextend -L +50G /dev/ubuntu-vg/ubuntu-lv

# Resize the root ext4 filesystem
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv

# Verify
df -h /
```

## Extending LVs with Specific Extent Counts

Sometimes you want precise control using extents rather than gigabytes:

```bash
# Extend by 2000 extents (2000 * 4MB = ~8GB)
sudo lvextend -l +2000 /dev/data_vg/web_data

# Extend to specific total extent count
sudo lvextend -l 30000 /dev/data_vg/web_data
```

Check extent size for your VG:

```bash
sudo vgdisplay data_vg | grep "PE Size"
```

## Common Issues

### "Insufficient free space" error

```bash
# Check actual free space
sudo vgs --units g

# If VFree is 0, add a disk first
sudo pvcreate /dev/sdd && sudo vgextend data_vg /dev/sdd
```

### resize2fs reports the filesystem is already the right size

This happens if the LV extension didn't complete or if you're looking at the wrong device. Double-check:

```bash
# Confirm the LV is actually larger than the filesystem
sudo blockdev --getsize64 /dev/data_vg/db_data  # Block device size in bytes
df -B1 /var/lib/postgresql                        # Filesystem size in bytes
```

If the block device is larger, run resize2fs again.

### XFS "cannot change geometry" error

XFS cannot be shrunk, only grown. If you see this error when trying to shrink an XFS filesystem, that's expected - XFS shrink is not supported. For growing, ensure the filesystem is mounted and use `xfs_growfs` with the mount point.

## Quick Reference

```bash
# Common extension patterns

# Extend ext4 by 100GB in one command
sudo lvextend -L +100G -r /dev/vg_name/lv_name

# Extend XFS to use all VG free space
sudo lvextend -l +100%FREE /dev/vg_name/lv_name
sudo xfs_growfs /mount/point

# Check result
df -h /mount/point
```

The process is reliable and routinely done on production systems. The key rule: ext4 and XFS both support live online resize when growing - you don't need to unmount or stop services.
