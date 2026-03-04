# How to Create a Deduplicated and Compressed LVM-VDO Volume on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, LVM, Deduplication, Compression, Storage, Linux

Description: Learn how to create LVM-VDO volumes on RHEL that provide inline deduplication and compression, significantly reducing physical storage consumption for redundant data.

---

VDO (Virtual Data Optimizer) provides inline deduplication and compression for block storage on RHEL. In RHEL, VDO is integrated directly into LVM as a logical volume type, making it easier to manage alongside your existing LVM infrastructure. This guide covers creating and configuring LVM-VDO volumes.

## Prerequisites

- A RHEL system with root or sudo access
- An LVM volume group with available space
- The `lvm2` and `kmod-kvdo` packages installed

```bash
sudo dnf install lvm2 kmod-kvdo -y
```

## Understanding VDO

VDO provides two key data reduction technologies:

- **Deduplication**: Identifies and eliminates duplicate blocks of data. If the same 4KB block appears multiple times, only one copy is stored, and all references point to it.
- **Compression**: Compresses unique data blocks to reduce their physical footprint.

These operate transparently at the block level, meaning any filesystem or application can benefit without modification.

Typical space savings:
- Virtual machine images: 10:1 or higher
- Container images: 3:1 to 5:1
- General file storage: 1.5:1 to 3:1
- Already compressed data (videos, archives): minimal savings

## Step 1: Verify VDO Kernel Module

Ensure the VDO kernel module is loaded:

```bash
sudo modprobe kvdo
lsmod | grep kvdo
```

## Step 2: Prepare a Volume Group

If you do not have a volume group, create one:

```bash
sudo pvcreate /dev/sdb
sudo vgcreate vg_vdo /dev/sdb
```

Check available space:

```bash
sudo vgs vg_vdo
```

## Step 3: Create an LVM-VDO Volume

Create a VDO logical volume:

```bash
sudo lvcreate --type vdo --name lv_vdo --size 100G --virtualsize 300G vg_vdo
```

Parameters:
- `--type vdo`: Specifies VDO logical volume type
- `--name lv_vdo`: Name of the logical volume
- `--size 100G`: Physical size (actual disk space used)
- `--virtualsize 300G`: Logical size presented to the filesystem (3:1 overprovisioning)

The ratio between virtual size and physical size reflects your expected deduplication and compression savings. A 3:1 ratio is a conservative starting point.

## Step 4: Verify the VDO Volume

```bash
sudo lvs -a -o +vdo_operating_mode,vdo_compression_state,vdo_index_state vg_vdo
```

Check VDO-specific properties:

```bash
sudo lvs -o name,size,data_percent,vdo_saving_percent vg_vdo
```

## Step 5: Create a Filesystem

Format the VDO volume. Use the `-K` option with XFS to skip discard during formatting:

```bash
sudo mkfs.xfs -K /dev/vg_vdo/lv_vdo
```

Or for ext4:

```bash
sudo mkfs.ext4 -E nodiscard /dev/vg_vdo/lv_vdo
```

The `-K` and `nodiscard` options prevent the formatter from trying to discard the entire virtual size, which would be very slow.

## Step 6: Mount the Filesystem

```bash
sudo mkdir -p /vdo-data
sudo mount /dev/vg_vdo/lv_vdo /vdo-data
```

Add to `/etc/fstab`:

```bash
/dev/vg_vdo/lv_vdo /vdo-data xfs defaults,x-systemd.requires=vdo.service,discard 0 0
```

The `discard` option enables online TRIM, which allows VDO to reclaim space when files are deleted.

## Step 7: Verify Deduplication and Compression

Write some duplicate data to test:

```bash
# Write a 1GB file
dd if=/dev/urandom of=/vdo-data/file1.dat bs=1M count=1024

# Copy it (creates duplicate data)
cp /vdo-data/file1.dat /vdo-data/file2.dat
cp /vdo-data/file1.dat /vdo-data/file3.dat
```

Check space savings:

```bash
sudo lvs -o name,size,data_percent,vdo_saving_percent vg_vdo
```

The `vdo_saving_percent` shows the deduplication and compression ratio.

For detailed VDO statistics:

```bash
sudo vdostats --human-readable
```

## Step 8: Configure VDO Settings

### Adjust Compression

Compression is enabled by default. To toggle it:

```bash
# Disable compression
sudo lvchange --compression n vg_vdo/lv_vdo

# Enable compression
sudo lvchange --compression y vg_vdo/lv_vdo
```

### Adjust Deduplication

```bash
# Disable deduplication
sudo lvchange --deduplication n vg_vdo/lv_vdo

# Enable deduplication
sudo lvchange --deduplication y vg_vdo/lv_vdo
```

## Virtual Size Planning

Choosing the right virtual-to-physical ratio is important:

| Data Type | Recommended Ratio |
|-----------|------------------|
| Virtual machine images | 10:1 |
| Container storage | 3:1 to 5:1 |
| General file storage | 2:1 to 3:1 |
| Database storage | 1.5:1 to 2:1 |
| Already compressed data | 1:1 (no overprovisioning) |

Start conservatively and increase the virtual size as you observe actual savings:

```bash
sudo lvextend --virtualsize 500G vg_vdo/lv_vdo
sudo xfs_growfs /vdo-data
```

## Best Practices

- **Start with a conservative virtual-to-physical ratio** and adjust based on observed savings.
- **Monitor space savings regularly** to ensure the physical device does not fill up.
- **Use the `discard` mount option** so VDO can reclaim space when files are deleted.
- **Use `-K` with mkfs.xfs** and `-E nodiscard` with mkfs.ext4 to avoid slow formatting.
- **Plan for the UDS index**: The deduplication index (UDS) uses memory. Plan approximately 1 GB of RAM per 1 TB of physical storage.

## Conclusion

LVM-VDO volumes on RHEL provide powerful inline deduplication and compression that can dramatically reduce physical storage consumption. The integration with LVM makes VDO volumes easy to create and manage alongside your existing storage infrastructure. By choosing appropriate virtual-to-physical ratios and monitoring space savings, you can optimize your storage investment while maintaining the performance characteristics your applications need.
