# How to Grow a VDO Logical Volume on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, LVM, Storage, Volume Management, Linux

Description: Learn how to grow a VDO logical volume on RHEL to expand storage capacity, including both the physical and logical size expansion steps.

---

As storage needs increase, you may need to grow a VDO volume. RHEL supports online growth of VDO volumes, meaning you do not need to unmount or stop applications. You can grow the logical size independently of the physical size, or grow both.

## Checking Current VDO Volume Size

```bash
# Check the current logical and physical sizes
sudo vdo status --name=vdo0 | grep -E "Physical size|Logical size"

# Also check actual usage
sudo vdostats --human-readable
```

## Growing the Logical Size

If your deduplication and compression ratios are better than expected, you can safely increase the logical size:

```bash
# Grow the logical size of the VDO volume
sudo vdo growLogical --name=vdo0 --vdoLogicalSize=500G

# Verify the new size
sudo vdo status --name=vdo0 | grep "Logical size"
```

After growing the logical size, extend the filesystem:

```bash
# For XFS filesystems (supports online growth)
sudo xfs_growfs /mnt/vdo-mount

# For ext4 filesystems
sudo resize2fs /dev/mapper/vdo0
```

## Growing the Physical Size

If you have added more physical storage (expanded the underlying disk or LV), you can tell VDO to use it:

```bash
# First, grow the underlying block device if using LVM
sudo lvextend -L +50G /dev/vg0/lv_vdo

# Then tell VDO to use the additional physical space
sudo vdo growPhysical --name=vdo0

# Verify the new physical size
sudo vdo status --name=vdo0 | grep "Physical size"
```

## Growing VDO on LVM (LVM-VDO)

If you are using the LVM-VDO integration (recommended on RHEL 9+):

```bash
# Check current LV size
sudo lvs -o name,size,vdo_saving_percent

# Grow the VDO pool LV
sudo lvextend -L +100G /dev/vg0/vdo_pool

# Grow the logical volume on top
sudo lvextend -L +200G /dev/vg0/vdo_lv

# Extend the filesystem
sudo xfs_growfs /mnt/vdo-mount
```

## Verifying the Growth

```bash
# Confirm filesystem sees the new size
df -h /mnt/vdo-mount

# Confirm VDO stats reflect the change
sudo vdostats --human-readable
```

Always monitor your physical-to-logical ratio after growing a VDO volume. Growing the logical size without adding physical storage relies on continued deduplication and compression efficiency. If data patterns change, you may consume physical space faster than expected.
