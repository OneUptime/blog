# Why You Should Not Disable Persistence Without Understanding Risks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, RDB, AOF, Data Loss, Best Practice

Description: Understand the real risks of disabling Redis persistence and learn how to make an informed decision based on your workload and data loss tolerance.

---

## What Is Redis Persistence?

Redis is an in-memory store, but it can persist data to disk in two ways:

- **RDB (Redis Database)** - Point-in-time snapshots saved at intervals
- **AOF (Append Only File)** - A log of every write command

By default, Redis enables RDB snapshotting. Many developers disable persistence to reduce I/O, save disk space, or improve write throughput - without fully considering the consequences.

## How to Disable Persistence (and What It Does)

```bash
# Disable RDB snapshots
redis-cli CONFIG SET save ""

# Disable AOF
redis-cli CONFIG SET appendonly no
```

Or in redis.conf:

```text
save ""
appendonly no
```

With both disabled, Redis becomes a pure in-memory cache with no recovery mechanism.

## Risk 1: Complete Data Loss on Restart

The most obvious risk - when Redis restarts (crash, OOM kill, server reboot), all data is gone:

```bash
# 10 million keys in memory
redis-cli DBSIZE
# (integer) 10000000

# Redis crashes or is restarted
sudo systemctl restart redis

# All data is gone
redis-cli DBSIZE
# (integer) 0
```

If your application expects Redis data to survive restarts - sessions, queues, rate limit counters - disabling persistence means a restart causes a silent data loss event.

## Risk 2: Cache Stampede After Restart

When Redis loses all data and comes back empty, every cache miss hits your database simultaneously. This "thundering herd" can overwhelm your primary database:

```text
Before restart: 95% cache hit rate
After restart:  0% cache hit rate -> 100x database load spike
```

## Risk 3: Misleading Sense of Speed

The performance gain from disabling persistence is often smaller than expected:

```bash
# RDB is async - it forks a child process
# AOF fsync=everysec only syncs once per second
# Neither significantly impacts typical write latency

# Benchmark with and without AOF
redis-benchmark -t set -n 100000 -q
# With AOF everysec: ~90,000 ops/sec
# Without persistence: ~95,000 ops/sec (marginal difference)
```

## When Disabling Persistence Is Actually Fine

Disabling persistence is acceptable in these specific scenarios:

1. **Pure cache with a warm-up strategy** - Your app can rebuild the cache from the primary database after a restart
2. **Ephemeral rate limiters** - Losing counters on restart is acceptable, limits reset naturally
3. **Test and development environments** - Where data permanence is not required
4. **Redis Cluster with replication** - If replicas can serve data during primary failures (though replicas also lose in-memory data on crash)

```bash
# For a pure cache, configure Redis accordingly
maxmemory 4gb
maxmemory-policy allkeys-lru
save ""
appendonly no
```

## Safer Alternatives to Full Disable

### Use RDB-Only with Longer Intervals

```text
# Only snapshot every 30 minutes if 10000+ keys changed
save 1800 10000
appendonly no
```

### Use AOF with fsync=everysec (Default)

```text
appendonly yes
appendfsync everysec  # At most 1 second of data loss
no-appendfsync-on-rewrite yes  # Reduces I/O during compaction
```

### Use RDB + AOF Hybrid

```text
aof-use-rdb-preamble yes  # Fast load + AOF durability
appendonly yes
appendfsync everysec
```

## Monitoring Data Loss Exposure

```bash
# Check last successful RDB save (returns UNIX timestamp)
redis-cli LASTSAVE

# Check AOF status
redis-cli INFO persistence | grep aof

# Check time since last save and unsaved changes
redis-cli INFO persistence | grep rdb_last_save_time
redis-cli INFO persistence | grep rdb_changes_since_last_save
```

## Making the Right Decision

```text
Use case                        Recommended persistence
-------                         -----------------------
Session store                   AOF everysec or RDB
Queue / task list               AOF always or AOF everysec
Rate limiter / counter          RDB or no persistence
Pure cache (rebuildable)        No persistence
Financial / critical data       AOF always
```

## Summary

Disabling Redis persistence trades data safety for marginal performance gains. Before disabling it, evaluate whether your application can tolerate complete data loss on restart and whether a cache stampede would impact your primary database. For most production workloads, AOF with fsync=everysec provides an excellent balance of durability and performance.
