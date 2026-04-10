# Why You Should Not Use Redis as Primary Database Without Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, Database

Description: Learn the risks of using Redis as your primary database without configuring persistence, and how to set up AOF and RDB to protect critical data.

---

Redis is frequently described as an "in-memory database," and teams sometimes deploy it as their sole data store. This works fine in development but becomes a critical risk in production when persistence is not properly configured - a restart or crash wipes all your data.

## The Risk: Data Loss on Restart

By default, Redis has persistence disabled in many configurations. A simple restart causes total data loss:

```bash
# Redis starts with no persistence
redis-server --save "" --appendonly no

# After storing data
SET user:1 "Alice"

# Restart Redis (crash, OOM killer, deployment restart)
sudo systemctl restart redis

# Data is gone
GET user:1
# (nil)
```

## Redis Persistence Options

Redis offers two persistence mechanisms. Use both for critical data:

**RDB (Snapshot):** Saves a point-in-time snapshot to disk periodically:

```bash
# redis.conf
# Save after 900 seconds if at least 1 key changed
save 900 1
# Save after 300 seconds if at least 10 keys changed
save 300 10
# Save after 60 seconds if at least 10000 keys changed
save 60 10000

dbfilename dump.rdb
dir /var/lib/redis
```

**AOF (Append Only File):** Logs every write command and replays them on restart for durability:

```bash
# redis.conf
appendonly yes
appendfilename "appendonly.aof"

# fsync strategy (choose one):
# appendfsync always    # safest, slowest (fsync every write)
appendfsync everysec   # recommended (max 1 second of data loss)
# appendfsync no        # fastest, OS decides when to flush
```

## Python: Verifying Persistence Is Active

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def check_persistence() -> dict:
    info = r.info("persistence")
    return {
        "rdb_enabled": info.get("rdb_last_bgsave_status") != "err",
        "aof_enabled": info.get("aof_enabled") == 1,
        "rdb_last_save": info.get("rdb_last_save_time"),
        "aof_rewrite_in_progress": info.get("aof_rewrite_in_progress") == 1,
        "aof_last_rewrite_status": info.get("aof_last_bgrewrite_status")
    }

status = check_persistence()
print(status)
```

## Triggering a Manual Backup

```python
def trigger_backup():
    # Trigger a background RDB save
    r.bgsave()
    print("Background save started")

def trigger_aof_rewrite():
    # Compact the AOF file in the background
    r.bgrewriteaof()
    print("AOF rewrite started")
```

## When Redis as Primary Database is Acceptable

Redis is a valid primary database when:

```text
- Data is fully reconstructible (e.g., computed caches, derived values)
- Loss is acceptable (e.g., rate limit counters, ephemeral sessions)
- You configure both RDB and AOF with everysec fsync
- You have Redis replication for high availability
- Data sets fit in memory with headroom for growth
```

## Redis Is Not a Replacement for These

```text
Do NOT replace with Redis alone:
- Relational data requiring ACID transactions across multiple keys
- Data larger than available RAM + swap
- Time-series data requiring range queries on fields
- Full-text search workloads
- Long-term archival (use object storage + Redis as hot tier)
```

## Minimum Production Config

```bash
# redis.conf for production Redis as primary store
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
maxmemory 4gb
maxmemory-policy noeviction
```

## Summary

Using Redis as a primary database without persistence is a data loss waiting to happen. Always enable AOF with everysec fsync for minimal data loss exposure, and RDB snapshots for fast restarts. Pair this with at least one replica for high availability. Only then is Redis appropriate as a primary store for non-relational, memory-sized datasets.
