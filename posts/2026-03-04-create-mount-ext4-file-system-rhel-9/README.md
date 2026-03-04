# How to Create and Mount an ext4 File System on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ext4, Filesystems, Storage, Linux

Description: Learn how to create, mount, and configure ext4 file systems on RHEL, covering partition preparation, formatting options, and persistent mount configuration.

---

While XFS is the default filesystem on RHEL, ext4 remains widely used and fully supported. ext4 is a mature and reliable filesystem that offers features like online resizing (both growing and shrinking), journaling, and excellent compatibility. This guide covers creating and mounting ext4 filesystems on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- An available disk or partition
- The `e2fsprogs` package installed (included by default)

## Step 1: Identify Available Storage

```bash
lsblk
```

Identify the target disk. For this guide, we use `/dev/sdb`.

## Step 2: Partition the Disk

Using `fdisk`:

```bash
sudo fdisk /dev/sdb
```

Create a new partition:
1. Press `n` for new partition
2. Press `p` for primary
3. Accept defaults for partition number and sizes
4. Press `w` to write and exit

Or using `parted` for GPT:

```bash
sudo parted /dev/sdb mklabel gpt
sudo parted /dev/sdb mkpart primary ext4 1MiB 100%
```

## Step 3: Create the ext4 File System

Basic formatting:

```bash
sudo mkfs.ext4 /dev/sdb1
```

### Formatting Options

Set a filesystem label:

```bash
sudo mkfs.ext4 -L mydata /dev/sdb1
```

Specify block size:

```bash
sudo mkfs.ext4 -b 4096 /dev/sdb1
```

Adjust inode ratio (more inodes for many small files):

```bash
sudo mkfs.ext4 -i 4096 /dev/sdb1
```

Disable journal for performance (not recommended for most use cases):

```bash
sudo mkfs.ext4 -O ^has_journal /dev/sdb1
```

Enable 64-bit support for very large filesystems:

```bash
sudo mkfs.ext4 -O 64bit /dev/sdb1
```

Set reserved block percentage (default is 5%):

```bash
sudo mkfs.ext4 -m 1 /dev/sdb1
```

Reducing reserved blocks from 5% to 1% recovers significant space on large filesystems.

## Step 4: Create a Mount Point

```bash
sudo mkdir -p /data
```

## Step 5: Mount the File System

```bash
sudo mount /dev/sdb1 /data
```

Verify:

```bash
df -Th /data
mount | grep /data
```

## Step 6: Configure Persistent Mounting

### Using UUID (Recommended)

```bash
sudo blkid /dev/sdb1
```

Add to `/etc/fstab`:

```bash
UUID=your-uuid-here /data ext4 defaults 0 2
```

The last two fields are:
- `0`: Dump frequency (0 = no dump)
- `2`: fsck pass number (2 for non-root, 1 for root, 0 to skip)

### Using Label

```bash
echo 'LABEL=mydata /data ext4 defaults 0 2' | sudo tee -a /etc/fstab
```

### Test the fstab Entry

```bash
sudo umount /data
sudo mount -a
df -Th /data
```

## Step 7: Set Permissions

```bash
sudo chown user:group /data
sudo chmod 755 /data
```

## Common Mount Options

| Option | Description |
|--------|-------------|
| `defaults` | rw, suid, dev, exec, auto, nouser, async |
| `noatime` | Do not update access times |
| `data=journal` | Journal both data and metadata (safest) |
| `data=ordered` | Journal metadata, flush data before metadata commit (default) |
| `data=writeback` | Journal metadata only (fastest, least safe) |
| `barrier=1` | Enable write barriers (default) |
| `discard` | Enable TRIM for SSDs |
| `commit=60` | Sync data every 60 seconds instead of default 5 |
| `nodelalloc` | Disable delayed allocation |

Example with performance options:

```bash
UUID=your-uuid /data ext4 defaults,noatime,commit=60 0 2
```

## Checking ext4 Filesystem Information

View detailed filesystem information:

```bash
sudo tune2fs -l /dev/sdb1
```

Key fields include:
- Block count and size
- Inode count
- Filesystem features
- Mount count and maximum mount count
- Last check time

## Creating ext4 on LVM

```bash
# Create the logical volume
sudo lvcreate -L 50G -n lv_data vg_data

# Format with ext4
sudo mkfs.ext4 /dev/vg_data/lv_data

# Mount
sudo mkdir -p /data
sudo mount /dev/vg_data/lv_data /data

# Add to fstab
echo '/dev/vg_data/lv_data /data ext4 defaults 0 2' | sudo tee -a /etc/fstab
```

## Conclusion

Creating and mounting ext4 filesystems on RHEL is straightforward and well-supported. While XFS is the default choice, ext4 offers advantages such as the ability to shrink filesystems and a long track record of stability. Choose appropriate mount options for your workload, configure persistent mounts using UUIDs, and consider adjusting the reserved block percentage for data-only filesystems to maximize available space.
