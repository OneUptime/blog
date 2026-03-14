# How to Grow an XFS File System on RHEL Using xfs_growfs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Xfs_growfs, Storage, Linux

Description: Learn how to grow an XFS file system on RHEL using xfs_growfs, including expanding the underlying device, growing on LVM, and verifying the new size.

---

One of the key advantages of XFS is that it can be grown online while the filesystem is mounted and in use. The `xfs_growfs` command expands an XFS filesystem to fill available space on its underlying device. This guide covers the complete process of growing XFS filesystems on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An XFS filesystem that needs to be expanded
- Additional space available on the underlying block device
- The `xfsprogs` package installed

## Important Limitation

XFS can only be grown, not shrunk. If you need a smaller XFS filesystem, you must back up the data, recreate the filesystem at the desired size, and restore.

## Step 1: Check Current Filesystem Size

```bash
df -Th /data
xfs_info /data
```

Note the current block count in the `xfs_info` output.

## Step 2: Expand the Underlying Storage

Before you can grow the filesystem, the underlying block device must have additional space.

### Option A: Expand an LVM Logical Volume

```bash
# Check available space in the volume group
sudo vgs

# Extend the logical volume
sudo lvextend -L +20G /dev/vg_data/lv_data
```

### Option B: Expand a Virtual Disk

After expanding the virtual disk in your hypervisor:

```bash
# Rescan the disk
echo 1 | sudo tee /sys/class/block/sdb/device/rescan

# If using partitions, grow the partition
sudo growpart /dev/sdb 1

# If using LVM, resize the physical volume
sudo pvresize /dev/sdb1
sudo lvextend -l +100%FREE /dev/vg_data/lv_data
```

### Option C: Expand a Partition

Using `parted`:

```bash
sudo parted /dev/sdb resizepart 1 100%
```

## Step 3: Grow the XFS Filesystem

Now grow the XFS filesystem to fill the expanded device:

```bash
sudo xfs_growfs /data
```

The argument to `xfs_growfs` is the mount point, not the device path.

You can also grow to a specific size by specifying the number of filesystem blocks:

```bash
sudo xfs_growfs -D 15728640 /data
```

## Step 4: Verify the Growth

Check the new size:

```bash
df -Th /data
xfs_info /data
```

Compare the block count with what you noted in Step 1.

## Combined LVM and XFS Growth

The most common scenario is extending an LVM logical volume and its XFS filesystem. You can do both in one command:

```bash
sudo lvextend -r -L +20G /dev/vg_data/lv_data
```

The `-r` (or `--resizefs`) flag tells `lvextend` to also grow the filesystem. For XFS, it calls `xfs_growfs` automatically.

To use all available space:

```bash
sudo lvextend -r -l +100%FREE /dev/vg_data/lv_data
```

## Growing the Root XFS Filesystem

The root filesystem can be grown online just like any other XFS filesystem:

```bash
# Extend the logical volume
sudo lvextend -L +10G /dev/rhel/root

# Grow the filesystem
sudo xfs_growfs /
```

Or in one step:

```bash
sudo lvextend -r -L +10G /dev/rhel/root
```

## Understanding xfs_growfs Output

When you run `xfs_growfs`, it displays the new filesystem parameters:

```bash
sudo xfs_growfs /data
```

Output:

```bash
meta-data=/dev/mapper/vg_data-lv_data isize=512    agcount=4, agsize=1310720 blks
         =                       sectsz=512   attr=2, projid32bit=1
data     =                       bsize=4096   blocks=5242880, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=2560, version=2
data blocks changed from 5242880 to 7864320
```

The last line confirms the growth from the old block count to the new one.

## Troubleshooting

### "data size unchanged, skipping"

This means the filesystem already fills the underlying device. Ensure you expanded the block device before running `xfs_growfs`.

### "is not a mounted XFS filesystem"

`xfs_growfs` requires the filesystem to be mounted. Mount it first:

```bash
sudo mount /dev/vg_data/lv_data /data
sudo xfs_growfs /data
```

### Growing Fails with I/O Errors

Check the underlying storage for errors:

```bash
sudo dmesg | tail -20
sudo smartctl -a /dev/sdb
```

## Best Practices

- **Always verify available space** on the underlying device before attempting to grow.
- **Use `lvextend -r`** when working with LVM to combine the volume extension and filesystem growth into one atomic operation.
- **Monitor filesystem usage** proactively so you can grow before reaching critical levels.
- **Test in non-production first** if you are unfamiliar with the procedure.

## Conclusion

Growing an XFS filesystem on RHEL is a straightforward online operation using `xfs_growfs`. Whether you are expanding LVM logical volumes, virtual disks, or physical partitions, the process follows the same pattern: expand the underlying storage, then grow the filesystem to fill it. The ability to perform this operation while the filesystem is mounted and active makes XFS an excellent choice for production environments where downtime must be minimized.
