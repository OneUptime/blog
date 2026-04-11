# How to Monitor Redis with the INFO Command (All Sections)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Monitoring, INFO Command, Operation, Observability

Description: A comprehensive guide to the Redis INFO command sections - server, clients, memory, stats, replication, CPU, and keyspace - with key metrics to watch.

---

## The Redis INFO Command

The `INFO` command returns a human-readable block of statistics about the Redis server. It is the single most useful command for understanding the health and performance of a Redis instance without installing any additional tools.

```bash
# Get all sections
redis-cli INFO all

# Get a specific section
redis-cli INFO memory
redis-cli INFO replication
redis-cli INFO stats
```

## Section: server

Basic server information - version, uptime, and configuration:
```bash
redis-cli INFO server
```

```text
redis_version:7.2.4
redis_mode:standalone
os:Linux 5.15.0-91-generic x86_64
arch_bits:64
multiplexing_api:epoll
uptime_in_seconds:2592000
uptime_in_days:30
hz:10
configured_hz:10
tcp_port:6379
config_file:/etc/redis/redis.conf
```

Key metrics:
- `uptime_in_days` - unexpected restarts indicate crashes
- `hz` - frequency of background tasks (10-100 range)
- `redis_mode` - standalone, cluster, or sentinel

## Section: clients

Active connection information:
```bash
redis-cli INFO clients
```

```text
connected_clients:142
cluster_connections:0
maxclients:10000
client_recent_max_input_buffer:20480
client_recent_max_output_buffer:0
blocked_clients:0
tracking_clients:12
clients_in_timeout_table:0
```

Key metrics:
- `connected_clients` - monitor for unusual spikes or near `maxclients`
- `blocked_clients` - clients waiting on BLPOP/BRPOP/WAIT (normal if non-zero but should not grow)
- `tracking_clients` - clients using CLIENT TRACKING

## Section: memory

Memory usage breakdown:
```bash
redis-cli INFO memory
```

```text
used_memory:5368709120
used_memory_human:5.00G
used_memory_rss:5872025600
used_memory_rss_human:5.47G
used_memory_peak:5905580032
used_memory_peak_human:5.50G
used_memory_peak_perc:90.91%
used_memory_overhead:2097152
used_memory_startup:894048
used_memory_dataset:5366612096
mem_fragmentation_ratio:1.09
mem_fragmentation_bytes:503316480
maxmemory:6442450944
maxmemory_human:6.00G
maxmemory_policy:allkeys-lru
mem_allocator:libc
```

Key metrics:
- `used_memory_rss` / `used_memory` = fragmentation ratio (cross-check `mem_fragmentation_ratio`)
- `used_memory_peak_perc` - current usage as a percentage of historic peak (if near 100%, you are at your highest recorded usage)
- `maxmemory_policy` - what happens when memory fills up

## Section: stats

Operational counters:
```bash
redis-cli INFO stats
```

```text
total_connections_received:1842931
total_commands_processed:48291847
instantaneous_ops_per_sec:12543
total_net_input_bytes:12884901888
total_net_output_bytes:8589934592
instantaneous_input_kbps:1024.00
instantaneous_output_kbps:512.00
rejected_connections:0
sync_full:2
sync_partial_ok:8
sync_partial_err:0
expired_keys:182943
evicted_keys:0
keyspace_hits:38291847
keyspace_misses:4982731
pubsub_channels:4
pubsub_patterns:0
latest_fork_usec:1423
migrate_cached_sockets:0
slave_expires_tracked_keys:0
active_defrag_running:0
tracking_keys:12543
```

Key metrics:
- `keyspace_hits` / (`keyspace_hits` + `keyspace_misses`) = cache hit rate
- `evicted_keys` - keys removed due to maxmemory (should align with your policy intent)
- `expired_keys` - normal background expiration (should be steady)
- `rejected_connections` - means `maxclients` was hit (critical alert)
- `instantaneous_ops_per_sec` - current throughput

## Section: replication

Primary/replica state:
```bash
redis-cli INFO replication
```

```text
role:master
connected_slaves:2
slave0:ip=10.0.1.5,port=6380,state=online,offset=9283456,lag=0
slave1:ip=10.0.1.6,port=6380,state=online,offset=9283456,lag=1
master_failover_state:no-failover
master_replid:8f57ec5b9d1c4b9a8e7f3d2c1b0a9e8d7c6b5a4
master_repl_offset:9283456
repl_backlog_active:1
repl_backlog_size:1048576
```

Key metrics:
- `lag` for each replica - should be 0 or 1; higher values indicate replication lag
- `master_repl_offset` vs replica offsets - large gaps mean replicas are behind

## Section: cpu

CPU time consumed:
```bash
redis-cli INFO cpu
```

```text
used_cpu_sys:142.345678
used_cpu_user:89.234567
used_cpu_sys_children:0.012345
used_cpu_user_children:0.034567
```

Monitor the rate of change over time (not absolute values) to detect CPU spikes.

## Section: keyspace

Database key counts and TTL statistics:
```bash
redis-cli INFO keyspace
```

```text
db0:keys=2847321,expires=1923847,avg_ttl=86234
db1:keys=12431,expires=0,avg_ttl=0
```

Key metrics:
- `keys` - total number of keys in each database
- `expires` - keys with TTL set
- `avg_ttl` - average time-to-live in milliseconds

## Python Monitoring Script

```python
import redis
import json
from datetime import datetime, timezone

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def collect_metrics():
    info = r.info('all')
    metrics = {
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'uptime_days': info['uptime_in_days'],
        'connected_clients': info['connected_clients'],
        'used_memory_mb': info['used_memory'] / 1024 / 1024,
        'mem_fragmentation_ratio': info['mem_fragmentation_ratio'],
        'ops_per_sec': info['instantaneous_ops_per_sec'],
        'hit_rate': info['keyspace_hits'] / max(1, info['keyspace_hits'] + info['keyspace_misses']),
        'evicted_keys': info['evicted_keys'],
        'rejected_connections': info['rejected_connections'],
        'total_keys': sum(
            v['keys'] for k, v in info.items()
            if k.startswith('db') and isinstance(v, dict)
        )
    }
    return metrics

metrics = collect_metrics()
print(json.dumps(metrics, indent=2))
```

## Key Alerts to Set Up

| Metric | Warning | Critical |
|--------|---------|----------|
| `mem_fragmentation_ratio` | > 1.5 | > 2.0 |
| `connected_clients` | > 80% of maxclients | > 95% |
| Cache hit rate | < 90% | < 75% |
| `evicted_keys` rate | > 100/s | > 1000/s |
| `rejected_connections` | > 0 | > 0 |
| Replica lag | > 10s | > 60s |

## Summary

The Redis INFO command provides a complete view of server health across seven key sections. Focus on memory fragmentation ratio, cache hit rate, eviction rate, and replica lag as your primary health indicators. Script periodic INFO collection to build a metrics history and set up alerts when key thresholds are crossed.
