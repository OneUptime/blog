# How to Resize (Extend and Reduce) an ext4 File System on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ext4, Resize, Storage, Linux

Description: Learn how to extend and reduce ext4 file systems on RHEL, including online growth, offline shrinking, and working with LVM logical volumes.

---

One of ext4's key advantages over XFS is the ability to both grow and shrink the filesystem. Growing can be done online while the filesystem is mounted, while shrinking requires the filesystem to be unmounted. This guide covers both operations on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An ext4 filesystem to resize
- The `e2fsprogs` package installed

## Extending an ext4 File System

### Method 1: Extend with LVM (Most Common)

Extend both the logical volume and filesystem in one command:

```bash
sudo lvextend -r -L +10G /dev/vg_data/lv_data
```

The `-r` flag resizes the filesystem automatically. To use all available space:

```bash
sudo lvextend -r -l +100%FREE /dev/vg_data/lv_data
```

### Method 2: Extend After Growing the Block Device

If you expanded the underlying device separately:

```bash
# Resize the filesystem to fill the device
sudo resize2fs /dev/vg_data/lv_data
```

Without a size argument, `resize2fs` grows the filesystem to fill the entire device.

### Method 3: Extend to a Specific Size

```bash
sudo resize2fs /dev/vg_data/lv_data 30G
```

### Online Extension

ext4 supports online extension. You do not need to unmount the filesystem:

```bash
# Extend the LV
sudo lvextend -L +10G /dev/vg_data/lv_data

# Grow the filesystem while mounted
sudo resize2fs /dev/vg_data/lv_data
```

Verify:

```bash
df -Th /data
```

## Reducing an ext4 File System

Shrinking is more complex and requires the filesystem to be unmounted. Follow these steps carefully.

### Step 1: Unmount the Filesystem

```bash
sudo umount /data
```

If the filesystem is busy:

```bash
sudo fuser -mv /data
# Stop any processes using the filesystem
sudo umount /data
```

### Step 2: Check the Filesystem

Always run a filesystem check before shrinking:

```bash
sudo e2fsck -f /dev/vg_data/lv_data
```

The `-f` flag forces a check even if the filesystem appears clean. This is mandatory before resizing.

### Step 3: Reduce the Filesystem

Shrink the filesystem to the desired size:

```bash
sudo resize2fs /dev/vg_data/lv_data 20G
```

This reduces the filesystem to 20 GB. Make sure the target size is larger than the data currently stored.

### Step 4: Reduce the Logical Volume

After shrinking the filesystem, shrink the logical volume to match:

```bash
sudo lvreduce -L 20G /dev/vg_data/lv_data
```

**Critical**: The logical volume must be at least as large as the filesystem. Always shrink the filesystem first, then the logical volume.

### Step 5: Verify and Remount

```bash
sudo e2fsck -f /dev/vg_data/lv_data
sudo mount /dev/vg_data/lv_data /data
df -Th /data
```

### Using lvreduce with Filesystem Resize

`lvreduce` can handle both operations with the `-r` flag:

```bash
sudo umount /data
sudo e2fsck -f /dev/vg_data/lv_data
sudo lvreduce -r -L 20G /dev/vg_data/lv_data
sudo mount /data
```

The `-r` flag tells `lvreduce` to resize the filesystem before shrinking the logical volume.

## Reducing the Root ext4 Filesystem

The root filesystem cannot be unmounted while running. Use a rescue environment:

1. Boot from RHEL installation media in rescue mode
2. Activate LVM:

```bash
vgchange -ay
```

3. Check the filesystem:

```bash
e2fsck -f /dev/rhel/root
```

4. Shrink the filesystem:

```bash
resize2fs /dev/rhel/root 20G
```

5. Shrink the logical volume:

```bash
lvreduce -L 20G /dev/rhel/root
```

6. Verify:

```bash
e2fsck -f /dev/rhel/root
```

7. Reboot:

```bash
reboot
```

## Checking Available Space Before Shrinking

Before shrinking, verify how much data is on the filesystem:

```bash
sudo df -h /data
sudo dumpe2fs -h /dev/vg_data/lv_data | grep "Free blocks"
```

Calculate the minimum size:

```bash
sudo resize2fs -P /dev/vg_data/lv_data
```

The `-P` flag prints the minimum number of blocks required.

## Troubleshooting

### "Filesystem is still mounted"

`resize2fs` will not shrink a mounted filesystem. Unmount first:

```bash
sudo umount /data
```

### "Please run e2fsck first"

Run the filesystem check:

```bash
sudo e2fsck -f /dev/vg_data/lv_data
```

### "New size too small"

The target size is smaller than the data on the filesystem. Choose a larger size or delete data first.

### resize2fs Reports Errors

If resize2fs fails, the filesystem may have issues. Run a thorough check:

```bash
sudo e2fsck -fy /dev/vg_data/lv_data
```

## Best Practices

- **Always back up before shrinking**: Data loss is possible if the process is interrupted.
- **Check the filesystem before shrinking**: `e2fsck -f` is mandatory.
- **Leave at least 10% free space**: Do not shrink to the exact size of the data.
- **Shrink the filesystem before the logical volume**: Never shrink the LV first.
- **Use `lvreduce -r` when possible**: It handles both operations correctly.

## Conclusion

ext4's ability to both grow and shrink gives it a significant advantage in storage management flexibility. Online extension is quick and non-disruptive, while offline shrinking requires more care but enables reclaiming unused space. Always follow the correct order of operations (check, shrink filesystem, shrink volume) and maintain backups when performing reduction operations.
