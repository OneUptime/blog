# How to Compare D3N vs Traditional RGW Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, RGW, Cache, Comparison, Performance

Description: Compare D3N datacenter caching with traditional RGW caching approaches in Ceph to choose the right strategy for your object storage workload.

---

## Overview

Ceph RGW has evolved to support multiple caching strategies. Understanding the differences between D3N, RGW Datacache, and traditional proxy-based caching helps you choose the right approach for your access patterns and infrastructure.

## Traditional RGW (No Caching)

Out of the box, Ceph RGW forwards every GET request directly to the RADOS object store. There is no local caching.

```text
Client --> RGW --> RADOS --> Client
```

- Every read hits the OSD network
- Consistent but potentially high latency
- Simple to operate
- Best for write-heavy or one-time-read workloads

## RGW Datacache (Older Approach)

Before D3N, Ceph had an earlier datacache feature. It was limited and not widely used in production:

- No Redis coordination
- No LRU-based eviction
- Less mature codebase
- Limited to specific Ceph versions

## D3N (Datacenter Data Delivery Network)

D3N is the modern, actively maintained cache layer for RGW:

```text
Client --> RGW --> D3N Cache (local SSD) --> (hit) --> Client
                                         --> (miss) --> RADOS --> cache --> Client
```

Features of D3N:
- LRU eviction policy (with random as an alternative)
- Optional Redis coordination for multi-RGW deployments
- libaio for non-blocking cache I/O
- Cache stored on local SSD (note: cache is purged on RGW restart)

## Feature Comparison

| Feature | No Cache | D3N |
|---|---|---|
| Read latency | High (RADOS) | Low (SSD) on cache hit |
| Write performance | Unchanged | Unchanged |
| Multi-RGW coordination | N/A | Via Redis |
| Eviction policy | N/A | LRU (default) or random |
| Cache persistence | N/A | No (purged on RGW restart) |
| Configuration complexity | Low | Medium |
| Best for | Write workloads | Read-heavy, repeated access |

## Benchmark Comparison

A typical 3-node Ceph cluster with D3N on NVMe:

```bash
# Upload test objects (must be >4 MiB for D3N to cache tail objects)
# Use an S3 client to benchmark through RGW, not rados bench
# (rados bench bypasses RGW and will not exercise the D3N cache)

# Without D3N - S3 GET routed to RADOS
s3cmd get s3://testbucket/largefile /dev/null
# Result: ~300 MiB/s, ~5ms avg latency

# With D3N - cache hit (after warm-up with repeated reads)
s3cmd get s3://testbucket/largefile /dev/null
# Result: ~1500 MiB/s, ~0.5ms avg latency (limited by NVMe speed)
```

## When to Use D3N

Use D3N when:
- Objects are read multiple times (media, datasets, backups)
- You have multi-site deployments with sync lag
- Network bandwidth between clients and OSDs is constrained
- Read latency is a primary concern

Avoid D3N when:
- Workload is primarily write-heavy
- Objects are read once and never again
- Cache storage (SSD) is not available
- Object sizes are very small (metadata-heavy workloads)

## Enabling D3N for Comparison Testing

```bash
# Enable D3N on one RGW instance for A/B testing
ceph config set client.rgw.zone-a rgw_d3n_l1_local_datacache_enabled true
ceph config set client.rgw.zone-a rgw_d3n_l1_datacache_persistent_path /var/lib/ceph/rgw/cache
ceph config set client.rgw.zone-a rgw_d3n_l1_datacache_size 10737418240

# Keep another instance without D3N for comparison
ceph config set client.rgw.zone-b rgw_d3n_l1_local_datacache_enabled false
```

## Summary

D3N is superior to traditional no-cache RGW for read-heavy workloads with repeated object access, offering order-of-magnitude latency improvements on cache hits. The trade-off is operational complexity - requiring dedicated SSD storage, optional Redis coordination, ongoing monitoring, and cache warm-up after each RGW restart. For write-heavy or single-read workloads, the simpler no-cache configuration is often the better choice.
