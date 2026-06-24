# How to Configure D4N in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, RGW, D4N, Caching

Description: Configure D4N (Distributed Data Delivery Network) in Ceph RGW to enable distributed caching of object data using Redis for improved read performance.

---

## What Is D4N

D4N (Distributed Data Delivery Network) is an experimental caching layer for the RADOS Gateway (RGW). It was introduced with minimal support in Ceph Squid (19.x) and significantly expanded in Ceph Tentacle (20.x). D4N uses Redis as a distributed directory for cache coordination and supports local SSD-backed data caching by default, with an optional Redis-backed data cache.

D4N provides:
- Distributed cache coordination with Redis as the directory layer
- Local SSD-backed data caching (default) or Redis-backed data caching
- Cache invalidation on object writes
- LFUDA (Least Frequently Used with Dynamic Aging) eviction policy
- Write caching support (optional)

**Note:** D4N is currently marked as experimental in the Ceph source code.

## Architecture

```text
Client
  |
  v
RGW Instance(s) with D4N Filter
  |
  +-- D4N Directory (Redis) - indexes cached data
  |
  +-- L1 Data Cache (local SSD by default)
  |     Hit: Return cached data
  |     Miss: Fetch from Ceph, store in cache
  |
  v
Ceph RADOS Backend
```

D4N operates as a filter layer in the RGW Storage Abstraction Layer (SAL). Redis serves as the global directory to index data stored in the distributed cache, while object data is cached on local SSD by default.

## Prerequisites

- Ceph Tentacle (20.x) or later (Squid 19.x has limited D4N support)
- Redis 6.0 or later for the D4N directory
- Local SSD storage for the data cache (recommended)
- Network connectivity between RGW instances and the Redis node

## Step 1 - Deploy Redis

Set up a Redis instance for the D4N directory:

```bash
# Single Redis instance for the D4N directory
docker run -d --name redis-d4n \
  -p 6379:6379 \
  redis:7 redis-server \
  --maxmemory 1gb \
  --maxmemory-policy allkeys-lru \
  --save ""

# Verify Redis is accessible
redis-cli -h 127.0.0.1 ping
# PONG
```

**Note:** The current D4N implementation supports one Redis node.

## Step 2 - Enable D4N in RGW

D4N is enabled by setting the `rgw_filter` option to `d4n`:

```bash
# Enable D4N filter
ceph config set client.rgw rgw_filter d4n

# Set the Redis address for the D4N directory (host:port format)
ceph config set client.rgw rgw_d4n_address "127.0.0.1:6379"
```

## Step 3 - Configure the Local SSD Data Cache

By default, D4N caches object data on local SSD storage:

```bash
# Set the local SSD cache path
ceph config set client.rgw rgw_d4n_l1_datacache_persistent_path "/tmp/rgw_d4n_datacache/"

# Set the maximum cache size (default is 1 GiB)
ceph config set client.rgw rgw_d4n_l1_datacache_size 10737418240  # 10 GiB

# Optionally disable cache eviction on daemon start
ceph config set client.rgw rgw_d4n_l1_evict_cache_on_start false
```

## Step 4 - Configure Write Caching (Optional)

D4N supports optional write caching:

```bash
# Enable write caching
ceph config set client.rgw d4n_writecache_enabled true

# Set cache cleaning interval (seconds, default 1000)
ceph config set client.rgw rgw_d4n_cache_cleaning_interval 1000
```

## Step 5 - Tune I/O Settings (Optional)

D4N uses libaio for cache I/O operations:

```bash
# Max libaio worker threads (default 20)
ceph config set client.rgw rgw_d4n_libaio_aio_threads 20

# Max simultaneous I/O requests (default 64)
ceph config set client.rgw rgw_d4n_libaio_aio_num 64
```

## Step 6 - Restart RGW Instances

After configuration changes:

```bash
# Using cephadm
ceph orch restart rgw.<service-name>

# Using systemctl
systemctl restart ceph-radosgw@rgw.myrgw
```

## Step 7 - Verify D4N is Active

Check that D4N is loading and connecting to Redis:

```bash
# Check RGW logs for D4N startup messages
journalctl -u ceph-radosgw@rgw.myrgw | grep -i d4n

# Or check via the admin socket
ceph daemon client.rgw.myrgw perf dump | grep d4n
```

## Monitoring Cache Performance

```bash
# Check cache hit/miss rates
ceph daemon client.rgw.myrgw perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
d4n = data.get('d4n', {})
for k, v in d4n.items():
    print(f'{k}: {v}')
"

# Monitor Redis directory usage
redis-cli -h 127.0.0.1 info stats | grep -E "hits|misses|evictions"
redis-cli -h 127.0.0.1 info memory | grep used_memory_human
```

## Cache Invalidation

D4N automatically invalidates cached objects when they are written or deleted through RGW. This ensures cache consistency without manual intervention:

```text
Client writes object X
  -> RGW writes to Ceph backend
  -> RGW invalidates D4N cache entry for object X
  -> Next read fetches fresh data from Ceph, re-caches
```

## Configuration Reference

```text
Parameter                              | Default                    | Description
rgw_filter                             | none                       | Set to "d4n" to enable D4N
rgw_d4n_address                        | 127.0.0.1:6379             | Redis address for D4N directory (host:port)
rgw_d4n_l1_datacache_persistent_path   | /tmp/rgw_d4n_datacache/    | Local SSD cache path
rgw_d4n_l1_datacache_size              | 1 GiB                      | Max local cache size
rgw_d4n_l1_evict_cache_on_start        | true                       | Clear cache on daemon start
rgw_d4n_l1_fadvise                     | 4                          | posix_fadvise flag
rgw_d4n_libaio_aio_threads             | 20                         | Max libaio worker threads
rgw_d4n_libaio_aio_num                 | 64                         | Max simultaneous I/O requests
d4n_writecache_enabled                 | false                      | Enable write cache
rgw_d4n_cache_cleaning_interval        | 1000                       | Write cache cleaning interval (seconds)
```

## Summary

D4N (Distributed Data Delivery Network) adds a distributed cache layer to Ceph RGW, improving read performance for frequently accessed objects. Enable it by setting `rgw_filter` to `d4n` and configuring `rgw_d4n_address` with the Redis host and port for the directory service. Object data is cached on local SSD by default. D4N automatically handles cache invalidation on writes. Monitor cache effectiveness via RGW perf dump metrics and Redis INFO stats. Note that D4N is currently experimental and requires Ceph Tentacle (20.x) or later for full functionality.
