# How to Delete Keys and Flush Data in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Delete, Flush, Key, Beginner, Data Management, SCAN

Description: Learn how to safely delete individual keys, groups of keys, and entire Redis databases using DEL, UNLINK, SCAN, and FLUSHDB commands.

---

## Deleting Individual Keys

```bash
# Delete a single key
DEL user:42

# Delete multiple keys at once
DEL user:42 user:43 user:44

# Returns the number of keys actually deleted
# (0 if keys didn't exist)
```

## DEL vs UNLINK

```bash
# DEL blocks Redis until key memory is freed
DEL large-key

# UNLINK deletes asynchronously (non-blocking) - preferred for large keys
UNLINK large-key
```

For large keys (large Hashes, Lists, Sets with many elements), always prefer UNLINK. DEL on a list with 1 million elements can block Redis for hundreds of milliseconds.

## Checking if a Key Exists Before Deleting

```bash
# Check if key exists (1 = yes, 0 = no)
EXISTS user:42

# Delete only if exists (same result as DEL, but useful conceptually)
EXISTS user:42
# If 1, then:
DEL user:42
```

## Deleting Keys by Pattern with SCAN

Never use `KEYS *` to find keys to delete in production. KEYS blocks Redis while scanning. Use SCAN instead:

```bash
# Scan for keys matching a pattern safely (--scan handles cursor iteration automatically)
redis-cli --scan --pattern "session:*"

# Delete all matching keys using scan + unlink
redis-cli --scan --pattern "session:*" | xargs redis-cli UNLINK

# Process in batches of 100 keys at a time
redis-cli --scan --pattern "session:*" | xargs -L 100 redis-cli UNLINK
```

## Node.js: Delete Keys by Pattern

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

async function deleteKeysByPattern(pattern, batchSize = 100) {
  let cursor = '0';
  let totalDeleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', batchSize);
    cursor = nextCursor;

    if (keys.length > 0) {
      // UNLINK is async and non-blocking (preferred over DEL)
      await redis.unlink(...keys);
      totalDeleted += keys.length;
      console.log(`Deleted ${keys.length} keys, total: ${totalDeleted}`);
    }
  } while (cursor !== '0');

  return totalDeleted;
}

// Delete all session keys
await deleteKeysByPattern('session:*');

// Delete all cache keys for a specific user
await deleteKeysByPattern('cache:user:42:*');
```

## Python: Delete Keys by Pattern

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def delete_by_pattern(pattern: str, batch_size: int = 100) -> int:
    total_deleted = 0
    cursor = 0

    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=batch_size)

        if keys:
            r.unlink(*keys)
            total_deleted += len(keys)
            print(f"Deleted {len(keys)} keys")

        if cursor == 0:
            break

    print(f"Total deleted: {total_deleted}")
    return total_deleted

# Delete expired cache keys
delete_by_pattern('cache:v1:*')
```

## Expiring Keys Instead of Deleting

```bash
# Set a key to expire in 60 seconds (auto-delete)
EXPIRE user:42:session 60

# Set expiry at a specific Unix timestamp
EXPIREAT user:42:session 1711990000

# Check remaining TTL
TTL user:42:session

# Remove expiry (make key permanent)
PERSIST user:42:session
```

## Flushing an Entire Database

```bash
# Delete all keys in the CURRENT database (db 0 by default)
FLUSHDB

# Async version (non-blocking)
FLUSHDB ASYNC

# Delete all keys in ALL databases (all 16 Redis databases)
FLUSHALL

# Async version
FLUSHALL ASYNC
```

**Warning:** FLUSHALL and FLUSHDB delete data permanently with no confirmation prompt. Be very careful, especially in production.

## Safe Flush with Confirmation Script

```bash
#!/bin/bash
echo "WARNING: This will delete ALL Redis data!"
echo "Type 'yes' to confirm:"
read CONFIRM

if [ "$CONFIRM" = "yes" ]; then
  redis-cli FLUSHDB ASYNC
  echo "Database flushed"
else
  echo "Aborted"
fi
```

## Deleting Specific Data Types

```bash
# Delete all elements from a List (effectively deletes the key)
DEL mylist

# Remove specific elements from a List
LREM mylist 0 "value-to-remove"

# Remove specific members from a Set
SREM myset "member-to-remove"

# Remove specific fields from a Hash (field, not whole hash)
HDEL user:42 phone_number

# Remove a member from a Sorted Set
ZREM leaderboard "user:42"
```

## Counting Keys Before Deletion

```bash
# Count all keys
redis-cli DBSIZE

# Count keys matching a pattern
redis-cli --scan --pattern "cache:*" | wc -l

# Use a script for accurate count
redis-cli EVAL "return #redis.call('keys', ARGV[1])" 0 "session:*"
# Note: this uses KEYS internally - use only on small datasets
```

## Verifying Deletion

```bash
# Confirm key is gone
EXISTS user:42
# 0 = deleted successfully

# Confirm FLUSHDB worked
DBSIZE
# 0
```

## Summary

Use DEL or UNLINK (preferred for large keys) to delete individual keys, and SCAN with UNLINK to safely delete groups of keys matching a pattern without blocking Redis. Use EXPIRE instead of manual deletion when possible - it is safer and automatic. Reserve FLUSHDB and FLUSHALL for development environments or carefully planned production operations, and always run them asynchronously with the ASYNC option to avoid blocking Redis.
