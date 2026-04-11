# How to Migrate from Valkey to Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Valkey, Migration, Open Source, Database

Description: Step-by-step guide to migrating from Valkey back to Redis using RDB file transfer or live replication, including compatibility checks and validation.

---

Valkey is a community-driven fork of Redis created after the Redis license change in 2024. Because Valkey is protocol-compatible with Redis, migrating back is straightforward - but there are version and feature differences to check before you cut over.

## Compatibility Overview

Valkey and Redis share the same wire protocol and RDB format for core data types. However:

- Valkey adds its own extensions not present in Redis
- If you use any Valkey-specific commands, they need replacements
- RDB compatibility depends on version alignment

```bash
# Check what version of Valkey you are running
valkey-cli INFO server | grep redis_version

# List any custom commands or modules loaded
valkey-cli MODULE LIST
valkey-cli COMMAND COUNT
```

## Option 1: RDB File Transfer (for smaller datasets)

**Step 1: Create an RDB snapshot on Valkey**

```bash
# Trigger a background save
valkey-cli BGSAVE
valkey-cli LASTSAVE  # Note the timestamp

# Wait until save completes
watch -n1 'valkey-cli LASTSAVE'

# Find the RDB file location
valkey-cli CONFIG GET dir
valkey-cli CONFIG GET dbfilename
# Default: /var/lib/valkey/dump.rdb
```

**Step 2: Copy the RDB file to the Redis host**

```bash
# Stop writes to Valkey first (maintenance window)
scp /var/lib/valkey/dump.rdb redis-host:/var/lib/redis/dump.rdb

# Set correct ownership
ssh redis-host "chown redis:redis /var/lib/redis/dump.rdb"
```

**Step 3: Start Redis with the imported RDB**

```bash
# Ensure Redis is not running
sudo systemctl stop redis

# redis.conf should point to the directory with dump.rdb
sudo systemctl start redis

# Verify data loaded
redis-cli DBSIZE
redis-cli INFO persistence | grep rdb_last_bgsave_status
```

## Option 2: Live Replication (zero downtime)

Since Valkey and Redis share the same replication protocol, you can configure Redis as a replica of Valkey for near-zero downtime migration.

**Step 1: Configure Redis as a replica of Valkey**

```bash
# In redis.conf
replicaof <valkey-host> 6379
masterauth "valkey-password"
requirepass "redis-password"
```

**Step 2: Start Redis and verify sync**

```bash
redis-cli INFO replication
# Confirm: master_link_status:up, master_sync_in_progress:0
```

**Step 3: Wait for full synchronization**

```bash
# Compare offsets
valkey-cli INFO replication | grep master_repl_offset
redis-cli INFO replication | grep master_repl_offset
```

**Step 4: Promote Redis and redirect traffic**

```bash
# Stop writes to Valkey
# Promote Redis to primary
redis-cli REPLICAOF NO ONE

# Update application connection strings to point to Redis
```

## Check for Valkey-Specific Commands

```bash
# List commands available in Valkey but not in equivalent Redis version
valkey-cli COMMAND DOCS | grep -i valkey

# Commands to verify exist in your target Redis version:
# LPOS (available in Redis 6.0.6+)
# OBJECT FREQ (Redis 4.0+)
# WAITAOF (available in Redis 7.2+)
```

## Validate After Migration

```bash
# Compare key counts across databases
valkey-cli DBSIZE
redis-cli DBSIZE

# Spot-check critical keys
redis-cli GET session:user:12345
redis-cli LLEN job:queue
redis-cli HGETALL config:app

# Check memory
redis-cli INFO memory | grep used_memory_human
```

## Update Client Configuration

```python
import redis

# Update host/port to Redis
r = redis.Redis(
    host="redis-host",
    port=6379,
    password="redis-password",
    decode_responses=True
)

# Test basic operations
r.set("migration:test", "ok")
assert r.get("migration:test") == "ok"
print("Migration validated")
```

## Summary

Migrating from Valkey to Redis is simple due to protocol and RDB format compatibility. Use live replication for production systems requiring minimal downtime. Check for any Valkey-specific commands your application uses and confirm they are available in your target Redis version before cutting over traffic.
