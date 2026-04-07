# How to Set Up D3N SSD Cache for RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, SSD, RGW, Cache, Performance

Description: Set up a high-performance SSD-backed local cache for D3N in Ceph RGW to maximize cache throughput and minimize object storage read latency.

---

## Overview

D3N's performance is directly tied to the speed of its local cache storage. Using an NVMe or SSD device as the cache backend instead of a spinning disk or network filesystem dramatically improves cache hit throughput. This guide covers mounting a dedicated SSD for D3N and tuning it for optimal performance.

## Preparing the SSD

Identify and prepare a dedicated SSD or NVMe device for the D3N cache:

```bash
# List available block devices
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# Create a filesystem on the cache device
mkfs.xfs -f /dev/nvme1n1

# Create the mount point
mkdir -p /var/lib/ceph/rgw/cache

# Mount the device
mount /dev/nvme1n1 /var/lib/ceph/rgw/cache

# Verify mount
df -h /var/lib/ceph/rgw/cache
```

Add to `/etc/fstab` for persistence:

```bash
echo "/dev/nvme1n1  /var/lib/ceph/rgw/cache  xfs  defaults,noatime  0 0" >> /etc/fstab
```

## Filesystem Tuning for D3N

XFS with `noatime` is recommended. Additional tuning:

```bash
# Set readahead for sequential cache reads
blockdev --setra 256 /dev/nvme1n1
```

## Configuring D3N to Use the SSD Path

```bash
# Set the cache path and size (leave ~10% free for metadata)
ceph config set client.rgw.myzone rgw_d3n_l1_local_datacache_enabled true
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_persistent_path /var/lib/ceph/rgw/cache
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 85899345920
```

In `ceph.conf`:

```ini
[client.rgw.myzone]
rgw_d3n_l1_local_datacache_enabled = true
rgw_d3n_l1_datacache_persistent_path = /var/lib/ceph/rgw/cache
rgw_d3n_l1_datacache_size = 85899345920
```

## Setting Permissions

Ensure the RGW process can write to the cache directory:

```bash
chown ceph:ceph /var/lib/ceph/rgw/cache
chmod 750 /var/lib/ceph/rgw/cache
```

## Sizing the Cache

A general sizing guideline:

| Working Set | Recommended Cache Size |
|---|---|
| < 100 GB | 20-30 GB |
| 100 GB - 1 TB | 100-200 GB |
| > 1 TB | 10-20% of working set |

## Verifying Cache Activity

```bash
# Check cache directory size growth
watch -n 5 du -sh /var/lib/ceph/rgw/cache

# Monitor D3N stats via admin socket
ceph daemon rgw.myzone perf dump | python3 -m json.tool | grep d3n

# Check RGW logs for cache operations
journalctl -u ceph-radosgw@rgw.myzone --no-pager | grep -E "d3n|cache" | tail -50
```

## Summary

A dedicated SSD or NVMe device provides the best performance for D3N's local cache. Use XFS with noatime, set the correct ownership for the ceph user, and size the cache to hold at least 15-20% of your hot working set. After enabling the cache path in the Ceph config, monitor cache directory growth and D3N performance counters to verify the cache is being populated and hit correctly.
