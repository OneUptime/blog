# How to Add a New Disk to an Existing LVM Volume Group on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LVM, Storage, Disk Management, Linux

Description: Expand an existing LVM Volume Group on Ubuntu by adding a new physical disk, then extend Logical Volumes to take advantage of the additional space.

---

When a Volume Group runs low on free space, the solution is to add more Physical Volumes to it. This is one of LVM's core strengths - you can add disks to an existing VG without disrupting any mounted filesystems or running services. The process takes a few minutes and requires no downtime.

## Confirming You Need More Space

Before adding hardware, confirm the VG is actually the bottleneck:

```bash
# Check free space in all Volume Groups
sudo vgs

# Detailed view
sudo vgdisplay
```

If `VFree` is 0 or close to 0, and you have an LV that needs to grow, you need to add a new PV to the VG.

## Step 1: Install the New Disk

Add the physical disk to the server. This might mean:

- Inserting a disk into an available drive bay
- Adding a disk to a virtual machine
- Provisioning a new EBS volume (AWS) or equivalent

After the disk is recognized by the OS, verify it's visible:

```bash
# Check for the new disk
lsblk

# More details including device names
sudo fdisk -l
```

Look for a disk with no partitions and no filesystem type - that's your new disk. Common names: `/dev/sdc`, `/dev/nvme1n1`, `/dev/vdc`.

On cloud environments, you may need to scan for new devices:

```bash
# Rescan the SCSI bus (for virtual disks)
for host in /sys/class/scsi_host/host*/scan; do echo "- - -" | sudo tee $host; done

# Verify it appeared
lsblk
```

## Step 2: Prepare the Disk (Optional Partitioning)

You can initialize the entire disk as a PV, or partition it first. Whole-disk PV is simpler:

### Whole disk approach (simpler)

```bash
# Wipe any existing signatures
sudo wipefs -a /dev/sdc

# Initialize as PV
sudo pvcreate /dev/sdc
```

### Partition approach (useful for mixed-use disks)

```bash
sudo fdisk /dev/sdc

# In fdisk interactive mode:
# g - new GPT partition table
# n - new partition
# Accept defaults to use whole disk
# t - change partition type
# 31 - Linux LVM (for GPT)
# w - write changes

# Initialize the partition
sudo pvcreate /dev/sdc1
```

For dedicated LVM disks, use the whole disk directly.

## Step 3: Add the Physical Volume to the Volume Group

This is the key command:

```bash
# Add /dev/sdc to the Volume Group 'data_vg'
sudo vgextend data_vg /dev/sdc
```

Output:
```text
  Volume group "data_vg" successfully extended
```

### Add multiple disks at once

If you're adding several disks simultaneously:

```bash
sudo vgextend data_vg /dev/sdc /dev/sdd /dev/sde
```

### Verify the VG now has more free space

```bash
sudo vgs data_vg
```

```text
  VG       #PV #LV #SN Attr   VSize    VFree
  data_vg    2   3   0 wz--n-   1.50t  500.00g
```

The PV count increased from 1 to 2, and VFree now shows the new disk's capacity.

Full details:

```bash
sudo vgdisplay data_vg
```

```text
  --- Volume group ---
  VG Name               data_vg
  ...
  VG Size               1.50 TiB
  PE Size               4.00 MiB
  Total PE              393215
  Alloc PE / Size       128000 / 500.00 GiB
  Free  PE / Size       265215 / 1.00 TiB
```

## Step 4: Verify the Physical Volume

Confirm the new PV shows up and is properly assigned to the VG:

```bash
sudo pvs
```

```text
  PV         VG       Fmt  Attr PSize    PFree
  /dev/sdb   data_vg  lvm2 a--  500.00g      0
  /dev/sdc   data_vg  lvm2 a--  500.00g 500.00g
```

`/dev/sdb` is fully used, `/dev/sdc` has all its space free and available for LV creation.

## Step 5: Extend an Existing Logical Volume

Now use the new space to grow an existing LV:

```bash
# Extend the 'db_data' LV by 200GB and resize its filesystem
sudo lvextend -L +200G -r /dev/data_vg/db_data
```

Or use all the new free space:

```bash
sudo lvextend -l +100%FREE -r /dev/data_vg/db_data
```

For XFS filesystems (which need the mount point for resize):

```bash
sudo lvextend -L +200G /dev/data_vg/db_data
sudo xfs_growfs /var/lib/postgresql
```

Verify the extension:

```bash
df -h /var/lib/postgresql
```

## Checking Which Disk an LV Uses

LVM distributes extents across PVs according to its allocation policy. To see which PVs back an LV:

```bash
sudo lvdisplay -m /dev/data_vg/db_data
```

```text
  --- Logical volume ---
  LV Path                /dev/data_vg/db_data
  ...
  --- Segments ---
  Logical extents 0 to 51199:
    Type                linear
    Physical volume     /dev/sdb
    Physical extents    0 to 51199

  Logical extents 51200 to 102399:
    Type                linear
    Physical volume     /dev/sdc
    Physical extents    0 to 51199
```

The LV spans both disks, with extents on each PV shown separately.

## Controlling Where New Extents Go

By default, LVM places new extents on any available PV in the VG. You can specify which PV to use:

```bash
# Extend 100GB specifically from /dev/sdc
sudo lvextend -L +100G /dev/data_vg/db_data /dev/sdc
```

This is useful when you want to keep an LV on a specific disk for performance or organizational reasons.

## Checking VG Metadata After Expansion

The VG metadata (stored on every PV) updates automatically when you run `vgextend`. Verify the metadata is in sync:

```bash
sudo vgck data_vg
```

No output means the VG is consistent. If you see warnings, run:

```bash
sudo vgck --updatemetadata data_vg
```

## Cloud-Specific Notes

### AWS EBS

After attaching a new EBS volume to an EC2 instance running Ubuntu:

```bash
# Check the device name (may differ from /dev/xvdX or /dev/nvmeXn1)
lsblk

# The new volume shows up as unformatted
# Initialize and add to VG
sudo pvcreate /dev/nvme1n1
sudo vgextend data_vg /dev/nvme1n1
```

### Google Cloud Persistent Disks

After attaching in the console:

```bash
# Rescan if needed
sudo echo "- - -" > /sys/class/scsi_host/host0/scan 2>/dev/null || true

# List devices
lsblk
# Typically shows as /dev/sdb, /dev/sdc, etc.

sudo pvcreate /dev/sdb
sudo vgextend data_vg /dev/sdb
```

## Removing a PV from the VG (Reversal)

If you need to remove a PV later (covered in detail in the disk removal guide), the short version is:

```bash
# Migrate data off the PV first
sudo pvmove /dev/sdc

# Then remove from VG
sudo vgreduce data_vg /dev/sdc
```

Adding disks to a VG is a routine, non-disruptive operation. Once you've run `vgextend`, the free space is immediately available for use by any LV in that VG.
