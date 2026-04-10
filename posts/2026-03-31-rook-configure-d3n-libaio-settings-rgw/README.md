# How to Configure D3N libaio Settings for RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, libaio, RGW, Performance, Async IO

Description: Configure libaio asynchronous I/O settings for D3N in Ceph RGW to improve cache read and write performance with non-blocking disk operations.

---

## Overview

D3N uses libaio (Linux asynchronous I/O) to perform non-blocking cache reads and writes. Tuning libaio settings prevents D3N from becoming a bottleneck when serving many concurrent requests. This guide explains the relevant configuration options and how to set them.

## What is libaio?

libaio is a Linux kernel interface for asynchronous I/O operations. Instead of blocking a thread while waiting for a disk read or write to complete, libaio submits the operation and receives a completion notification later. This allows RGW to handle many simultaneous cache operations without spawning excessive threads.

## Installing libaio

```bash
# RHEL/CentOS/Rocky
dnf install libaio -y

# Ubuntu/Debian
apt-get install libaio1 -y

# Verify installation
ldconfig -p | grep libaio
```

## Key D3N Configuration Options

Enable D3N and configure its cache path and size:

```bash
ceph config set client.rgw.myzone rgw_d3n_l1_local_datacache_enabled true
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_persistent_path /var/lib/ceph/rgw/cache
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 10737418240
```

In `ceph.conf`:

```ini
[client.rgw.myzone]
rgw_d3n_l1_local_datacache_enabled = true
rgw_d3n_l1_datacache_persistent_path = /var/lib/ceph/rgw/cache
rgw_d3n_l1_datacache_size = 10737418240
```

D3N uses libaio internally for cache I/O. The libaio behavior is managed automatically by the D3N implementation. The primary tunable that affects libaio performance is the kernel's `aio-max-nr` limit (see below).

## Tuning libaio for Your Workload

Since D3N manages libaio internally, the main tuning lever is the kernel's `aio-max-nr` limit and the D3N cache size.

For high-concurrency environments (many small objects):

```bash
# Increase kernel AIO limit to support more concurrent operations
echo 1048576 > /proc/sys/fs/aio-max-nr

# Use a larger cache to reduce evictions under high request rates
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 21474836480
```

For large object sequential reads:

```bash
# A moderate AIO limit is sufficient for sequential workloads
echo 262144 > /proc/sys/fs/aio-max-nr

# Size the cache based on your working set
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 10737418240
```

## Checking System libaio Limits

```bash
# Check the maximum AIO requests the kernel supports
cat /proc/sys/fs/aio-max-nr

# Check current AIO in use
cat /proc/sys/fs/aio-nr

# Increase if needed
echo 1048576 > /proc/sys/fs/aio-max-nr

# Make permanent
echo "fs.aio-max-nr = 1048576" >> /etc/sysctl.conf
sysctl -p
```

## Monitoring libaio Performance

```bash
# View D3N performance counters including async I/O stats
ceph daemon rgw.myzone perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for k, v in data.items():
    if 'd3n' in k.lower() or 'aio' in k.lower():
        print(k, v)
"

# Check for libaio errors in RGW log
journalctl -u ceph-radosgw@rgw.myzone --no-pager | grep -i "aio\|libaio\|async" | tail -30
```

## Summary

D3N uses libaio internally to handle concurrent cache operations efficiently without blocking request threads. While D3N manages its libaio usage automatically, you should ensure the kernel's `aio-max-nr` limit is set high enough for your workload and size the D3N cache appropriately for your access patterns.
