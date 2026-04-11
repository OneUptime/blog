# How to Replace KEYS Command with SCAN in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, SCAN, Key, Best Practice

Description: Learn why the Redis KEYS command blocks the server and how to safely replace it with the non-blocking SCAN command for production use.

---

## Why KEYS Is Dangerous in Production

The `KEYS` command returns all keys matching a pattern. It scans the entire keyspace in a single operation, blocking the Redis event loop until it completes. For a database with millions of keys, this can cause:

- Latency spikes of hundreds of milliseconds to seconds
- Timeout errors for all other clients during the scan
- Cascading failures in production systems

```bash
# Dangerous in production - blocks Redis
KEYS user:*
```

Redis itself warns: never use KEYS in production. Use SCAN instead.

## The SCAN Command

`SCAN` performs the same keyspace iteration but in small, incremental batches. It returns a cursor that you use to resume the scan in the next call. It never blocks the server for long.

Basic syntax:

```bash
SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]
```

- `cursor` - Start with `0`, use the returned cursor for subsequent calls; scan is complete when cursor returns to `0`
- `MATCH` - Optional glob pattern filter
- `COUNT` - Hint for how many elements to return per call (not a guarantee)
- `TYPE` - Filter by key type (string, list, hash, etc.)

## Basic SCAN Example

```bash
# Start a scan
SCAN 0 MATCH "user:*" COUNT 100

# Returns:
# 1) "1492"        <- next cursor
# 2) 1) "user:1001"
#    2) "user:2045"
#    ...

# Continue with the returned cursor
SCAN 1492 MATCH "user:*" COUNT 100

# Continue until cursor returns "0"
SCAN <cursor> MATCH "user:*" COUNT 100
# Returns:
# 1) "0"           <- scan complete
# 2) ...
```

## Full SCAN Loop in Bash

```bash
#!/bin/bash
PATTERN="user:*"
cursor=0

while true; do
  result=$(redis-cli SCAN $cursor MATCH "$PATTERN" COUNT 100)
  cursor=$(echo "$result" | head -1)
  keys=$(echo "$result" | tail -n +2)

  if [ -n "$keys" ]; then
    echo "$keys"
  fi

  if [ "$cursor" = "0" ]; then
    break
  fi
done
```

## SCAN in Python

```python
import redis

r = redis.Redis(host="localhost", port=6379, password="pass")

def scan_keys(pattern, count=100):
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor=cursor, match=pattern, count=count)
        for key in keys:
            yield key.decode()
        if cursor == 0:
            break

# Iterate over all user keys
for key in scan_keys("user:*"):
    value = r.get(key)
    print(f"{key}: {value}")
```

## SCAN in Node.js

```javascript
const Redis = require("ioredis");
const r = new Redis({ host: "localhost", port: 6379 });

async function* scanKeys(pattern) {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await r.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    for (const key of keys) {
      yield key;
    }
  } while (cursor !== "0");
}

(async () => {
  for await (const key of scanKeys("user:*")) {
    console.log(key);
  }
})();
```

## Type-Specific SCAN Commands

For other data structures, Redis provides type-specific scan commands:

```bash
# Scan hash fields
HSCAN myhash 0 MATCH "field:*" COUNT 100

# Scan set members
SSCAN myset 0 MATCH "item:*" COUNT 100

# Scan sorted set members
ZSCAN myzset 0 MATCH "score:*" COUNT 100
```

## Disabling KEYS Command with ACL

To prevent accidental use of KEYS in production:

```text
# redis.conf
user default on >password ~* &* +@all -KEYS
```

Or rename it:

```text
rename-command KEYS ""
```

## Important SCAN Behaviors

- SCAN may return the same key multiple times (especially after a resize)
- SCAN may return keys that expire between the SCAN call and your processing
- The `COUNT` hint is not a hard limit - Redis may return more or fewer
- SCAN guarantees that all elements present from the start to the end of a full iteration are returned, even if the keyspace changes during the scan

## Summary

The `KEYS` command blocks Redis during full keyspace scans and should never be used in production. Replace it with `SCAN`, which iterates the keyspace incrementally without blocking. Use `SCAN` in a loop until the cursor returns to `0`, and apply the `MATCH` and `COUNT` parameters to control scan behavior. For data structure scanning, use `HSCAN`, `SSCAN`, and `ZSCAN` as appropriate. Consider disabling `KEYS` via ACL or rename-command to prevent accidental production use.
