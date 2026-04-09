# How to Understand Distributed Metadata Cache in CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Cache

Description: Learn how the distributed metadata cache works in CephFS and how to tune cache parameters for optimal performance in Rook-Ceph deployments.

---

## Overview

The CephFS MDS maintains a distributed in-memory cache of filesystem metadata - inodes, directory entries, file capabilities, and extended attributes. This cache dramatically reduces latency for metadata operations by avoiding RADOS reads for frequently accessed metadata. Understanding how this cache works and how to size it correctly is critical for CephFS performance.

## What Is Cached

The MDS metadata cache holds:

```text
- Inodes: file and directory metadata (owner, permissions, timestamps, layout)
- Dentries: directory entry mappings (name to inode)
- Capabilities (caps): granted access rights sent to clients
- Directory fragments: for large directories
```

## Cache Memory Management

The MDS limits its cache using a memory-based limit rather than a fixed inode count (Mimic+):

```bash
# View current cache memory limit
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mds mds_cache_memory_limit

# Set cache memory limit to 4 GiB
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_memory_limit 4294967296
```

## Monitor Cache Usage

Check real-time cache statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 cache status
```

This shows current cache memory usage, inode counts by type, and trimming activity.

## Check Cache Pressure

If the MDS is under memory pressure, it will aggressively trim the cache, which increases RADOS reads:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump | jq '.mds | {inodes, caps}'
```

A `caps` count close to `inodes` indicates heavy client-side caching.

## Configure Cache Trim Settings

Tune when and how aggressively the MDS trims its cache:

```bash
# Set the number of dentries to trim per tick (default: 262144)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_trim_threshold 262144

# Set the decay rate for the trim throttle (default: 1.0, lower = more aggressive)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_trim_decay_rate 1.0
```

## Capability Management

Capabilities (caps) are tokens the MDS grants to clients authorizing specific operations (read, write, etc.). The MDS reclaims caps when the cache is full or when other clients need access:

```bash
# View cap count from perf counters
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 perf dump | jq '.mds.caps'

# List client sessions with their cap counts
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 session ls
```

## Multi-Active MDS Cache Distribution

When running multiple active MDS ranks, each rank manages a portion of the namespace (subtree partitioning). The distributed cache is kept consistent through a protocol that involves transferring subtree authority between ranks:

```bash
# View subtree partition
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mds.cephfs:0 get subtrees
```

## Summary

The CephFS distributed metadata cache is the core mechanism that makes metadata operations fast. Proper sizing of the cache using `mds_cache_memory_limit` is the single most impactful tuning parameter for MDS performance. In Rook-Ceph deployments, allocate sufficient memory to MDS pods (typically 2-8 GiB depending on workload) and monitor cache hit rates and trimming frequency to identify when the cache is undersized.
