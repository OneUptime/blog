# How to Set ZFS Properties (Compression, Deduplication, Quota) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Storage, Linux, Configuration

Description: Configure ZFS dataset properties including compression algorithms, deduplication, quotas, reservations, and recordsize on Ubuntu for optimized storage performance.

---

ZFS properties control how datasets store and access data. They're one of ZFS's strongest features - you can tune each dataset individually for its specific workload. Compression for log files, larger record sizes for database WAL, quotas for multi-tenant storage. This guide covers the most practically useful ZFS properties and how to configure them on Ubuntu.

## Property Basics

Properties can be set at the pool level, on a dataset, or inherited from parent datasets. The inheritance chain is:

```text
Pool properties → Root dataset properties → Dataset properties → Child dataset properties
```

When you set a property on a parent, all children inherit it unless they have their own explicit value.

```bash
# Set a property
sudo zfs set <property>=<value> <dataset>

# Get a property (with source showing where it comes from)
sudo zfs get <property> <dataset>

# Get all properties
sudo zfs get all <dataset>

# Inherit (remove local override, revert to parent's value)
sudo zfs inherit <property> <dataset>
```

## Compression

Compression is almost always worth enabling. LZ4 compression is fast enough that it often improves throughput (writing less data to disk is faster than writing uncompressed data).

### Enable compression

```bash
# LZ4 is the best general-purpose choice
sudo zfs set compression=lz4 tank/web

# Enable on entire pool (inherited by all datasets)
sudo zfs set compression=lz4 tank
```

### Compression algorithms

```bash
# LZ4 - fast, good ratio, recommended default
sudo zfs set compression=lz4 tank/logs

# ZSTD - better ratio than LZ4, still fast (ZFS 2.0+)
sudo zfs set compression=zstd tank/backups

# ZSTD with specific level (1-19, higher = smaller but slower)
sudo zfs set compression=zstd-3 tank/archives

# GZIP - for maximum compression ratio (slow)
sudo zfs set compression=gzip-9 tank/cold_storage

# Disable compression
sudo zfs set compression=off tank/already_compressed_data
```

### Check compression effectiveness

```bash
sudo zfs get compressratio,compression tank/web
```

```text
NAME      PROPERTY      VALUE     SOURCE
tank/web  compressratio  2.31x    -
tank/web  compression    lz4      local
```

A ratio above 1.5x means significant savings. Ratios below 1.0x mean the data is already compressed (images, videos, zip files) - compression doesn't help and wastes CPU.

### Disable compression for pre-compressed data

```bash
# Video files, already compressed databases, etc.
sudo zfs set compression=off tank/media
```

## Deduplication

Deduplication stores only one copy of identical data blocks, regardless of how many files reference them. It's effective but requires significant RAM (the dedup table is RAM-resident).

### RAM requirements

A rough estimate: 5-10GB of RAM per 1TB of deduplicated data. Without sufficient RAM, ZFS falls back to disk for the dedup table, which severely impacts performance.

Check if dedup makes sense for your data:

```bash
# Estimate dedup ratio without enabling it
sudo zdb -S tank
```

Look for the "dedup ratio" in the output. A ratio above 2.0x may justify the RAM cost.

### Enable deduplication

```bash
# Enable SHA-256 deduplication (most common)
sudo zfs set dedup=on tank/vms

# Enable with SHA-256 and verify (safer but slower)
sudo zfs set dedup=sha256,verify tank/backups

# Newer: Blake3 hashing (faster than SHA-256)
sudo zfs set dedup=blake3 tank/vms
```

### Check dedup ratio

```bash
sudo zpool list -o name,dedup tank
```

```text
NAME   DEDUP
tank   1.83x
```

### Disable deduplication

Dedup only applies to new writes - disabling it doesn't deduplicate existing data and doesn't immediately free space. Existing duplicate blocks get freed as they're overwritten.

```bash
sudo zfs set dedup=off tank/vms
```

### When to use dedup

Good use cases:
- Virtual machine disk images where many VMs share base images
- Backup storage where similar datasets are backed up repeatedly
- Development environments with many clones of similar codebases

Bad use cases:
- Media files (already unique)
- Compressed data
- Any workload where you don't have 5-10GB RAM per TB of data

## Quotas and Reservations

### Quota: Maximum space a dataset can use

```bash
# web dataset cannot use more than 200GB
sudo zfs set quota=200G tank/web

# Remove quota
sudo zfs set quota=none tank/web
```

When the quota is reached, write operations fail with "disk quota exceeded" errors.

### Refquota: Quota on referenced data only (excludes snapshots)

```bash
# Only count data actually in the dataset, not snapshots
sudo zfs set refquota=100G tank/web
```

`refquota` is often more appropriate than `quota` because snapshots won't count against the user's limit.

### Reservation: Guaranteed minimum space

```bash
# Guarantee tank/databases has at least 500GB available
sudo zfs set reservation=500G tank/databases
```

Reservations prevent other datasets from consuming all pool space, ensuring critical datasets always have room.

### Refreservation: Reserve space for dataset only

```bash
sudo zfs set refreservation=500G tank/databases
```

`refreservation` reserves space for referenced data; snapshots can still grow beyond this if pool space allows.

### View quota and reservation status

```bash
sudo zfs get quota,refquota,reservation,refreservation tank/web
```

## Recordsize

Recordsize controls the maximum block size for data writes. The default is 128KB. Optimal values depend on the workload:

```bash
# Default (128KB) - good for general use
sudo zfs set recordsize=128K tank/web

# Small records for databases (align with database page size)
sudo zfs set recordsize=8K tank/databases/postgresql  # PostgreSQL uses 8K pages
sudo zfs set recordsize=16K tank/databases/mysql      # InnoDB uses 16K pages

# Large records for sequential reads (backups, media, large files)
sudo zfs set recordsize=1M tank/backups
sudo zfs set recordsize=1M tank/media
```

Mismatched recordsize and application I/O size wastes space and reduces performance. For databases, always match ZFS recordsize to the database page size.

## Access Time (atime)

By default, ZFS updates the access time on every file read. Disabling this improves performance:

```bash
# Disable access time updates (recommended for most workloads)
sudo zfs set atime=off tank

# Keep atime but use relative updates (less I/O than full atime)
sudo zfs set atime=on tank
sudo zfs set relatime=on tank
```

## Extended Attributes (xattr)

The `xattr=sa` setting stores extended attributes in the inode rather than a separate file, which is more efficient:

```bash
# Store xattrs in system attribute space (more efficient)
sudo zfs set xattr=sa tank

# Traditional behavior
sudo zfs set xattr=on tank
```

The `sa` mode is recommended for most workloads, especially those using ACLs.

## Case Sensitivity

For datasets that will be accessed by systems expecting case-insensitive filenames (Windows, macOS via NFS/SMB):

```bash
# Case-insensitive filesystem
sudo zfs create -o casesensitivity=insensitive tank/windows_share

# Default (case-sensitive)
sudo zfs create -o casesensitivity=sensitive tank/linux_data
```

This property must be set at creation time and cannot be changed.

## Copies: Extra Data Redundancy

ZFS can store multiple copies of data within a dataset (separate from pool-level RAID redundancy):

```bash
# Store 2 copies of every block (extra protection for single-disk pools)
sudo zfs set copies=2 tank/important_data

# 3 copies (maximum)
sudo zfs set copies=3 tank/critical_data
```

This doubles or triples space usage but provides protection even on single-disk pools against partial disk failure or bit rot when no RAID is configured.

## Viewing All Properties

```bash
# Show all properties with source and inherited status
sudo zfs get all tank/web | head -40

# Show only modified (non-default) properties
sudo zfs get all tank/web | grep -v "default"

# Compare properties across datasets
sudo zfs get compression,atime,recordsize,quota tank tank/web tank/databases
```

## Typical Configuration for Common Workloads

### Web application data

```bash
sudo zfs create -o compression=lz4 -o atime=off -o xattr=sa \
  -o quota=200G -o recordsize=128K tank/web
```

### PostgreSQL database

```bash
sudo zfs create -o compression=lz4 -o atime=off -o xattr=sa \
  -o recordsize=8K -o primarycache=metadata tank/databases/postgresql
```

### Log storage

```bash
sudo zfs create -o compression=zstd -o atime=off -o quota=500G \
  -o recordsize=128K tank/logs
```

### Backup storage

```bash
sudo zfs create -o compression=zstd -o atime=off \
  -o recordsize=1M tank/backups
```

### Virtual machine images

```bash
sudo zfs create -V 100G -o compression=off -o primarycache=metadata \
  -b 8K tank/vms/vm1
```

These property combinations are starting points - benchmark with your actual workload and adjust accordingly. ZFS's per-dataset tuning is one of its biggest advantages over traditional storage stacks.
