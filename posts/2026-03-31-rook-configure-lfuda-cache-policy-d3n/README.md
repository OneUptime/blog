# How to Configure LFUDA Cache Policy for D3N

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, LFUDA, Cache, Eviction, RGW

Description: Configure the LFUDA (Least Frequently Used with Dynamic Aging) cache eviction policy for D3N in Ceph RGW to maximize cache efficiency for mixed workloads.

---

## Overview

D3N supports two cache eviction policies: LRU (Least Recently Used) and Random. LRU is the default and recommended policy for most workloads. When the cache is full and a new object needs to be stored, the eviction policy determines which cached object is removed. Understanding these options helps you tune D3N for your specific access patterns.

## How LRU Works

LRU tracks the order in which cached objects are accessed. Each time an object is read from cache, it moves to the head of the list. When eviction is needed, the object at the tail (least recently used) is removed. This ensures that objects actively being accessed stay cached while stale objects get evicted.

## Default LRU Behavior

LRU is the default eviction policy for D3N and requires no explicit configuration to enable:

```bash
# Check current eviction policy configuration
ceph config get client.rgw.myzone rgw_d3n_l1_eviction_policy
```

## Configuring Eviction Policy

```bash
# Set eviction policy explicitly (lru is default)
ceph config set client.rgw.myzone rgw_d3n_l1_eviction_policy lru

# Or use random eviction
ceph config set client.rgw.myzone rgw_d3n_l1_eviction_policy random

# Set the cache size (default is 1 GiB)
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 21474836480
```

In `ceph.conf`:

```ini
[client.rgw.myzone]
rgw_d3n_l1_local_datacache_enabled = true
rgw_d3n_l1_datacache_persistent_path = /tmp/rgw_datacache/
rgw_d3n_l1_datacache_size = 21474836480
rgw_d3n_l1_eviction_policy = lru
```

## Monitoring Cache Activity

D3N does not register dedicated perf counters. To monitor cache behavior, enable datacache debug logging and check the logs:

```bash
# Enable D3N datacache debug logging
ceph config set client.rgw.myzone debug_rgw_datacache 20

# Check cache-related log entries
journalctl -u ceph-radosgw@rgw.myzone --no-pager | grep -i "d3n\|datacache" | tail -20

# Check how full the cache is
du -sh /tmp/rgw_datacache/
df -h /tmp/rgw_datacache/
```

## Tuning Cache Size to Reduce Evictions

The most effective way to improve cache efficiency is to size the cache appropriately. If you see frequent evictions:

```bash
# Check eviction-related log entries
journalctl -u ceph-radosgw@rgw.myzone --no-pager | grep -i evict | wc -l

# Increase cache size if the device has space (default is 1 GiB)
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 42949672960
```

## Comparing LRU and Random Eviction

LRU is generally the better choice because it preserves temporal locality - recently accessed objects are more likely to be accessed again. Random eviction can be useful in workloads where access patterns are truly uniform and no temporal locality exists:

| Workload | LRU Efficiency | Random Efficiency |
|---|---|---|
| Streaming media | High | Medium |
| Random one-time reads | Medium | Medium |
| Repeated dataset access | High | Low |
| Mixed workloads | High | Medium |

## Summary

LRU is D3N's default and recommended eviction policy, keeping the most recently accessed objects in cache. The alternative is Random eviction for workloads without temporal locality. The most important tuning lever is cache size - a larger cache reduces evictions and improves hit rates for all workloads. Monitor cache behavior via `debug_rgw_datacache` logging to determine if your cache is undersized.
