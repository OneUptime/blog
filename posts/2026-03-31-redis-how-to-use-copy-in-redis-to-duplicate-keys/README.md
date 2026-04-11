# How to Use COPY in Redis to Duplicate Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Key Management, Command, Data Operations, Redis 6.2

Description: Learn how to use the COPY command in Redis 6.2+ to duplicate a key to a new name or different database without removing the source, preserving type and TTL.

---

## What Is COPY in Redis

`COPY` duplicates an existing key to a new destination key. Unlike `RENAME` which moves a key, `COPY` leaves the source key intact. It preserves the data type, value, and optionally the TTL. It was introduced in Redis 6.2.

```text
COPY source destination [DB destinationdb] [REPLACE]
```

- `source` - the key to copy from
- `destination` - the new key name
- `DB` - copy to a different database (default: same database)
- `REPLACE` - overwrite destination if it exists (default: fails if destination exists)

Returns `1` if copied, `0` if the copy failed (e.g., destination exists and `REPLACE` not specified).

## Basic Usage

```bash
SET original "hello world"

# Copy to new key in same database
COPY original backup

GET original
# "hello world"  <- still there

GET backup
# "hello world"  <- copy exists

# By default fails if destination exists
COPY original backup
# (integer) 0  <- failed, backup already exists

# Use REPLACE to overwrite
COPY original backup REPLACE
# (integer) 1
```

## Copying to a Different Database

```bash
SET mykey "important data"

# Copy to database 3
COPY mykey mykey DB 3

SELECT 3
GET mykey
# "important data"
```

## TTL Behavior

`COPY` copies the remaining TTL along with the value:

```bash
SET mykey "hello"
EXPIRE mykey 3600

TTL mykey
# (integer) 3600

COPY mykey mykey:backup

TTL mykey:backup
# (integer) ~3600  <- TTL is copied too
```

## Copying Different Data Types

`COPY` works with all Redis data types:

```bash
# Hash
HSET user:1 name "Alice" age 30
COPY user:1 user:1:backup
HGETALL user:1:backup
# 1) "name" 2) "Alice" 3) "age" 4) "30"

# List
LPUSH queue:prod "task1" "task2" "task3"
COPY queue:prod queue:staging

LRANGE queue:staging 0 -1
# 1) "task3" 2) "task2" 3) "task1"

# Sorted Set
ZADD leaderboard 100 "alice" 200 "bob" 150 "charlie"
COPY leaderboard leaderboard:snapshot
ZRANGE leaderboard:snapshot 0 -1 WITHSCORES
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Copy a configuration hash to a backup
client.hset('config:production', mapping={
    'max_connections': '100',
    'timeout': '30',
    'debug': 'false'
})

result = client.copy('config:production', 'config:production:backup')
print(f"Copied: {bool(result)}")

# Verify backup
backup = client.hgetall('config:production:backup')
print(f"Backup: {backup}")

# Original unchanged
original = client.hgetall('config:production')
print(f"Original: {original}")

# Copy with REPLACE
client.hset('config:production', 'debug', 'true')
result = client.copy('config:production', 'config:production:backup', replace=True)
print(f"Replaced backup: {bool(result)}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Set up source data
await client.zAdd('rankings:current', [
  { score: 1500, value: 'player:1' },
  { score: 1200, value: 'player:2' },
  { score: 900, value: 'player:3' },
]);

// Create a snapshot of the rankings
const copied = await client.copy('rankings:current', 'rankings:snapshot:2026-03-31');
console.log(`Snapshot created: ${copied}`);

// Verify snapshot
const snapshot = await client.zRangeWithScores('rankings:snapshot:2026-03-31', 0, -1);
console.log('Snapshot:', snapshot);

// Copy to different database
const crossDbCopied = await client.copy(
  'rankings:current',
  'rankings:current',
  { DB: 2 }
);
console.log(`Cross-db copy: ${crossDbCopied}`);
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
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    // Set up source key
    rdb.Set(ctx, "config:live", "version=2.0,debug=false", 0)

    // Copy to backup
    result, err := rdb.Copy(ctx, "config:live", "config:backup", 0, false).Result()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Copied: %v\n", result)

    // Read backup
    val, _ := rdb.Get(ctx, "config:backup").Result()
    fmt.Printf("Backup value: %s\n", val)
}
```

## Snapshot Pattern

Create point-in-time snapshots of important data:

```python
import redis
import datetime

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_snapshot(key, ttl_hours=24):
    """Create a timestamped snapshot of a key."""
    timestamp = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    snapshot_key = f"{key}:snapshot:{timestamp}"

    result = client.copy(key, snapshot_key)
    if result:
        # Optionally set TTL on snapshot
        client.expire(snapshot_key, ttl_hours * 3600)
        print(f"Snapshot created: {snapshot_key} (expires in {ttl_hours}h)")
        return snapshot_key
    else:
        print(f"Snapshot failed - key may not exist")
        return None

# Create snapshots of important data
client.zadd('leaderboard', {'alice': 1500, 'bob': 1200})
snap = create_snapshot('leaderboard')
```

## COPY vs RENAME vs DUMP/RESTORE

| Feature | COPY | RENAME | DUMP/RESTORE |
|---------|------|--------|--------------|
| Source preserved | Yes | No | Yes |
| Cross-database | Yes (DB option) | No | Yes |
| TTL copied | Yes | Yes | Optional |
| Cross-server | No | No | Yes |

## Summary

`COPY` (Redis 6.2+) duplicates a key to a new name while keeping the source intact, preserving data type, value, and TTL. Use the `DB` option to copy across logical databases and `REPLACE` to overwrite an existing destination. It is ideal for creating snapshots, staging data for testing, and cross-database data migration without risking the source data.
