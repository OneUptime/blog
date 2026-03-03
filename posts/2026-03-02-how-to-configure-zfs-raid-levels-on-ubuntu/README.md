# How to Configure ZFS RAID Levels (mirror, raidz, raidz2) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, RAID, Storage, Linux

Description: Configure ZFS mirror, RAIDZ, and RAIDZ2 pools on Ubuntu with practical examples, disk requirements, and guidance on choosing the right redundancy level for your workload.

---

ZFS has its own built-in RAID implementation that differs meaningfully from traditional hardware RAID or software RAID (mdadm). ZFS RAID is always done at the software level, which gives it full visibility into data integrity through end-to-end checksumming. This guide covers configuring ZFS mirror, RAIDZ, and RAIDZ2 pools on Ubuntu.

## ZFS RAID Terminology

ZFS uses specific terminology that maps roughly to traditional RAID:

- **vdev** (virtual device): The fundamental RAID unit in ZFS. A pool is made of one or more vdevs.
- **mirror**: Two or more disks with identical data (RAID-1 equivalent)
- **raidz**: Single parity - one disk worth of overhead (RAID-5 equivalent)
- **raidz2**: Double parity - two disks worth of overhead (RAID-6 equivalent)
- **raidz3**: Triple parity - three disks worth of overhead (no exact traditional equivalent)
- **stripe**: Multiple vdevs arranged for performance - data striped across vdevs without redundancy between them

**Critical ZFS RAID concept**: Redundancy exists within a vdev, not between vdevs. If you create a pool with two raidz vdevs and one vdev loses two disks (more than it can handle), you lose the pool even if the other vdev is healthy.

## Disk Identification

Use stable disk identifiers for any production pool:

```bash
# List disks by their persistent ID
ls -la /dev/disk/by-id/ | grep -v part | awk '{print $NF, $9}'

# Example output:
# /dev/sdb -> ../../sdb ata-WDC_WD4000FYYZ-xxxx-001
# /dev/sdc -> ../../sdc ata-WDC_WD4000FYYZ-xxxx-002
```

Throughout this guide, I'll use descriptive aliases for clarity.

## Mirror Configuration

### Two-disk mirror

The simplest redundant configuration. Tolerates one disk failure.

```bash
sudo zpool create datapool mirror \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2
```

Usable capacity: ~50% of total raw capacity (2TB raw = 1TB usable).

```bash
sudo zpool status datapool
```

```text
  pool: datapool
 state: ONLINE
config:

        NAME                STATE
        datapool            ONLINE
          mirror-0          ONLINE
            ata-disk1       ONLINE
            ata-disk2       ONLINE
```

### Three-disk mirror

More redundant - survives two simultaneous disk failures. Also improves read performance (reads can be served from any mirror member).

```bash
sudo zpool create datapool mirror \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3
```

Usable capacity: ~33% of total raw capacity.

### Multiple mirror vdevs (RAID-10 equivalent)

Stripe across multiple mirrors for better performance:

```bash
# Two mirror vdevs - data striped across both
sudo zpool create datapool \
  mirror /dev/disk/by-id/ata-disk1 /dev/disk/by-id/ata-disk2 \
  mirror /dev/disk/by-id/ata-disk3 /dev/disk/by-id/ata-disk4
```

Usable capacity: 50% of raw (4 x 1TB = 2TB usable). Can survive the loss of one disk from each mirror pair.

Performance characteristics: Very good read performance (parallel reads from two mirror pairs), excellent write performance.

## RAIDZ1 Configuration

RAIDZ1 provides single parity protection - one disk in the group can fail without data loss.

### Minimum 3 disks

```bash
# 3-disk RAIDZ1: 2 data disks + 1 parity
sudo zpool create datapool raidz \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3
```

Usable: ~66% (2 of 3 disks).

### Recommended: 4-5 disks

```bash
# 4-disk RAIDZ1: 3 data + 1 parity
sudo zpool create datapool raidz \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3 \
  /dev/disk/by-id/ata-disk4
```

Usable: 75% (3 of 4 disks).

```bash
sudo zpool status datapool
```

```text
  pool: datapool
 state: ONLINE
config:

        NAME                STATE
        datapool            ONLINE
          raidz1-0          ONLINE
            ata-disk1       ONLINE
            ata-disk2       ONLINE
            ata-disk3       ONLINE
            ata-disk4       ONLINE
```

## RAIDZ2 Configuration

RAIDZ2 provides double parity - two disks can fail simultaneously without data loss.

### Minimum 4 disks

```bash
# 4-disk RAIDZ2: 2 data + 2 parity
sudo zpool create datapool raidz2 \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3 \
  /dev/disk/by-id/ata-disk4
```

Usable: 50% (2 of 4 disks). With 4 disks this is the same as a mirror in terms of usable space but with different performance characteristics.

### Recommended: 6-8 disks

```bash
# 6-disk RAIDZ2: 4 data + 2 parity
sudo zpool create datapool raidz2 \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3 \
  /dev/disk/by-id/ata-disk4 \
  /dev/disk/by-id/ata-disk5 \
  /dev/disk/by-id/ata-disk6
```

Usable: ~67% (4 of 6 disks).

```bash
# 8-disk RAIDZ2: 6 data + 2 parity
sudo zpool create datapool raidz2 \
  /dev/disk/by-id/ata-disk{1..8}
```

Usable: 75% (6 of 8 disks).

## RAIDZ3 Configuration

RAIDZ3 survives three simultaneous disk failures.

```bash
# 5-disk RAIDZ3: 2 data + 3 parity (minimum, poor efficiency)
# 7-disk RAIDZ3: 4 data + 3 parity (better)
sudo zpool create datapool raidz3 \
  /dev/disk/by-id/ata-disk{1..7}
```

RAIDZ3 is used for very large pools with large disks where rebuild times (resilvering) are extremely long, creating a window where a third disk failure would cause data loss.

## Adding a Hot Spare

A hot spare automatically replaces a failed disk in the pool:

```bash
sudo zpool create datapool raidz2 \
  /dev/disk/by-id/ata-disk1 \
  /dev/disk/by-id/ata-disk2 \
  /dev/disk/by-id/ata-disk3 \
  /dev/disk/by-id/ata-disk4 \
  spare /dev/disk/by-id/ata-spare-disk
```

```bash
sudo zpool status
```

```text
  pool: datapool
 state: ONLINE
config:

        NAME              STATE
        datapool          ONLINE
          raidz2-0        ONLINE
            ata-disk1     ONLINE
            ata-disk2     ONLINE
            ata-disk3     ONLINE
            ata-disk4     ONLINE
        spares
          ata-spare-disk  AVAIL
```

Enable `autoreplace` so ZFS uses the spare automatically when a disk fails:

```bash
sudo zpool set autoreplace=on datapool
```

## Choosing the Right Configuration

**For a NAS with 4 drives:**
- RAIDZ2: Best balance of redundancy and efficiency (2 drives can fail)
- 2x Mirror: Better performance, same capacity, can lose 1 disk from each pair

**For a server with 6+ drives:**
- RAIDZ2 with 6 drives: Good efficiency (67% usable), can lose 2 disks
- RAIDZ2 with 8 drives: Better efficiency (75% usable), still can lose 2 disks

**For high-performance workloads:**
- Multiple mirror vdevs: Better IOPS, at the cost of 50% usable space

**For maximum redundancy with large drives:**
- RAIDZ2 or RAIDZ3: Longer rebuild times for large drives make extra parity valuable

## Performance Benchmarking

After creating a pool, test its throughput:

```bash
# Write speed test
sudo dd if=/dev/zero of=/datapool/testfile bs=1M count=1000 conv=fdatasync

# Read speed test (after flushing cache)
sudo echo 3 > /proc/sys/vm/drop_caches
sudo dd if=/datapool/testfile of=/dev/null bs=1M

# More comprehensive with fio
sudo apt install fio
sudo fio --name=randread --ioengine=libaio --iodepth=16 \
  --rw=randread --bs=4k --direct=1 --size=1G \
  --directory=/datapool --runtime=60
```

## Enabling ARC and L2ARC

ZFS's read cache (ARC) uses RAM automatically. Configure the maximum ARC size:

```bash
# Set max ARC to 8GB (by default ZFS uses up to 50% of RAM)
echo "options zfs zfs_arc_max=8589934592" | sudo tee /etc/modprobe.d/zfs.conf
```

Add an L2ARC (SSD cache) to the pool:

```bash
# Add an SSD as a read cache
sudo zpool add datapool cache /dev/disk/by-id/nvme-Samsung-SSD-970-xxxx
```

Add a SLOG (sync write log) device for improved write performance with synchronous writes:

```bash
# Add an NVMe device as a write cache
sudo zpool add datapool log /dev/disk/by-id/nvme-Samsung-SSD-xxxx
```

## Viewing Pool Configuration

```bash
# Detailed pool configuration
sudo zpool status -v datapool

# Pool I/O statistics
sudo zpool iostat datapool 2

# All pool properties
sudo zpool get all datapool
```

Understanding ZFS RAID levels helps you make informed decisions about redundancy versus capacity versus performance. For most general-purpose storage, RAIDZ2 with 6-8 disks provides a good balance, and mirrors are better when IOPS matter more than raw capacity.
