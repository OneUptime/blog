# How to Create and Mount an XFS File System on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, XFS, Filesystem, Storage, Linux

Description: Learn how to create, mount, and configure XFS file systems on RHEL, including partition preparation, formatting options, and persistent mount configuration.

---

XFS is the default filesystem on RHEL, designed for high performance and scalability. It supports extremely large files and filesystems, handles parallel I/O efficiently, and is well-suited for enterprise workloads. This guide covers creating and mounting XFS file systems from scratch.

## Prerequisites

- A RHEL system with root or sudo access
- An available disk or partition
- The `xfsprogs` package installed (included by default on RHEL)

## Step 1: Identify Available Storage

List all block devices:

```bash
lsblk
```

Identify the disk or partition you want to format. For this guide, we will use `/dev/sdb`.

## Step 2: Partition the Disk (Optional)

If you want to use the entire disk without partitioning, you can skip this step and format the raw disk. However, creating a partition is recommended.

Using `fdisk`:

```bash
sudo fdisk /dev/sdb
```

Inside fdisk:
1. Press `n` to create a new partition
2. Press `p` for primary
3. Accept defaults for partition number and sizes
4. Press `w` to write and exit

Or using `parted` for GPT partitions:

```bash
sudo parted /dev/sdb mklabel gpt
sudo parted /dev/sdb mkpart primary xfs 1MiB 100%
```

Verify the partition:

```bash
lsblk /dev/sdb
```

## Step 3: Create the XFS File System

Format the partition with XFS:

```bash
sudo mkfs.xfs /dev/sdb1
```

You will see output similar to:

```
meta-data=/dev/sdb1              isize=512    agcount=4, agsize=6553600 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=1, sparse=1, rmapbt=0
         =                       reflink=1    bigtime=1 inobtcount=1
data     =                       bsize=4096   blocks=26214400, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=12800, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
```

### Formatting Options

Set a filesystem label:

```bash
sudo mkfs.xfs -L mydata /dev/sdb1
```

Force overwrite an existing filesystem:

```bash
sudo mkfs.xfs -f /dev/sdb1
```

Specify block size (default is 4096):

```bash
sudo mkfs.xfs -b size=4096 /dev/sdb1
```

Configure for an LVM striped volume:

```bash
sudo mkfs.xfs -d su=64k,sw=4 /dev/vg_data/lv_striped
```

## Step 4: Create a Mount Point

```bash
sudo mkdir -p /data
```

## Step 5: Mount the File System

Mount temporarily:

```bash
sudo mount /dev/sdb1 /data
```

Verify the mount:

```bash
df -Th /data
mount | grep /data
```

## Step 6: Configure Persistent Mounting

For the filesystem to mount automatically at boot, add an entry to `/etc/fstab`.

### Using UUID (Recommended)

Get the UUID:

```bash
sudo blkid /dev/sdb1
```

Add to fstab:

```bash
echo 'UUID=your-uuid-here /data xfs defaults 0 0' | sudo tee -a /etc/fstab
```

### Using Label

If you set a label during formatting:

```bash
echo 'LABEL=mydata /data xfs defaults 0 0' | sudo tee -a /etc/fstab
```

### Using Device Path

```bash
echo '/dev/sdb1 /data xfs defaults 0 0' | sudo tee -a /etc/fstab
```

Device paths can change between reboots, so UUID or label is preferred.

### Test the fstab Entry

```bash
sudo umount /data
sudo mount -a
df -Th /data
```

## Step 7: Set Permissions

After mounting, set appropriate ownership and permissions:

```bash
sudo chown user:group /data
sudo chmod 755 /data
```

## Common Mount Options for XFS

| Option | Description |
|--------|-------------|
| `defaults` | rw, suid, dev, exec, auto, nouser, async |
| `noatime` | Do not update access times (improves performance) |
| `nodiratime` | Do not update directory access times |
| `nobarrier` | Disable write barriers (use only with battery-backed cache) |
| `logbufs=8` | Increase log buffers for better write performance |
| `inode64` | Allow inodes to be allocated anywhere (default on 64-bit) |
| `allocsize=64k` | Set buffered I/O allocation size |

Example with performance options:

```bash
echo 'UUID=your-uuid /data xfs defaults,noatime,logbufs=8 0 0' | sudo tee -a /etc/fstab
```

## Creating XFS on LVM

A common pattern is to create XFS on an LVM logical volume:

```bash
# Create the logical volume
sudo lvcreate -L 50G -n lv_data vg_data

# Format with XFS
sudo mkfs.xfs /dev/vg_data/lv_data

# Mount
sudo mkdir -p /data
sudo mount /dev/vg_data/lv_data /data

# Add to fstab
echo '/dev/vg_data/lv_data /data xfs defaults 0 0' | sudo tee -a /etc/fstab
```

## Verifying the XFS File System

Check filesystem details:

```bash
xfs_info /data
```

This shows the filesystem geometry including block size, allocation group count, log configuration, and features enabled.

## Conclusion

Creating and mounting an XFS file system on RHEL is a fundamental storage administration task. XFS provides excellent performance and reliability as the default RHEL filesystem. By configuring persistent mounts with UUIDs and choosing appropriate mount options for your workload, you ensure reliable and optimized storage access across system reboots.
