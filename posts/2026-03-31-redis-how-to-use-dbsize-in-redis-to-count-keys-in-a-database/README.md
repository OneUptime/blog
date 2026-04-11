# How to Use DBSIZE in Redis to Count Keys in a Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Database, Monitoring, Command, Administration

Description: Learn how to use DBSIZE in Redis to quickly count the total number of keys in the current database, and how to use it for monitoring and capacity planning.

---

## What Is DBSIZE

`DBSIZE` returns the number of keys in the currently selected Redis database. Unlike `KEYS *` which is O(N) and blocks the server, `DBSIZE` is an O(1) operation that reads a cached counter maintained by Redis.

```text
DBSIZE
```

Returns an integer representing the total number of keys.

## Basic Usage

```bash
# Check key count in current database
DBSIZE
# (integer) 1542

# Switch to another database and check
SELECT 1
DBSIZE
# (integer) 0
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Count keys in current database (db 0 by default)
count = client.dbsize()
print(f"Total keys in DB 0: {count}")

# Check across multiple databases
for db_num in range(16):
    db_client = redis.Redis(host='localhost', port=6379, db=db_num, decode_responses=True)
    count = db_client.dbsize()
    if count > 0:
        print(f"DB {db_num}: {count} key(s)")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient({ database: 0 });
await client.connect();

const keyCount = await client.dbSize();
console.log(`Keys in database 0: ${keyCount}`);

// Check all databases
for (let db = 0; db < 16; db++) {
  const dbClient = createClient({ database: db });
  await dbClient.connect();
  const count = await dbClient.dbSize();
  if (count > 0) {
    console.log(`DB ${db}: ${count} key(s)`);
  }
  await dbClient.quit();
}
```

## Practical Example in Go

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
        DB:   0,
    })

    count, err := rdb.DBSize(ctx).Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Keys in DB 0: %d\n", count)
}
```

## DBSIZE vs INFO keyspace

`DBSIZE` counts keys in the current database. `INFO keyspace` shows counts for all databases with data:

```bash
# Only current database
DBSIZE
# (integer) 1542

# All databases with keys
INFO keyspace
# db0:keys=1542,expires=230,avg_ttl=86400000
# db1:keys=50,expires=50,avg_ttl=1800000
# db3:keys=10,expires=0,avg_ttl=0
```

## Monitoring Key Count Over Time

```python
import redis
import time

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def monitor_key_count(interval=60, samples=10):
    """Track key count growth over time."""
    counts = []
    for i in range(samples):
        count = client.dbsize()
        counts.append(count)
        print(f"[{i+1}/{samples}] Keys: {count}")

        if len(counts) > 1:
            delta = counts[-1] - counts[-2]
            direction = "+" if delta > 0 else ""
            print(f"  Change since last: {direction}{delta}")

        if i < samples - 1:
            time.sleep(interval)

    avg_growth = (counts[-1] - counts[0]) / max(samples - 1, 1)
    print(f"\nAvg growth per interval: {avg_growth:.1f} keys")
    return counts

monitor_key_count(interval=5, samples=3)
```

## Capacity Planning with DBSIZE

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def estimate_memory_per_key():
    """Estimate average memory usage per key."""
    total_keys = client.dbsize()
    if total_keys == 0:
        return None

    memory_info = client.info('memory')
    used_memory = memory_info['used_memory']

    bytes_per_key = used_memory / total_keys
    return {
        'total_keys': total_keys,
        'used_memory_bytes': used_memory,
        'used_memory_mb': round(used_memory / (1024 * 1024), 2),
        'bytes_per_key': round(bytes_per_key, 2),
        'kb_per_key': round(bytes_per_key / 1024, 3),
    }

stats = estimate_memory_per_key()
if stats:
    print(f"Total keys: {stats['total_keys']}")
    print(f"Memory used: {stats['used_memory_mb']} MB")
    print(f"Avg per key: {stats['bytes_per_key']} bytes")
```

## DBSIZE in Health Checks

```python
import redis

def check_redis_health():
    client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    try:
        ping = client.ping()
        key_count = client.dbsize()
        info = client.info('memory')

        return {
            'status': 'healthy',
            'ping': ping,
            'total_keys': key_count,
            'used_memory_mb': round(info['used_memory'] / (1024 * 1024), 2),
            'maxmemory_mb': round(info.get('maxmemory', 0) / (1024 * 1024), 2) or 'unlimited',
        }
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}

print(check_redis_health())
```

## Alert on Key Count Anomalies

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

MAX_KEYS_THRESHOLD = 1_000_000

def check_key_count_alert():
    count = client.dbsize()
    if count > MAX_KEYS_THRESHOLD:
        print(f"ALERT: Key count ({count:,}) exceeds threshold ({MAX_KEYS_THRESHOLD:,})")
        print("Consider reviewing TTL policies and eviction settings")
    else:
        print(f"Key count OK: {count:,} / {MAX_KEYS_THRESHOLD:,}")

check_key_count_alert()
```

## DBSIZE Does Not Count Expired Keys Instantly

Redis uses lazy expiration - expired keys may still count toward `DBSIZE` until they are actually accessed or cleaned up by the background expiry process:

```bash
SET mykey value
EXPIRE mykey 1

# After 1 second, the key is logically expired
# But DBSIZE might still count it until the lazy expiry runs
DBSIZE  # May still include the expired key briefly
```

This is generally not a problem but explains why `DBSIZE` counts can occasionally be slightly higher than the number of accessible keys.

## Summary

`DBSIZE` is an O(1) command that returns the total number of keys in the currently selected database. Use it for monitoring key growth, capacity planning, and health checks. For counts across all databases, use `INFO keyspace` instead. Note that expired but not yet evicted keys may temporarily inflate the count due to Redis's lazy expiration mechanism.
