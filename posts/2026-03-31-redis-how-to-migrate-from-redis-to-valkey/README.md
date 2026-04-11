# How to Migrate from Redis to Valkey

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Valkey, Migration, Open Source, Linux Foundation

Description: Step-by-step guide to migrating from Redis to Valkey, the Linux Foundation fork, covering compatibility, data migration strategies, and client configuration.

---

## Overview

Valkey is an open-source, Linux Foundation-hosted fork of Redis that was created after Redis changed its license in March 2024. Valkey maintains full API compatibility with Redis 7.2 and adds performance improvements. Migration from Redis to Valkey is generally straightforward because they share the same wire protocol, data structures, and client libraries.

## Compatibility Overview

Valkey is wire-protocol compatible with Redis. All standard Redis commands work identically.

```bash
# Commands that work identically in Valkey
SET key value EX 3600
GET key
HSET hash field value
ZADD sorted_set 1.0 member
XADD stream * field value
PUBLISH channel message
```

Valkey also supports RESP2 and RESP3 protocols, meaning all existing Redis client libraries work without modification.

## Step 1: Audit Your Redis Setup

Before migrating, document your configuration:

```bash
# Get current Redis version
redis-cli INFO server | grep redis_version

# Check loaded modules (modules may not be available in Valkey)
redis-cli MODULE LIST

# Check memory usage
redis-cli INFO memory | grep -E "used_memory_human|maxmemory"

# Export current config
redis-cli CONFIG REWRITE
cat /etc/redis/redis.conf

# Count keys and estimate data size
redis-cli DBSIZE
redis-cli INFO keyspace
```

**Important:** If you use Redis modules (RediSearch, RedisJSON, RedisTimeSeries), these are not available natively in Valkey. Plan for this before migrating.

## Step 2: Install Valkey

```bash
# Option 1: Docker
docker pull valkey/valkey:8
docker run -d --name valkey \
  -p 6380:6379 \
  -v /data/valkey:/data \
  valkey/valkey:8 valkey-server --appendonly yes

# Option 2: From source (Ubuntu)
sudo apt-get install build-essential tcl
git clone https://github.com/valkey-io/valkey.git
cd valkey
make -j$(nproc)
sudo make install

# Option 3: Package manager (varies by distro)
# Check valkey.io for latest packages
```

```bash
# Verify Valkey is running and check version
valkey-cli -p 6380 PING
valkey-cli -p 6380 INFO server | grep valkey_version
```

## Step 3: Test Configuration Compatibility

```bash
# Compare configs - most redis.conf options are identical
diff /etc/redis/redis.conf /etc/valkey/valkey.conf

# Common config options that work the same
# maxmemory 4gb
# maxmemory-policy allkeys-lru
# appendonly yes
# appendfsync everysec
# bind 127.0.0.1
# requirepass yourpassword
# databases 16
```

## Step 4: Migrate Data

### Option A: Replication-Based Migration (Zero Downtime)

The cleanest approach uses Valkey as a replica of Redis, then performs a failover:

```bash
# 1. Start Valkey and replicate from Redis
valkey-cli -p 6380 REPLICAOF 127.0.0.1 6379

# 2. Monitor replication lag
valkey-cli -p 6380 INFO replication | grep -E "master_link_status|master_last_io_seconds_ago|master_sync_in_progress"

# Wait until connected and in_sync
# master_link_status:up
# master_last_io_seconds_ago:0

# 3. Verify data is identical
redis-cli DBSIZE
valkey-cli -p 6380 DBSIZE

# 4. Stop replication and promote Valkey as standalone
valkey-cli -p 6380 REPLICAOF NO ONE

# 5. Update application connection strings to point to Valkey port
```

**Note:** Cross-replication is compatible with Redis OSS 7.2 and earlier. Redis 7.4+ (Community Edition) uses a different replication format and is not compatible with Valkey.

### Option B: RDB Snapshot Migration

```bash
# 1. Trigger an RDB snapshot on Redis
redis-cli BGSAVE
# Wait for completion
redis-cli LASTSAVE

# 2. Copy the dump.rdb file
cp /var/lib/redis/dump.rdb /var/lib/valkey/dump.rdb

# 3. Start Valkey - it will load the RDB on startup
valkey-server /etc/valkey/valkey.conf

# 4. Verify keys loaded
valkey-cli DBSIZE
```

### Option C: DUMP/RESTORE for Selective Migration

```python
import redis

src = redis.Redis(host='localhost', port=6379)
dst = redis.Redis(host='localhost', port=6380)

def migrate_key(key: str):
    serialized = src.dump(key)
    if serialized is None:
        return

    ttl_ms = src.pttl(key)
    ttl = max(0, ttl_ms) if ttl_ms > 0 else 0

    dst.restore(key, ttl, serialized, replace=True)

# Migrate all keys (use SCAN for large datasets)
cursor = 0
migrated = 0
while True:
    cursor, keys = src.scan(cursor, count=100)
    for key in keys:
        migrate_key(key)
        migrated += 1
    if cursor == 0:
        break

print(f"Migrated {migrated} keys")
```

## Step 5: Update Client Configuration

All Redis client libraries work with Valkey unchanged - just update the host/port:

```python
# Before (Redis)
import redis
client = redis.Redis(host='redis-host', port=6379)

# After (Valkey - same library, different endpoint)
import redis
client = redis.Redis(host='valkey-host', port=6379)
```

```javascript
// Node.js - ioredis
// Before
const client = new Redis({ host: 'redis-host', port: 6379 });

// After
const client = new Redis({ host: 'valkey-host', port: 6379 });
```

## Step 6: Verify and Cutover

```bash
# Run a functional smoke test
valkey-cli -h valkey-host PING
valkey-cli -h valkey-host SET test:migration "ok" EX 60
valkey-cli -h valkey-host GET test:migration

# Check memory usage matches expectations
valkey-cli -h valkey-host INFO memory | grep used_memory_human

# Monitor for errors after cutover
valkey-cli -h valkey-host MONITOR  # real-time command stream
valkey-cli -h valkey-host SLOWLOG GET 10  # slow commands
```

## Summary

Migrating from Redis to Valkey is straightforward because Valkey maintains full wire-protocol and API compatibility with Redis 7.2. The safest migration uses replication to replicate data to Valkey with zero downtime, followed by a promotion and connection string update. All existing Redis client libraries work without code changes. The main consideration is Redis Stack modules - if you rely on RediSearch, RedisJSON, or RedisTimeSeries, verify module availability in Valkey before migrating.
