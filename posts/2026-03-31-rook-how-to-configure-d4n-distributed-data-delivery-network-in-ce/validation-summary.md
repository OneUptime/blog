# Validation Summary: How to Configure D4N in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Squid 19.x, Tentacle 20.x)
- Ceph RADOS Gateway (RGW)
- D4N (Distributed Data Delivery Network)
- Redis (as D4N directory/coordination layer)
- Docker (for Redis deployment)
- cephadm / systemctl (for service management)

## Sources Consulted
- Ceph source code: `src/common/options/rgw.yaml.in` on `reef`, `squid`, `tentacle`, and `main` branches (https://github.com/ceph/ceph)
- Ceph source code: `src/rgw/driver/d4n/` directory (D4N filter implementation)
- Ceph source code: `src/rgw/rgw_sal_d4n.cc` and `src/rgw/driver/d4n/rgw_redis_driver.cc` (connection handling)
- Ceph Object Gateway Config Reference (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- Ceph D3N RGW Data Cache documentation (https://docs.ceph.com/en/reef/radosgw/d3n_datacache/)
- Ceph Squid release notes (https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/)
- Ceph Tentacle release notes (https://docs.ceph.com/en/latest/releases/tentacle/)
- D4N-S3Select-Caching research project (https://github.com/CS6620-S21/D4N-S3Select-Caching)
- Red Hat Research: Hybrid Cloud Cache project (https://research.redhat.com/blog/research_project/hybrid-cloud-cache/)
- D4N initial PR #48879 on Ceph GitHub repository

## Issues Found

### 1. Wrong Ceph version (Critical)
- **What was wrong:** The post stated D4N was "introduced in Ceph Reef (18.x)." D4N does not exist in Reef at all — the `src/rgw/driver/d4n/` directory and all D4N config options are absent from the Reef branch. D4N was first introduced with minimal support (two options) in Ceph Squid (19.x) and significantly expanded in Ceph Tentacle (20.x).
- **What was changed:** Updated all version references to correctly state Squid (19.x) for initial support and Tentacle (20.x) for full functionality. Added a note that D4N is experimental.

### 2. Fabricated configuration option names (Critical)
- **What was wrong:** 5 out of 7 configuration options listed do not exist in any Ceph branch: `rgw_d4n_enabled`, `rgw_d4n_l1_datacache_object_size`, `rgw_d4n_l1_datacache_head_ttl`, `rgw_d4n_l1_datacache_disable`, `rgw_d4n_l1_write_datacache`.
- **What was changed:** Replaced all fabricated options with the actual D4N options from the Ceph Tentacle source code, including `rgw_d4n_l1_datacache_persistent_path`, `rgw_d4n_l1_evict_cache_on_start`, `d4n_writecache_enabled`, `rgw_d4n_cache_cleaning_interval`, `rgw_d4n_libaio_aio_threads`, `rgw_d4n_libaio_aio_num`, etc.

### 3. Wrong D4N enablement mechanism (Critical)
- **What was wrong:** The post used `ceph config set client.rgw rgw_d4n_enabled true` to enable D4N. No `rgw_d4n_enabled` option exists. D4N is enabled by setting `rgw_filter = d4n`.
- **What was changed:** Replaced with `ceph config set client.rgw rgw_filter d4n`.

### 4. Wrong Redis connection string format (Critical)
- **What was wrong:** The post used `redis://redis.example.com:6379` URI format. The Ceph source code parses `rgw_d4n_address` as plain `host:port` format by splitting on `:`. A `redis://` prefix would break this parsing.
- **What was changed:** All connection strings changed to `host:port` format (e.g., `127.0.0.1:6379`).

### 5. Fabricated Redis Sentinel support (Major)
- **What was wrong:** The post included a section on "D4N with Redis Sentinel (High Availability)" using a `redis-sentinel://` URI format. There is no evidence of Redis Sentinel support in the D4N source code. The Ceph documentation states the current implementation supports one Redis node.
- **What was changed:** Removed the Redis Sentinel section entirely. Added a note that the current implementation supports one Redis node.

### 6. Fabricated Redis Cluster support (Major)
- **What was wrong:** The post showed configuring multiple Redis nodes for cluster mode. D4N does not support Redis Cluster.
- **What was changed:** Removed Redis Cluster configuration examples.

### 7. Incorrect architecture description (Major)
- **What was wrong:** The post described D4N as purely Redis-backed for object data caching. In reality, Redis serves as the D4N directory (for indexing/coordination), while object data is cached on local SSD by default using libaio. Redis-backed data caching exists as an alternative backend.
- **What was changed:** Rewrote the architecture section to correctly describe Redis as the directory layer and local SSD as the default data cache. Updated the architecture diagram accordingly.

### 8. Unsubstantiated cache tiering replacement claim (Minor)
- **What was wrong:** The post stated D4N is "positioned as an alternative to the deprecated cache tiering feature." Cache tiering was a RADOS-level (block/pool) feature, while D4N is RGW-specific (S3/Swift). They operate at different layers and no official documentation links them.
- **What was changed:** Removed the cache tiering comparison.

### 9. Wrong eviction policy description (Minor)
- **What was wrong:** The post implied LRU eviction via Redis `allkeys-lru`. D4N actually uses LFUDA (Least Frequently Used with Dynamic Aging) as its cache replacement policy.
- **What was changed:** Corrected to reference LFUDA eviction policy.

## Review Notes
- D4N is explicitly marked as experimental in the Ceph source code (`rgw_filter` description: "defaults to none. Other valid values are base and d4n (both experimental)"). Users should be aware this feature may change significantly between releases.
- The D4N configuration landscape is actively evolving. The `main` branch has additional options not yet in a release (e.g., `rgw_d4n_local_rgw_address`, `rgw_d4n_l1_datacache_disk_reserve`). Future Ceph releases may add, rename, or remove options.
- On the `main` development branch, `rgw_d4n_l1_datacache_size` has been replaced by `rgw_d4n_l1_datacache_disk_reserve`, suggesting the cache sizing mechanism may change in future releases.
- The post originally had 9 significant technical errors, many of which involved fabricated configuration options that do not exist in any Ceph branch. The post was substantially rewritten to reflect the actual D4N implementation.
