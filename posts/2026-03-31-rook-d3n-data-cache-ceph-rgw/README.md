# How to Configure D3N Data Cache for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cache, Performance, Object Storage, D3N, Tiering

Description: Configure D3N (Datacenter-scale Distributed Durable Data-caching Networking) cache for Ceph RGW to accelerate reads from tiered or remote object storage.

---

D3N (Datacenter-Data-Delivery Network) is a cache layer in Ceph RGW that accelerates reads by caching frequently accessed objects on local NVMe or SSD storage. It is particularly useful for RGW deployments that use cloud-tiered data or have high-latency backend storage.

## What D3N Solves

In cloud-tiering scenarios, objects transitioned to S3-compatible remote storage are fetched over WAN when accessed. D3N caches these objects locally after the first fetch, dramatically reducing repeated-read latency and egress costs.

## Prerequisites

- A local NVMe/SSD device or directory designated for the cache
- Ceph Pacific (16.x) or later
- RGW configured with cloud-tiering or a remote data backend

## Configuring D3N in RGW

Enable the D3N cache and point it to a local cache directory:

```bash
ceph config set client.rgw rgw_d3n_l1_local_datacache_enabled true
ceph config set client.rgw rgw_d3n_l1_datacache_persistent_path /mnt/nvme/rgw-cache
ceph config set client.rgw rgw_d3n_l1_datacache_size 10737418240
```

Key configuration parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `rgw_d3n_l1_local_datacache_enabled` | Enable D3N caching | false |
| `rgw_d3n_l1_datacache_size` | Max cache size in bytes | 10GiB |
| `rgw_d3n_l1_datacache_persistent_path` | Local directory for cache storage | - |

## Preparing the NVMe Cache Directory

D3N uses a local filesystem on NVMe or SSD for caching. Create and mount the cache directory:

```bash
mkfs.xfs /dev/nvme0n1
mount /dev/nvme0n1 /mnt/nvme
mkdir -p /mnt/nvme/rgw-cache
chown ceph:ceph /mnt/nvme/rgw-cache
```

## Verifying Cache Operation

Check cache hit/miss statistics via the admin socket:

```bash
ceph daemon client.rgw.$(hostname -s) perf dump | grep d3n
```

Look for `d3n_cache_hit` and `d3n_cache_miss` counters. A high hit ratio indicates the cache is effective.

## Cache Eviction

D3N uses LRU eviction. When the cache reaches its size limit, the least recently used objects are evicted. Tune the size based on your working set:

```bash
ceph config set client.rgw rgw_d3n_l1_datacache_size 53687091200
# 50GiB - adjust based on available NVMe capacity
```

## Summary

D3N provides an RGW-level cache that dramatically reduces read latency for tiered or remote-backed objects. Configure it with a local NVMe or SSD filesystem, set an appropriate cache size for your working set, and monitor hit ratios to validate effectiveness. D3N is transparent to S3 clients and requires no application changes.
