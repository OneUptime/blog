# How to Install and Configure ZFS on Ubuntu for Beginners

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Storage, Linux, File System

Description: Install ZFS on Ubuntu from scratch, understand its key concepts, and configure a basic ZFS pool with datasets for beginners transitioning from traditional filesystems.

---

ZFS is a filesystem and volume manager rolled into one. Unlike ext4 or XFS, which sit on top of block devices managed by separate tools like LVM, ZFS handles everything from the raw disk to the filesystem in a single layer. It brings features that traditionally required expensive storage arrays: checksumming, built-in RAID, compression, deduplication, snapshots, and more.

This guide covers installing ZFS on Ubuntu and getting your first pool running.

## What Makes ZFS Different

Traditional storage stack on Linux:

```
Application
    |
Filesystem (ext4, XFS)
    |
Block device (LV, partition)
    |
RAID (mdadm, hardware RAID)
    |
Physical disks
```

ZFS stack:

```
Application
    |
ZFS (filesystem + volume manager + RAID)
    |
Physical disks
```

ZFS manages everything in one layer, which lets it make intelligent decisions - for example, it can checksum data and verify integrity because it controls both the storage and the filesystem.

### Key ZFS concepts

- **Pool (zpool)**: A storage pool assembled from one or more devices, equivalent to a RAID array + LVM VG combined
- **Dataset**: A filesystem within a pool (like an LV, but with its own properties)
- **Vdev**: A virtual device - a disk, a mirror, or a RAIDZ group within a pool
- **ARC (Adaptive Replacement Cache)**: ZFS's read cache, stored in RAM
- **L2ARC**: An optional secondary read cache on a fast device (SSD)
- **ZIL/SLOG**: ZFS Intent Log - a write cache for sync writes

## Installing ZFS on Ubuntu

ZFS on Linux (OpenZFS) is available in Ubuntu's repositories and is actively maintained.

### Ubuntu 20.04 and later

```bash
sudo apt update
sudo apt install zfsutils-linux
```

This installs the ZFS kernel module (`zfs.ko`) and command-line tools.

Verify the installation:

```bash
# Check the ZFS module is loaded
lsmod | grep zfs

# Check version
sudo zpool version
# or
zfs version
```

### Load the ZFS kernel module (if not auto-loaded)

```bash
sudo modprobe zfs
```

To ensure it loads at boot:

```bash
echo "zfs" | sudo tee -a /etc/modules
```

## Understanding Pool Layout Options

Before creating a pool, decide on the vdev topology:

### Single disk (no redundancy)

Simple pool, no protection against disk failure. Good for testing or non-critical data:

```
zpool: tank
  vdev: /dev/sdb
```

### Mirror (RAID-1 equivalent)

Two or more disks with identical data. Can lose all but one disk:

```
zpool: tank
  mirror
    /dev/sdb
    /dev/sdc
```

### RAIDZ (RAID-5 equivalent)

One parity disk. Minimum 3 disks, can lose 1:

```
zpool: tank
  raidz
    /dev/sdb
    /dev/sdc
    /dev/sdd
```

### RAIDZ2 (RAID-6 equivalent)

Two parity disks. Minimum 4 disks, can lose 2:

```
zpool: tank
  raidz2
    /dev/sdb
    /dev/sdc
    /dev/sdd
    /dev/sde
```

## Creating Your First ZFS Pool

### Identify available disks

```bash
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
# or
sudo fdisk -l
```

### Create a simple pool

For testing with a single disk:

```bash
sudo zpool create tank /dev/sdb
```

For a mirror with two disks:

```bash
sudo zpool create tank mirror /dev/sdb /dev/sdc
```

The pool is immediately available. ZFS automatically creates a root dataset at `/tank`.

### Verify the pool

```bash
sudo zpool status
```

```
  pool: tank
 state: ONLINE
  scan: none requested
config:

        NAME        STATE     READ WRITE CKSUM
        tank        ONLINE       0     0     0
          sdb       ONLINE       0     0     0

errors: No known data errors
```

```bash
# Check pool utilization
sudo zpool list
```

```
NAME    SIZE  ALLOC   FREE  CKPOINT  EXPANDSZ   FRAG    CAP  DEDUP    HEALTH  ALTROOT
tank    496G   312K   496G        -         -     0%     0%  1.00x    ONLINE  -
```

## Creating Datasets

Datasets are ZFS filesystems within a pool. They're mounted automatically and can have individual properties.

### Create basic datasets

```bash
# Create a dataset for web content
sudo zfs create tank/web

# Create nested datasets
sudo zfs create tank/databases
sudo zfs create tank/databases/postgresql
sudo zfs create tank/databases/mysql

# Create a dataset for home directories
sudo zfs create tank/home
```

### List datasets

```bash
sudo zfs list
```

```
NAME                      USED  AVAIL     REFER  MOUNTPOINT
tank                      624K  480G       120K  /tank
tank/databases            240K  480G       120K  /tank/databases
tank/databases/mysql      120K  480G       120K  /tank/databases/mysql
tank/databases/postgresql 120K  480G       120K  /tank/databases/postgresql
tank/home                 120K  480G       120K  /tank/home
tank/web                  120K  480G       120K  /tank/web
```

### Custom mount points

```bash
# Set a custom mount point for a dataset
sudo zfs set mountpoint=/var/www tank/web
sudo zfs set mountpoint=/var/lib/postgresql tank/databases/postgresql

# Or specify at creation
sudo zfs create -o mountpoint=/var/lib/mysql tank/databases/mysql
```

## Enabling Compression

ZFS compression is transparent and often improves performance by reducing I/O. Enable it:

```bash
# Enable LZ4 compression on the entire pool
sudo zfs set compression=lz4 tank

# Enable on a specific dataset only
sudo zfs set compression=lz4 tank/web

# Compression is inherited by child datasets
sudo zfs create tank/new_data  # inherits compression=lz4 from tank
```

Check compression ratio:

```bash
sudo zfs get compressratio tank
```

```
NAME  PROPERTY       VALUE     SOURCE
tank  compressratio  1.45x     -
```

A ratio of 1.45x means the data compresses to about 69% of its original size.

## Setting Quotas

Limit how much space a dataset can use:

```bash
# Set a 100GB quota on the web dataset
sudo zfs set quota=100G tank/web

# Set a reservation (guarantee minimum space)
sudo zfs set reservation=10G tank/databases/postgresql
```

## Basic ZFS Pool Properties

Configure the pool's behavior:

```bash
# Enable autoexpand (auto-use disk space if pool disk is replaced with larger one)
sudo zpool set autoexpand=on tank

# Enable autoreplace (auto-replace failed disks with hot spares if configured)
sudo zpool set autoreplace=on tank

# Check all pool properties
sudo zpool get all tank
```

## Viewing ZFS Status

```bash
# Pool health and configuration
sudo zpool status -v

# Dataset space usage
sudo zfs list -r tank

# I/O statistics
sudo zpool iostat 2
```

```
              capacity     operations     bandwidth
pool        alloc   free   read  write   read  write
----------  -----  -----  -----  -----  -----  -----
tank        1.20G  494G       5     12   432K  1.10M
```

## Exporting and Importing Pools

ZFS pools are portable. To move a pool to another system:

```bash
# Export the pool (makes it safe to move disks)
sudo zpool export tank

# On the new system, import it
sudo zpool import tank

# If the system doesn't find the pool automatically
sudo zpool import -d /dev/disk/by-id/ tank
```

ZFS recommends using disk-by-id paths instead of `/dev/sdX` names for portability:

```bash
# List disks by ID
ls /dev/disk/by-id/

# Create pool using stable identifiers
sudo zpool create tank /dev/disk/by-id/ata-WDC_WD1002FBYS_XXXX
```

## Destroying a Pool

```bash
# This permanently deletes all data in the pool
sudo zpool destroy tank
```

ZFS is a powerful platform to build on. Once comfortable with pools and datasets, the next steps are snapshots, replication, and RAIDZ configurations - all covered in the companion guides.
