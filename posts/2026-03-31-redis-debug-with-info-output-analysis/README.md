# How to Debug Redis with INFO Output Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, INFO, Monitoring, Troubleshooting

Description: Analyze Redis INFO output sections to diagnose performance problems, memory issues, replication lag, and connection saturation in production environments.

---

`INFO` is Redis's built-in diagnostics command. It returns over 100 metrics across multiple sections. Knowing which fields to look at - and what values indicate problems - lets you diagnose most production issues without external monitoring tools.

## INFO Sections Overview

```bash
redis-cli INFO           # All sections
redis-cli INFO server    # Version, OS, uptime
redis-cli INFO clients   # Connection counts
redis-cli INFO memory    # Memory usage breakdown
redis-cli INFO stats     # Command and connection statistics
redis-cli INFO replication  # Primary/replica status
redis-cli INFO persistence  # RDB/AOF status
redis-cli INFO keyspace  # Key counts per database
redis-cli INFO latencystats  # Latency histogram
```

## Diagnosing High Memory Usage

```bash
redis-cli INFO memory | grep -E "used_memory_human|used_memory_peak_human|mem_fragmentation_ratio|maxmemory_human"
```

Key fields:

```text
used_memory_human:2.45G       # Current allocator memory usage
used_memory_peak_human:3.10G  # Peak since start
mem_fragmentation_ratio:1.85  # > 1.5 = high fragmentation
maxmemory_human:4.00G         # Configured limit
```

Fragmentation ratio above 1.5 means Redis is using significantly more OS memory than actual data requires. Run `MEMORY PURGE` to return fragmented memory to the OS:

```bash
redis-cli MEMORY PURGE
```

## Diagnosing Connection Issues

```bash
redis-cli INFO clients | grep -E "connected_clients|blocked_clients|maxclients"
```

```text
connected_clients:4821
blocked_clients:12         # Clients waiting on BLPOP/BRPOP/etc
maxclients:10000
```

If `connected_clients` is near `maxclients`, you are close to connection exhaustion. Check which clients are connected:

```bash
redis-cli CLIENT LIST | awk -F'[= ]' '{print $4}' | sort | uniq -c | sort -rn | head -10
```

## Diagnosing Cache Effectiveness

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

```text
keyspace_hits:9823410
keyspace_misses:212891
```

Hit rate calculation:

```bash
redis-cli INFO stats | awk -F: '/keyspace_hits/{hits=$2} /keyspace_misses/{misses=$2} END {printf "Hit rate: %.2f%%\n", hits/(hits+misses)*100}'
```

If hit rate is below 90%, check TTL policies and cache key correctness.

## Diagnosing Replication Lag

```bash
redis-cli INFO replication | grep -E "role|connected_slaves|master_repl_offset|slave_repl_offset"
```

On a replica:

```text
role:slave
master_link_status:up
master_last_io_seconds_ago:1
master_sync_in_progress:0
slave_repl_offset:142857192
master_repl_offset:142857200
```

The difference between `master_repl_offset` and `slave_repl_offset` is the replication lag in bytes. Alert if it exceeds 1 MB.

## Diagnosing Slow Persistence

```bash
redis-cli INFO persistence | grep -E "rdb_last_bgsave_status|rdb_last_bgsave_time_sec|aof_rewrite_in_progress"
```

```text
rdb_last_bgsave_status:ok
rdb_last_bgsave_time_sec:43       # 43 seconds for last BGSAVE
rdb_current_bgsave_time_sec:-1
aof_rewrite_in_progress:0
```

If `rdb_last_bgsave_time_sec` is large, the dataset is big or disk is slow. Consider switching to AOF-only or reducing save frequency.

## Diagnosing Evictions

```bash
redis-cli INFO stats | grep -E "evicted_keys|expired_keys|rejected_connections"
```

```text
evicted_keys:98312       # Keys evicted due to maxmemory
expired_keys:1204920     # Keys expired by TTL
rejected_connections:0   # Should always be 0
```

Rising `evicted_keys` means you are hitting the memory limit. Increase `maxmemory` or optimize key storage.

## Automated INFO Snapshot Script

```bash
#!/bin/bash
timestamp=$(date +%Y%m%d-%H%M%S)
redis-cli INFO all > /var/log/redis/info-snapshot-$timestamp.txt
echo "INFO snapshot saved"
```

Run every 5 minutes via cron:

```text
*/5 * * * * /usr/local/bin/redis-info-snapshot.sh
```

## Summary

Redis INFO output is your first diagnostic tool for any production issue. Memory fragmentation, connection counts, keyspace hit rates, replication offsets, and eviction counts are the key metrics to monitor. Combine periodic INFO snapshots with real-time alerting on critical fields to catch issues before they become outages.
