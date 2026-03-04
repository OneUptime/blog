# How to Grow a VDO Logical Volume on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, LVM, Storage, Linux

Description: Learn how to grow VDO logical volumes on RHEL 9 by expanding both the physical and virtual sizes, and how to resize the filesystem to use the new space.

---

As data grows, you may need to expand your VDO volumes. On RHEL 9, LVM-VDO volumes can be grown in two dimensions: the physical size (actual disk space) and the virtual size (logical capacity presented to the filesystem). This guide covers both types of expansion.

## Prerequisites

- A RHEL 9 system with root or sudo access
- An existing LVM-VDO volume
- Available space in the volume group (for physical expansion)
- The `lvm2` and `kmod-kvdo` packages installed

## Understanding VDO Size Dimensions

A VDO volume has two independent sizes:

- **Physical size** (`--size`): The actual disk space allocated from the volume group. This is the real storage consumed.
- **Virtual size** (`--virtualsize`): The logical size presented to the filesystem. This can be larger than the physical size (overprovisioning).

You can expand either or both dimensions independently.

## Step 1: Check Current Sizes

```bash
sudo lvs -o name,size,lv_size vg_vdo/lv_vdo
sudo vdostats --human-readable
```

Check volume group free space:

```bash
sudo vgs vg_vdo
```

## Step 2: Grow the Physical Size

If the VDO volume is running low on physical space and you have free space in the volume group:

```bash
sudo lvextend --size +50G vg_vdo/lv_vdo
```

This adds 50 GB of physical storage to the VDO volume. Deduplication and compression now have more physical space to work with.

If you need to add a new disk first:

```bash
sudo pvcreate /dev/sdc
sudo vgextend vg_vdo /dev/sdc
sudo lvextend --size +100G vg_vdo/lv_vdo
```

Verify the expansion:

```bash
sudo vdostats --human-readable
```

## Step 3: Grow the Virtual Size

If you need to present more logical space to the filesystem:

```bash
sudo lvextend --virtualsize 500G vg_vdo/lv_vdo
```

This sets the virtual size to 500 GB (not adds 500 GB). To add a specific amount:

```bash
sudo lvextend --virtualsize +200G vg_vdo/lv_vdo
```

## Step 4: Grow the Filesystem

After expanding the virtual size, grow the filesystem to use the new space:

For XFS:

```bash
sudo xfs_growfs /vdo-data
```

For ext4:

```bash
sudo resize2fs /dev/vg_vdo/lv_vdo
```

Verify:

```bash
df -Th /vdo-data
```

## Step 5: Combined Growth

To grow both physical and virtual sizes and resize the filesystem in one sequence:

```bash
# Add physical space
sudo lvextend --size +50G vg_vdo/lv_vdo

# Increase virtual size
sudo lvextend --virtualsize +200G vg_vdo/lv_vdo

# Grow the filesystem
sudo xfs_growfs /vdo-data
```

## Practical Scenarios

### Scenario 1: Physical Space Running Low

VDO statistics show high physical utilization:

```bash
sudo vdostats --human-readable
# Shows 92% physical usage
```

Solution: Add physical space:

```bash
sudo lvextend --size +100G vg_vdo/lv_vdo
```

### Scenario 2: Filesystem Full but Physical Space Available

The filesystem reports full, but VDO physical usage is moderate (good deduplication is happening):

```bash
df -h /vdo-data
# Shows 95% used

sudo vdostats --human-readable
# Shows 40% physical usage
```

Solution: Increase virtual size:

```bash
sudo lvextend --virtualsize +500G vg_vdo/lv_vdo
sudo xfs_growfs /vdo-data
```

### Scenario 3: Both Sizes Need Growth

Growing workload with declining deduplication ratios:

```bash
# Add physical storage
sudo pvcreate /dev/sdd
sudo vgextend vg_vdo /dev/sdd
sudo lvextend --size +200G vg_vdo/lv_vdo

# Increase virtual size proportionally
sudo lvextend --virtualsize +400G vg_vdo/lv_vdo

# Grow filesystem
sudo xfs_growfs /vdo-data
```

## Monitoring After Growth

After expanding, monitor to ensure the growth resolved the issue:

```bash
# Check physical usage
sudo vdostats --human-readable

# Check filesystem usage
df -h /vdo-data

# Check LVM perspective
sudo lvs -o name,size,data_percent,vdo_saving_percent vg_vdo
```

## Important Considerations

### Virtual-to-Physical Ratio

When growing virtual size, maintain a reasonable ratio based on your observed savings:

```bash
# Check current savings
sudo vdostats --human-readable
```

If savings are 60%, a 2.5:1 virtual-to-physical ratio is reasonable. Do not set the virtual size so high that you risk running out of physical space.

### Cannot Shrink VDO Volumes

VDO volumes cannot be reduced in size (neither physical nor virtual). Plan growth carefully.

### Online Operation

Both physical and virtual size expansion are online operations. You do not need to unmount the filesystem or stop applications.

### Memory Impact

Growing the physical size increases the UDS index size, which may require additional memory. Verify your system has sufficient RAM:

```bash
free -h
```

## Best Practices

- **Grow physical first, then virtual**: Ensure you have physical capacity before presenting more logical space.
- **Monitor after growth**: Verify that deduplication ratios remain healthy after expansion.
- **Maintain conservative ratios**: Do not overcommit virtual size beyond what your deduplication savings support.
- **Plan for the UDS index**: Larger physical volumes need more memory for the deduplication index.
- **Keep the filesystem grown**: After expanding virtual size, always grow the filesystem to use the new space.

## Conclusion

Growing VDO logical volumes on RHEL 9 is a straightforward online operation. Understanding the distinction between physical and virtual size growth helps you make the right choice for your situation. Whether you need more actual storage capacity, more logical address space, or both, the LVM tools make expansion simple. Always monitor your deduplication ratios and physical utilization after growth to ensure your overprovisioning remains sustainable.
