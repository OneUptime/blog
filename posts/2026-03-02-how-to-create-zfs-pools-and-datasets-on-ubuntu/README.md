# How to Create ZFS Pools and Datasets on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Storage, Linux, Pools

Description: Learn to create ZFS storage pools with different vdev topologies and organize data using datasets with custom properties on Ubuntu systems.

---

ZFS storage is organized into pools (zpools) and datasets. A pool defines the physical storage layout and redundancy, while datasets provide a flexible way to organize that storage with per-dataset properties like quotas, compression, and mount points. This guide covers the practical details of creating and configuring both.

## Planning Your Pool Layout

The vdev topology you choose at pool creation time is permanent - you cannot change the RAID level of an existing vdev without destroying and recreating the pool. Plan carefully.

### Choosing a vdev type

| Vdev Type | Redundancy | Min Disks | Usable Space | Use Case |
|-----------|-----------|-----------|--------------|----------|
| Single disk | None | 1 | 100% | Dev/test only |
| Mirror | N-1 disks can fail | 2 | 50% (2-disk) | General purpose |
| RAIDZ1 | 1 disk can fail | 3 | N-1 disks | Balanced storage |
| RAIDZ2 | 2 disks can fail | 4 | N-2 disks | Production data |
| RAIDZ3 | 3 disks can fail | 5 | N-3 disks | Critical data |

For a production NAS or file server with 4 drives, RAIDZ2 is often the best choice - it survives two simultaneous disk failures (which is important given how long rebuilds take on modern large disks).

### Using disk-by-id paths

Always use persistent disk identifiers rather than `/dev/sdX` names:

```bash
# List available disk identifiers
ls -la /dev/disk/by-id/ | grep -v part

# Common formats:
# ata-WDC_WD1002FBYS-xxxxx (ATA disks)
# nvme-Samsung_SSD_970_EVO-xxxxx (NVMe)
# wwn-0x5000xxx (WWN/world wide name)
```

Device names like `/dev/sdb` can change between reboots. By-id paths never change.

## Creating Different Pool Types

### Single disk pool

```bash
sudo zpool create datapool /dev/disk/by-id/ata-WDC_WD10EZEX-xxxx
```

### Mirror pool (2 disks)

```bash
sudo zpool create datapool mirror \
  /dev/disk/by-id/ata-WDC_WD10EZEX-xxxx-1 \
  /dev/disk/by-id/ata-WDC_WD10EZEX-xxxx-2
```

### Three-way mirror (extra redundancy, better read performance)

```bash
sudo zpool create datapool mirror \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3
```

### RAIDZ1 (4 disks, 1 parity)

```bash
sudo zpool create datapool raidz \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3 \
  /dev/disk/by-id/ata-disk4
```

### RAIDZ2 (4 disks, 2 parity)

```bash
sudo zpool create datapool raidz2 \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3 \
  /dev/disk/by-id/ata-disk4
```

### Striped mirrors (pool with multiple mirror vdevs)

This is like RAID-10 - better performance than RAIDZ, different redundancy model:

```bash
sudo zpool create datapool \
  mirror /dev/disk/by-id/ata-disk1 /dev/disk/by-id/ata-disk2 \
  mirror /dev/disk/by-id/ata-disk3 /dev/disk/by-id/ata-disk4
```

## Pool Creation Options

### Specify a different mount point for the root dataset

```bash
# Pool root mounts at /storage instead of /datapool
sudo zpool create -m /storage datapool /dev/disk/by-id/ata-disk1
```

### Set pool properties at creation

```bash
sudo zpool create \
  -o ashift=12 \          # 4K sector alignment (use 12 for 4096-byte sectors)
  -O compression=lz4 \    # Default compression for all datasets
  -O atime=off \          # Disable access time updates (performance)
  -O xattr=sa \           # Store extended attributes in inodes (performance)
  datapool raidz2 \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3 \
  /dev/disk/by-id/ata-disk4
```

The `-o` flags set pool-level properties, `-O` flags set dataset properties on the root dataset (inherited by children).

### Understanding ashift

`ashift` sets the minimum I/O block size as a power of 2:
- `ashift=9` = 512-byte sectors (old HDDs)
- `ashift=12` = 4096-byte sectors (modern HDDs and most SSDs)
- `ashift=13` = 8192-byte sectors (some enterprise SSDs)

Check your disk's physical sector size:

```bash
sudo fdisk -l /dev/sdb | grep "Sector size"
```

Get it wrong and you'll have poor performance. It cannot be changed after pool creation.

## Verifying Pool Creation

```bash
sudo zpool status datapool
```

```
  pool: datapool
 state: ONLINE
  scan: none requested
config:

        NAME                   STATE     READ WRITE CKSUM
        datapool               ONLINE       0     0     0
          raidz2-0             ONLINE       0     0     0
            ata-disk1          ONLINE       0     0     0
            ata-disk2          ONLINE       0     0     0
            ata-disk3          ONLINE       0     0     0
            ata-disk4          ONLINE       0     0     0

errors: No known data errors
```

```bash
sudo zpool list
```

```
NAME       SIZE  ALLOC   FREE  FRAG    CAP  DEDUP  HEALTH  ALTROOT
datapool  3.63T  1.13M  3.63T    0%     0%  1.00x  ONLINE  -
```

## Creating and Organizing Datasets

### Basic dataset creation

```bash
# Datasets inherit properties from parent by default
sudo zfs create datapool/web
sudo zfs create datapool/databases
sudo zfs create datapool/backups
```

### Dataset with custom mount point

```bash
sudo zfs create -o mountpoint=/var/www datapool/web
sudo zfs create -o mountpoint=/var/lib/postgresql datapool/databases/postgresql
sudo zfs create -o mountpoint=/var/lib/mysql datapool/databases/mysql
```

### Dataset with quota and reservation

```bash
# web dataset: max 200GB, guaranteed 20GB
sudo zfs create \
  -o quota=200G \
  -o reservation=20G \
  -o mountpoint=/var/www \
  datapool/web
```

### Dataset hierarchy example

```bash
# Create a hierarchical structure for a hosting environment
sudo zfs create datapool/customers
sudo zfs create datapool/customers/client_a
sudo zfs create datapool/customers/client_b
sudo zfs create datapool/customers/client_c

# Each client gets a quota
sudo zfs set quota=50G datapool/customers/client_a
sudo zfs set quota=100G datapool/customers/client_b
sudo zfs set quota=25G datapool/customers/client_c
```

## Setting Dataset Properties

### After creation

```bash
# Enable compression
sudo zfs set compression=lz4 datapool/web

# Disable access time (better performance)
sudo zfs set atime=off datapool/databases

# Set recordsize for databases (align with PostgreSQL page size)
sudo zfs set recordsize=8K datapool/databases/postgresql

# Set recordsize for large media files
sudo zfs set recordsize=1M datapool/backups
```

### View dataset properties

```bash
# View all properties for a dataset
sudo zfs get all datapool/web

# View specific properties
sudo zfs get compression,quota,mountpoint,used,available datapool/web
```

```
NAME          PROPERTY    VALUE       SOURCE
datapool/web  compression lz4         local
datapool/web  quota       200G        local
datapool/web  mountpoint  /var/www    local
datapool/web  used        12.4G       -
datapool/web  available   187G        -
```

### Property inheritance

```bash
# Set compression on parent - children inherit it
sudo zfs set compression=lz4 datapool

# Verify child inherits
sudo zfs get compression datapool/web
# SOURCE shows "inherited from datapool"

# Override on a child
sudo zfs set compression=gzip-9 datapool/backups
sudo zfs get compression datapool/backups
# SOURCE shows "local"
```

## Listing Datasets

```bash
# List all datasets in a pool
sudo zfs list -r datapool

# List with specific columns
sudo zfs list -o name,used,avail,refer,mountpoint -r datapool

# List only datasets (not snapshots)
sudo zfs list -t filesystem datapool
```

## Renaming and Destroying Datasets

```bash
# Rename a dataset (updates mount point automatically)
sudo zfs rename datapool/web datapool/website

# Destroy a dataset (all data deleted - no confirmation)
sudo zfs destroy datapool/old_data

# Destroy including child datasets
sudo zfs destroy -r datapool/customers/old_client
```

## Creating ZVols (Block Devices in ZFS)

ZVols are ZFS volumes that present as block devices rather than filesystems:

```bash
# Create a 50GB zvol
sudo zfs create -V 50G -b 8K datapool/vm_disk1

# The zvol appears at /dev/zvol/datapool/vm_disk1
ls -la /dev/zvol/datapool/

# Format it as a regular block device
sudo mkfs.ext4 /dev/zvol/datapool/vm_disk1
# Or use it directly for a VM disk image
```

ZVols are commonly used as iSCSI targets or virtual machine disk images.

Good pool and dataset design upfront pays dividends when you need to manage quotas, apply different compression settings, or set up replication. Taking time to plan the hierarchy before creating datasets makes the system much easier to manage long-term.
