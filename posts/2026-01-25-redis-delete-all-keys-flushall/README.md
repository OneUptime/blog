# How to Delete All Keys in Redis (FLUSHALL/FLUSHDB)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Database Management, DevOps, Administration, Data Cleanup

Description: Learn how to safely delete all keys in Redis using FLUSHALL and FLUSHDB commands, understand their differences, and explore safer alternatives for production environments.

---

Deleting all keys in Redis is a common need during development, testing, or when resetting an application's state. Redis provides two commands for this: FLUSHDB clears the current database, while FLUSHALL clears all databases. This guide covers how to use these commands safely and explores alternatives for production use.

## FLUSHDB vs FLUSHALL

The two flush commands differ in scope:

| Command | Scope | Use Case |
|---------|-------|----------|
| FLUSHDB | Current database only | Clear test data while preserving other DBs |
| FLUSHALL | All 16 databases | Complete reset of Redis instance |

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

# Check current database
print(f"Current DB keys: {r.dbsize()}")

# FLUSHDB clears only the current database (db=0)
r.flushdb()
print(f"After FLUSHDB: {r.dbsize()} keys")

# Switch to db=1 and add data
r1 = redis.Redis(host='localhost', port=6379, db=1)
r1.set('key', 'value')

# Back to db=0, FLUSHDB does not affect db=1
r.flushdb()
print(f"DB 1 still has: {r1.dbsize()} keys")

# FLUSHALL clears ALL databases
r.flushall()
print(f"DB 1 after FLUSHALL: {r1.dbsize()} keys")  # 0
```

## Synchronous vs Asynchronous Flush

By default, flush commands block Redis while deleting keys. For large datasets, use the ASYNC option to delete in the background:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, db=0)

# Add some test data
for i in range(100000):
    r.set(f'key:{i}', f'value:{i}')

print(f"Keys before flush: {r.dbsize()}")

# Synchronous flush - blocks until complete
start = time.time()
r.flushdb()  # Blocks
print(f"Sync flush took: {time.time() - start:.3f}s")

# Recreate test data
for i in range(100000):
    r.set(f'key:{i}', f'value:{i}')

# Asynchronous flush - returns immediately
# Keys are deleted in background
start = time.time()
r.flushdb(asynchronous=True)
print(f"Async flush returned in: {time.time() - start:.3f}s")

# Keys deleted in background, may still see some
time.sleep(0.1)
print(f"Keys after async flush: {r.dbsize()}")
```

## Using Redis CLI

From the command line:

```bash
# Connect and flush current database
redis-cli FLUSHDB

# Flush all databases
redis-cli FLUSHALL

# Async flush (Redis 4.0+)
redis-cli FLUSHDB ASYNC
redis-cli FLUSHALL ASYNC

# Flush specific database
redis-cli -n 1 FLUSHDB  # Flushes database 1

# Flush with authentication
redis-cli -a your_password FLUSHALL

# Flush remote server
redis-cli -h redis.example.com -p 6379 FLUSHALL
```

## Safety Precautions

FLUSHALL can be catastrophic in production. Here are safety measures:

```python
import redis
import os

def safe_flushdb(host, port, db, require_confirmation=True):
    """
    Safely flush a database with confirmation and environment checks.
    """
    r = redis.Redis(host=host, port=port, db=db)

    # Check environment
    env = os.getenv('ENVIRONMENT', 'development')
    if env == 'production' and require_confirmation:
        key_count = r.dbsize()
        print(f"WARNING: About to delete {key_count} keys in PRODUCTION")
        confirm = input("Type 'DELETE' to confirm: ")
        if confirm != 'DELETE':
            print("Aborted")
            return False

    # Get key count before flush
    before = r.dbsize()

    # Perform flush
    r.flushdb()

    print(f"Deleted {before} keys from database {db}")
    return True

# Disable FLUSHALL in production via Redis config
# rename-command FLUSHALL ""
# rename-command FLUSHDB ""
```

## Disabling Flush Commands in Production

Rename or disable dangerous commands in redis.conf:

```bash
# redis.conf

# Completely disable FLUSHALL and FLUSHDB
rename-command FLUSHALL ""
rename-command FLUSHDB ""

# Or rename to something hard to guess
rename-command FLUSHALL "FLUSH_PRODUCTION_9x7z2m"
rename-command FLUSHDB "FLUSHDB_PRODUCTION_8k4n1p"
```

Verify commands are disabled:

```python
import redis
from redis.exceptions import ResponseError

r = redis.Redis(host='localhost', port=6379, db=0)

try:
    r.flushall()
except ResponseError as e:
    print(f"FLUSHALL disabled: {e}")
    # Use the renamed command if needed
    # r.execute_command('FLUSH_PRODUCTION_9x7z2m')
```

## Selective Deletion with SCAN

Instead of flushing everything, delete keys matching a pattern:

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def delete_by_pattern(pattern, batch_size=1000):
    """
    Delete keys matching a pattern without blocking.
    Uses SCAN to iterate without blocking the server.
    """
    cursor = 0
    deleted = 0

    while True:
        # SCAN is non-blocking, unlike KEYS
        cursor, keys = r.scan(cursor, match=pattern, count=batch_size)

        if keys:
            # Delete in batches
            r.delete(*keys)
            deleted += len(keys)
            print(f"Deleted {deleted} keys...")

        if cursor == 0:
            break

    print(f"Total deleted: {deleted} keys")
    return deleted

# Delete all cache keys
delete_by_pattern('cache:*')

# Delete all session keys
delete_by_pattern('session:*')

# Delete keys from specific feature
delete_by_pattern('feature_x:*')
```

## Deleting Keys with Expiration

For cache invalidation, setting TTL can be better than immediate deletion:

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)

def expire_by_pattern(pattern, ttl_seconds=1, batch_size=1000):
    """
    Set short TTL on keys instead of deleting.
    Redis handles the actual deletion over time.
    """
    cursor = 0
    expired = 0

    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=batch_size)

        if keys:
            pipe = r.pipeline()
            for key in keys:
                pipe.expire(key, ttl_seconds)
            pipe.execute()
            expired += len(keys)

        if cursor == 0:
            break

    print(f"Set TTL on {expired} keys")
    return expired

# Gracefully expire old cache
expire_by_pattern('old_cache:*', ttl_seconds=60)
```

## Monitoring Flush Operations

```python
import redis
import time
import threading

r = redis.Redis(host='localhost', port=6379, db=0)

def monitor_flush():
    """Monitor Redis during a flush operation"""
    while True:
        info = r.info('stats')
        memory = r.info('memory')

        print(f"Keys: {r.dbsize()}")
        print(f"Memory: {memory['used_memory_human']}")
        print(f"Evicted keys: {info['evicted_keys']}")
        print("---")

        time.sleep(1)

# Start monitoring in background
monitor_thread = threading.Thread(target=monitor_flush, daemon=True)
monitor_thread.start()

# Perform async flush
r.flushall(asynchronous=True)

# Monitor shows keys decreasing over time
time.sleep(5)
```

## Flush in Redis Cluster

In Redis Cluster, FLUSHALL must be executed on each node:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

# FLUSHALL on cluster affects all nodes
rc.flushall()

# Or target specific nodes
for node in rc.get_nodes():
    print(f"Flushing {node.host}:{node.port}")
    node_client = node.redis_connection
    node_client.flushdb()
```

Using redis-cli:

```bash
# Flush all nodes in cluster
redis-cli --cluster call redis-1:7000 FLUSHALL

# Or connect to each node
for port in 7000 7001 7002 7003 7004 7005; do
    redis-cli -p $port FLUSHDB
done
```

## Recovery After Accidental Flush

If you accidentally flush production data:

```bash
# If you have RDB snapshots
# Stop Redis to prevent overwriting the dump
redis-cli SHUTDOWN NOSAVE

# Find latest backup
ls -la /var/lib/redis/dump.rdb

# Restore from backup
cp /backup/dump.rdb /var/lib/redis/dump.rdb

# Restart Redis
systemctl start redis

# If using AOF, check for recent AOF file
ls -la /var/lib/redis/appendonly.aof

# Redis will replay AOF on startup if configured
```

## Summary

| Command | Scope | Blocking | When to Use |
|---------|-------|----------|-------------|
| FLUSHDB | Single DB | Yes (default) | Clear test database |
| FLUSHDB ASYNC | Single DB | No | Clear large database |
| FLUSHALL | All DBs | Yes (default) | Complete reset |
| FLUSHALL ASYNC | All DBs | No | Reset large instance |
| SCAN + DELETE | Pattern | No | Selective cleanup |

Best practices:
- Disable or rename flush commands in production
- Use ASYNC for large datasets
- Prefer SCAN-based deletion for selective cleanup
- Always have backups before maintenance operations
- Test flush procedures in staging first
- Monitor Redis during flush operations
