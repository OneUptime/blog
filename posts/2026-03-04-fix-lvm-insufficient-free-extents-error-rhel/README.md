# How to Fix LVM 'Insufficient Free Extents' Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Storage, Troubleshooting, Disk Management

Description: Resolve the LVM 'Insufficient free extents' error on RHEL by checking volume group space, adding physical volumes, or resizing existing volumes.

---

The "Insufficient free extents" error occurs when you try to create or extend a logical volume but the volume group does not have enough free space. Here is how to diagnose and fix it.

## Understanding the Error

```bash
# The error looks like this:
# Insufficient free space (0 extents): 1280 required

# This means the volume group has 0 free extents
# but you requested space that requires 1280 extents
```

## Check Available Space

```bash
# View volume group details including free space
sudo vgs
# VG     #PV  #LV  #SN  Attr   VSize   VFree
# rhel     1    2    0   wz--n- 49.00g  0

# Detailed view with extent information
sudo vgdisplay rhel
# Look for "Free PE / Size"

# Check how space is distributed across logical volumes
sudo lvs
```

## Option 1: Extend the Volume Group

Add a new physical disk or partition to the volume group.

```bash
# Create a physical volume on the new disk
sudo pvcreate /dev/sdb

# Extend the volume group with the new physical volume
sudo vgextend rhel /dev/sdb

# Verify the volume group now has free space
sudo vgs

# Now extend the logical volume
sudo lvextend -L +10G /dev/rhel/root

# Grow the filesystem
sudo xfs_growfs /          # for XFS
# sudo resize2fs /dev/rhel/root  # for ext4
```

## Option 2: Reduce Another Logical Volume

If another logical volume has unused space, shrink it (ext4 only; XFS cannot be shrunk).

```bash
# Unmount the filesystem first
sudo umount /home

# Check the filesystem
sudo e2fsck -f /dev/rhel/home

# Shrink the filesystem
sudo resize2fs /dev/rhel/home 20G

# Reduce the logical volume
sudo lvreduce -L 20G /dev/rhel/home

# Remount
sudo mount /home

# Now extend the target volume
sudo lvextend -L +10G /dev/rhel/root
sudo xfs_growfs /
```

## Option 3: Remove an Unused Logical Volume

```bash
# List logical volumes to find unused ones
sudo lvs

# Remove an unused logical volume
sudo lvremove /dev/rhel/unused_lv

# Now you have free extents to use
sudo lvextend -L +10G /dev/rhel/root
sudo xfs_growfs /
```

## Option 4: Use Exact Remaining Space

```bash
# Extend a logical volume to use all remaining free space
sudo lvextend -l +100%FREE /dev/rhel/root
sudo xfs_growfs /
```

## Checking Extent Size

```bash
# View the physical extent size (default is 4MB)
sudo vgdisplay rhel | grep "PE Size"

# Calculate: 1280 extents * 4MB = 5120MB = 5GB needed
```

The most common solution in production is to add a new disk to the volume group using `pvcreate` and `vgextend`. This is non-disruptive and does not require unmounting any filesystems.
