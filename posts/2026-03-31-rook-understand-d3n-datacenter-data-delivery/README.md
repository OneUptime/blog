# How to Understand D3N in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, RGW, Cache, Object Storage

Description: Understand the D3N (Datacenter Data Delivery Network) architecture in Ceph RGW and how it accelerates object storage reads with local datacenter caching.

---

## What is D3N?

D3N stands for Datacenter Data Delivery Network. It is a read cache layer built into the Ceph RADOS Gateway (RGW) that stores frequently accessed objects closer to the consumer. D3N was designed for multi-site deployments where data lives in a remote zone but clients in a local datacenter repeatedly read the same objects.

## How D3N Works

D3N operates as a transparent read-through cache. When an RGW receives a GET request:

1. The gateway checks the local D3N cache (SSD or RAM-backed)
2. If a cache hit occurs, data is served locally without crossing the WAN
3. On a cache miss, the object is fetched from the backend Ceph cluster, served to the client, and written into the cache
4. Subsequent reads for the same object are served from the local cache

```text
Client --> RGW --> D3N Cache --> (hit) --> Client
                            --> (miss) --> Ceph RADOS --> cache --> Client
```

## Architecture Components

D3N uses the following key components:

- **Cache backend** - NVMe SSD, persistent memory, or tmpfs directory on the RGW host
- **libaio** - Asynchronous I/O library for non-blocking cache operations
- **Cache eviction policy** - LRU (Least Recently Used) by default

## When to Use D3N

D3N is most beneficial when:

- You have a multi-site Ceph deployment with sync lag
- Your workload involves repeated reads of the same objects
- Network bandwidth between sites is a bottleneck
- Object sizes are large (video, backups, ML datasets)

It is less useful for write-heavy workloads or purely sequential one-time reads.

## Enabling D3N in Ceph RGW

D3N is configured in the Ceph configuration file or via `ceph config set`:

```bash
# Enable D3N on a specific RGW instance
ceph config set client.rgw.myzone rgw_d3n_l1_local_datacache_enabled true
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_persistent_path /var/lib/ceph/rgw/cache
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 10737418240
```

Or in `ceph.conf`:

```ini
[client.rgw.myzone]
rgw_d3n_l1_local_datacache_enabled = true
rgw_d3n_l1_datacache_persistent_path = /var/lib/ceph/rgw/cache
rgw_d3n_l1_datacache_size = 10737418240
```

## Verifying D3N is Active

```bash
# Check D3N config settings
ceph config get client.rgw.myzone rgw_d3n_l1_local_datacache_enabled

# View RGW logs for D3N activity
journalctl -u ceph-radosgw@rgw.myzone --no-pager | grep -i d3n
```

## Summary

D3N is a powerful read cache layer in Ceph RGW that reduces latency and bandwidth consumption by caching frequently accessed objects locally. It is especially valuable in multi-site deployments. Understanding its architecture - including cache backends, libaio for async I/O, and LRU eviction - is the foundation for tuning and monitoring D3N effectively in production.
