# How to Migrate from Redis 7 to Redis 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Migration, Upgrade, Redis 8, DevOps

Description: Step-by-step guide to upgrading from Redis 7 to Redis 8, covering new features, breaking changes, replica promotion, and post-migration validation.

---

Redis 8 is a significant release that reintegrates previously separate modules (RedisJSON, RediSearch, RedisTimeSeries, RedisBloom) directly into the Redis core, alongside performance improvements and new commands. This guide walks through a safe migration using replication.

## Key Changes in Redis 8

- Built-in modules: JSON, Search, TimeSeries, and Bloom are now part of core Redis
- `HGETDEL` and `HGETEX` commands for atomic hash operations
- Vector similarity search built-in
- Improved cluster management commands
- Licensing change: Redis 8 is tri-licensed under RSALv2, SSPLv1, and AGPLv3

## Pre-Migration Checklist

```bash
# Confirm current version
redis-cli INFO server | grep redis_version

# List loaded modules on Redis 7
redis-cli MODULE LIST

# Check if you use external module commands that are now built-in
# (JSON.*, FT.*, TS.*, BF.*)
redis-cli INFO commandstats | grep -E "json|ft\.|ts\.|bf\."

# Backup current data
redis-cli BGSAVE
redis-cli LASTSAVE
```

## Migration Using Replica Promotion

**Step 1: Install Redis 8 on a new host**

```bash
# Download and build from source, or use package manager
wget https://github.com/redis/redis/archive/8.0.0.tar.gz
tar xzf 8.0.0.tar.gz
cd redis-8.0.0
make -j$(nproc)
sudo make install
```

**Step 2: Configure Redis 8 as a replica of Redis 7**

```bash
# redis8.conf
port 6380
replicaof <redis7-host> 6379
requirepass "your-password"
masterauth "your-password"
logfile /var/log/redis/redis8.log
dir /var/lib/redis8
```

**Step 3: Start Redis 8 and verify replication**

```bash
redis-server /etc/redis/redis8.conf &

# Check replication status
redis-cli -p 6380 INFO replication
# Look for: master_link_status:up, master_sync_in_progress:0
```

**Step 4: Remove module LOADMODULE directives**

If you loaded RedisJSON or RediSearch as external modules in Redis 7, remove those lines from your Redis 8 config since they are now built-in:

```bash
# Remove from redis8.conf - no longer needed in Redis 8:
# loadmodule /usr/lib/redis/modules/rejson.so
# loadmodule /usr/lib/redis/modules/redisearch.so
# loadmodule /usr/lib/redis/modules/redistimeseries.so
```

**Step 5: Wait for full sync, then promote**

```bash
# Confirm replica is fully caught up
redis-cli -p 6380 INFO replication | grep master_repl_offset

# Compare with primary offset
redis-cli -p 6379 INFO replication | grep master_repl_offset

# When offsets match, promote
redis-cli -p 6380 REPLICAOF NO ONE
```

## Validate the Migration

```bash
# Compare key counts
redis-cli -p 6379 DBSIZE
redis-cli -p 6380 DBSIZE

# Test module commands still work (now built-in)
redis-cli -p 6380 JSON.SET test:1 $ '{"status":"ok"}'
redis-cli -p 6380 JSON.GET test:1

# Run a search index test
redis-cli -p 6380 FT._LIST

# Check memory
redis-cli -p 6380 INFO memory | grep used_memory_human
```

## New Commands to Explore

```bash
# Atomic hash field get-and-delete
redis-cli -p 6380 HSET myhash field1 value1 field2 value2
redis-cli -p 6380 HGETDEL myhash FIELDS 1 field1

# Atomic hash field get-and-set-expiry
redis-cli -p 6380 HGETEX myhash EX 60 FIELDS 1 field2
```

## Application Updates

Update your Redis client connection string and remove any module initialization code:

```python
import redis

# No need to load modules separately in Redis 8
r = redis.Redis(host="redis8-host", port=6379, password="your-password")

# These commands now work natively
r.json().set("doc:1", "$", {"name": "Alice"})
result = r.json().get("doc:1")
```

## Summary

Migrating from Redis 7 to Redis 8 follows the same replica promotion pattern as previous upgrades. The biggest change is that external modules are now built-in, simplifying your configuration. Test all module-based commands after the upgrade and keep Redis 7 available as a fallback for at least 48 hours post-migration.
