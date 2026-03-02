# How to Create Logical Volumes with LVM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Storage, Disk Management, Linux

Description: Step-by-step guide to creating LVM Physical Volumes, Volume Groups, and Logical Volumes on Ubuntu, then formatting and mounting them for use.

---

Setting up LVM from scratch on a new disk involves three sequential steps: initializing the Physical Volume, creating a Volume Group, and carving out Logical Volumes. This guide walks through the complete process on Ubuntu, from bare disk to mounted filesystem.

## Prerequisites

You need `lvm2` installed:

```bash
sudo apt update && sudo apt install lvm2
```

Check if it's running:

```bash
sudo systemctl status lvm2-lvmpolld.socket
```

You also need at least one available disk or partition. To see your available storage:

```bash
lsblk
```

Look for devices without a mount point. In the examples below, `/dev/sdb` is the target disk - adjust for your setup.

## Step 1: Prepare the Disk

While you can initialize a whole disk as a PV without partitioning, many sysadmins prefer to create a single partition first. This makes the disk's purpose visible in tools like `fdisk -l` and prevents other tools from accidentally writing to it.

### Option A: Use the whole disk directly

```bash
# Initialize /dev/sdb directly as a Physical Volume
sudo pvcreate /dev/sdb
```

### Option B: Create a partition first

```bash
# Open fdisk for the disk
sudo fdisk /dev/sdb

# In fdisk:
# g  - create GPT partition table
# n  - new partition (accept defaults for whole disk)
# t  - change type to "Linux LVM" (type 31 for GPT)
# w  - write and exit
```

Then initialize the partition:

```bash
sudo pvcreate /dev/sdb1
```

For the rest of this guide, the examples use `/dev/sdb` (whole disk approach).

## Step 2: Create the Physical Volume

```bash
sudo pvcreate /dev/sdb
```

Expected output:
```
  Physical volume "/dev/sdb" successfully created.
```

Verify:

```bash
sudo pvs
```

```
  PV         VG Fmt  Attr PSize   PFree
  /dev/sdb      lvm2 ---  500.00g 500.00g
```

The empty VG column means this PV isn't yet assigned to a Volume Group.

### Create a PV with custom extent size

The default PE size is 4MB. For very large volumes or specific performance requirements, you can customize it:

```bash
# 8MB PE size - reduces metadata overhead for large volumes
sudo pvcreate --dataalignment 1m --physicalextentsize 8m /dev/sdb
```

For most use cases, the default 4MB is fine.

## Step 3: Create the Volume Group

Now group the Physical Volume into a Volume Group:

```bash
# Create a VG named 'data_vg' from /dev/sdb
sudo vgcreate data_vg /dev/sdb
```

Output:
```
  Volume group "data_vg" successfully created
```

### Create a VG from multiple disks at once

```bash
sudo vgcreate data_vg /dev/sdb /dev/sdc /dev/sdd
```

Verify the VG:

```bash
sudo vgs data_vg
```

```
  VG       #PV #LV #SN Attr   VSize    VFree
  data_vg    1   0   0 wz--n- 499.99g  499.99g
```

Get full details:

```bash
sudo vgdisplay data_vg
```

Note the `VFree` field - that's the space available for creating Logical Volumes.

## Step 4: Create Logical Volumes

With a Volume Group in place, create Logical Volumes from it.

### Create an LV with a fixed size

```bash
# Create a 50GB LV named 'web_data'
sudo lvcreate -L 50G -n web_data data_vg
```

```
  Logical volume "web_data" created.
```

### Create an LV using a percentage of free space

```bash
# Use 50% of the remaining free space
sudo lvcreate -l 50%FREE -n db_data data_vg

# Use all remaining free space
sudo lvcreate -l 100%FREE -n backups data_vg
```

### Create an LV using a specific number of extents

```bash
# 1000 extents * 4MB = 4000MB (~3.9GB)
sudo lvcreate -l 1000 -n small_vol data_vg
```

### Create multiple LVs

```bash
# Create several LVs for different purposes
sudo lvcreate -L 100G -n web_data data_vg
sudo lvcreate -L 200G -n db_data data_vg
sudo lvcreate -L 50G  -n logs data_vg
```

Verify all LVs:

```bash
sudo lvs
```

```
  LV       VG       Attr       LSize   Pool Origin Data%
  web_data data_vg  -wi-a----- 100.00g
  db_data  data_vg  -wi-a----- 200.00g
  logs     data_vg  -wi-a-----  50.00g
```

## Step 5: Format the Logical Volumes

Logical Volumes are block devices. Format them with the filesystem of your choice.

### Format with ext4

```bash
sudo mkfs.ext4 /dev/data_vg/web_data
sudo mkfs.ext4 /dev/data_vg/logs
```

### Format with XFS

XFS is a good choice for large files or high-throughput workloads:

```bash
sudo mkfs.xfs /dev/data_vg/db_data
```

### Format with ext4 with a label

Labels make it easier to identify volumes:

```bash
sudo mkfs.ext4 -L "web-data" /dev/data_vg/web_data
```

## Step 6: Create Mount Points and Mount

```bash
# Create directories for each mount point
sudo mkdir -p /var/www
sudo mkdir -p /var/lib/postgresql
sudo mkdir -p /var/log/apps

# Mount the volumes
sudo mount /dev/data_vg/web_data /var/www
sudo mount /dev/data_vg/db_data /var/lib/postgresql
sudo mount /dev/data_vg/logs /var/log/apps

# Verify
df -h
```

## Step 7: Make Mounts Persistent via /etc/fstab

Mounting manually only lasts until the next reboot. Add entries to `/etc/fstab` for persistence.

First, get the UUIDs:

```bash
sudo blkid /dev/data_vg/web_data
sudo blkid /dev/data_vg/db_data
sudo blkid /dev/data_vg/logs
```

Then add entries to `/etc/fstab`:

```bash
sudo nano /etc/fstab
```

```
# LVM volumes
/dev/data_vg/web_data    /var/www              ext4    defaults    0  2
/dev/data_vg/db_data     /var/lib/postgresql   xfs     defaults    0  2
/dev/data_vg/logs        /var/log/apps         ext4    defaults    0  2
```

You can also use the mapper path or UUID. Device name paths like `/dev/data_vg/web_data` work reliably with LVM because LVM maintains these symlinks regardless of what order disks are detected.

Test the fstab configuration:

```bash
sudo mount -a
# If no errors, the configuration is good
```

## Viewing the Complete LVM Layout

At any point you can see the full picture:

```bash
# Short summary of everything
sudo pvs && sudo vgs && sudo lvs

# Detailed tree view
sudo lvm fullreport
```

## LVM Device Paths

Logical Volumes are accessible via two equivalent paths:

```bash
# Symlink created by LVM
/dev/<vg_name>/<lv_name>
# Example: /dev/data_vg/web_data

# Device mapper path
/dev/mapper/<vg_name>-<lv_name>
# Example: /dev/mapper/data_vg-web_data
```

Both point to the same kernel device. Use whichever is clearer in your configuration.

## Common Mistakes to Avoid

**Creating an LV larger than the VG**: Check free space first with `sudo vgs` before creating LVs.

**Not checking PE alignment**: For SSDs, ensure the PE size aligns with the underlying storage block size. The default 4MB alignment is suitable for most SSDs.

**Forgetting to format**: An LV is a block device - until you format it with a filesystem, you can't mount it.

**Using device names in fstab for non-LVM volumes**: For LVM volumes specifically, `/dev/vg_name/lv_name` paths are stable. For raw disks, always prefer UUID.

With Physical Volumes initialized, a Volume Group created, and Logical Volumes formatted and mounted, you have a fully functional LVM setup. From here you can extend volumes as needs grow, add more disks to the VG, or take snapshots - all without disturbing running services.
