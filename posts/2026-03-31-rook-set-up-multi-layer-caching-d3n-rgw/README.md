# How to Set Up Multi-Layer Caching with D3N in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, D3N, Cache, RGW, Multi-Layer, Performance

Description: Set up multi-layer caching with D3N in Ceph RGW combining local SSD cache, Redis coordination, and optional CDN integration for maximum read performance.

---

## Overview

A multi-layer caching strategy maximizes cache hit rates by serving objects from the fastest available cache layer. For Ceph RGW with D3N, you can layer local SSD cache and an optional CDN or reverse proxy in front of RGW. D3N is a local per-instance read cache - it does not coordinate cache state across RGW instances. For cross-instance cache coordination, see Ceph's D4N feature which adds a Redis-based directory layer.

## Architecture

```text
Internet --> CDN/Nginx Cache --> RGW D3N Cache (SSD) --> RADOS
```

Each layer serves different purposes:
- **CDN/Nginx**: Caches publicly accessible objects globally
- **D3N local SSD**: Caches object data on local NVMe/SSD per RGW instance
- **RADOS**: Authoritative object store

## Layer 1: D3N Local SSD Cache

D3N caches read requests on local storage using asynchronous I/O. It is a read-only cache - writes pass through directly to RADOS.

```bash
# Enable D3N with a large SSD cache
ceph config set client.rgw.myzone rgw_d3n_l1_local_datacache_enabled true
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_persistent_path /var/lib/ceph/rgw/cache
ceph config set client.rgw.myzone rgw_d3n_l1_datacache_size 107374182400

# Use NVMe for maximum throughput
mkfs.xfs -f /dev/nvme1n1
mount -o noatime /dev/nvme1n1 /var/lib/ceph/rgw/cache
chown ceph:ceph /var/lib/ceph/rgw/cache
```

Additional tuning options:

```bash
# Control cache eviction policy (lru or random, default: lru)
ceph config set client.rgw.myzone rgw_d3n_l1_eviction_policy lru

# Keep cache across restarts (default evicts on start)
ceph config set client.rgw.myzone rgw_d3n_l1_evict_cache_on_start false

# Tune async I/O threads (default: 20)
ceph config set client.rgw.myzone rgw_d3n_libaio_aio_threads 32
```

## Layer 2: Nginx Reverse Proxy Cache

Place Nginx in front of RGW for an additional HTTP cache layer:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=rgw_cache:100m
                 max_size=50g inactive=7d use_temp_path=off;

upstream rgw_backend {
    server 192.168.1.10:7480;
    server 192.168.1.11:7480;
    keepalive 32;
}

server {
    listen 80;
    server_name s3.example.com;

    location / {
        proxy_pass http://rgw_backend;
        proxy_cache rgw_cache;
        proxy_cache_valid 200 1d;
        proxy_cache_use_stale error timeout updating;
        proxy_cache_lock on;
        add_header X-Cache-Status $upstream_cache_status;
    }
}
```

## Cache Coherence Considerations

D3N is a local read cache and does not track writes or invalidate cached entries:

- Writes, PUTs, DELETEs, and COPYs pass through to RADOS without updating the D3N cache.
- If an object is updated on one RGW instance, other instances may serve stale cached copies until the cache entry is evicted.
- By default, the D3N cache directory is purged on each RGW restart (`rgw_d3n_l1_evict_cache_on_start` defaults to `true`).
- For workloads that require cross-instance cache coherence, consider Ceph's D4N architecture which adds Redis-based coordination.

For the Nginx layer, you can purge cached objects when needed:

```bash
# Purge Nginx cache for a specific object (requires ngx_cache_purge module)
curl -X PURGE http://s3.example.com/mybucket/myobject
```

## Monitoring Cache Layers

```bash
# D3N hit rate
ceph daemon rgw.myzone perf dump | python3 -m json.tool | grep d3n

# Nginx cache status
tail -f /var/log/nginx/access.log | grep -E "HIT|MISS|BYPASS"
```

## Summary

A multi-layer caching strategy combines D3N local SSD caching with an optional Nginx reverse proxy for the highest possible cache hit rates. Nginx catches repeated public reads at the HTTP layer, while D3N handles datacenter-level repeated reads on local NVMe/SSD storage. Note that D3N is a per-instance local cache without cross-instance coordination - for workloads requiring shared cache state across multiple RGW instances, evaluate Ceph's D4N feature which provides Redis-based cache directory and coordination.
