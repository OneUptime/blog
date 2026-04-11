# How to Use EXPIRETIME in Redis to Get Expiration Timestamp

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Expiration, TTL, Command, Key Management

Description: Learn how to use EXPIRETIME and PEXPIRETIME in Redis to retrieve the absolute Unix timestamp at which a key will expire, added in Redis 7.0.

---

## What Are EXPIRETIME and PEXPIRETIME

`EXPIRETIME` returns the absolute Unix timestamp (in seconds) at which a key will expire. `PEXPIRETIME` returns the same in milliseconds. These commands were added in Redis 7.0 to complement `EXPIREAT`/`PEXPIREAT` - you can now get and set expiry timestamps without converting from `TTL`.

```text
EXPIRETIME key
PEXPIRETIME key
```

Returns:
- Unix timestamp (seconds/milliseconds) when the key expires
- `-1` if the key exists but has no expiry
- `-2` if the key does not exist

## Basic Usage

```bash
SET mykey "hello"
EXPIRE mykey 3600

# Get the absolute expiry timestamp
EXPIRETIME mykey
# (integer) 1711904400  <- Unix timestamp

# Millisecond precision
PEXPIRETIME mykey
# (integer) 1711904400000

# No expiry
SET permanent_key "forever"
EXPIRETIME permanent_key
# (integer) -1

# Non-existent key
EXPIRETIME nonexistent:key
# (integer) -2
```

## Practical Example in Python

```python
import redis
import datetime
from datetime import timezone

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

client.set('session:abc123', 'user:42')
client.expire('session:abc123', 1800)  # 30 minutes

# Get exact expiry timestamp
expiry_ts = client.expiretime('session:abc123')
expiry_dt = datetime.datetime.fromtimestamp(expiry_ts, tz=timezone.utc)
print(f"Session expires at: {expiry_dt.isoformat()}")

# Millisecond precision
expiry_ms = client.pexpiretime('session:abc123')
print(f"Session expiry (ms): {expiry_ms}")

# Check status
for key in ['session:abc123', 'permanent_key', 'nonexistent']:
    result = client.expiretime(key)
    if result == -2:
        print(f"{key}: does not exist")
    elif result == -1:
        print(f"{key}: no expiry (permanent)")
    else:
        dt = datetime.datetime.fromtimestamp(result, tz=timezone.utc)
        print(f"{key}: expires at {dt.isoformat()}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

(async () => {
  const client = createClient();
  await client.connect();

  await client.set('token:xyz', 'value');
  await client.expire('token:xyz', 3600);

  // Get absolute expiry time
  const expiryUnix = await client.expireTime('token:xyz');
  if (expiryUnix >= 0) {
    const expiryDate = new Date(expiryUnix * 1000);
    console.log(`Token expires at: ${expiryDate.toISOString()}`);
  }

  // Millisecond precision
  const expiryMs = await client.pExpireTime('token:xyz');
  console.log(`Expires at (ms): ${expiryMs}`);

  // Handle special return values
  async function getExpiryInfo(key) {
    const ts = await client.expireTime(key);
    if (ts === -2) return { status: 'missing' };
    if (ts === -1) return { status: 'persistent' };
    return {
      status: 'expiring',
      expiresAt: new Date(ts * 1000).toISOString(),
      ttlSeconds: Math.round(ts - Date.now() / 1000),
    };
  }

  console.log(await getExpiryInfo('token:xyz'));
})();
```

## Practical Example in Go

```go
package main

import (
    "context"
    "fmt"
    "time"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    rdb.Set(ctx, "cache:data", "value", time.Hour)

    // Get absolute expiry timestamp
    expireTime, err := rdb.ExpireTime(ctx, "cache:data").Result()
    if err != nil {
        panic(err)
    }

    if expireTime > 0 {
        expiresAt := time.Unix(int64(expireTime.Seconds()), 0)
        fmt.Printf("Expires at: %s\n", expiresAt.Format(time.RFC3339))
    }
}
```

## EXPIRETIME vs TTL Comparison

| Command | Returns | Redis Version |
|---------|---------|---------------|
| `TTL` | Seconds remaining (relative) | All |
| `PTTL` | Milliseconds remaining (relative) | 2.6+ |
| `EXPIRETIME` | Unix timestamp in seconds (absolute) | 7.0+ |
| `PEXPIRETIME` | Unix timestamp in milliseconds (absolute) | 7.0+ |

```python
import redis
import time

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

client.set('key', 'value')
client.expire('key', 3600)

ttl = client.ttl('key')                    # ~3600 (relative)
expiry = client.expiretime('key')          # Unix timestamp (absolute)
expiry_from_ttl = int(time.time()) + ttl   # Same value computed differently

print(f"TTL: {ttl}")
print(f"EXPIRETIME: {expiry}")
print(f"Computed from TTL: {expiry_from_ttl}")
# Both expiry values should be approximately equal
```

## Use Cases

- **Display expiry to users**: show "Your trial ends at 2026-12-31 23:59:59"
- **Cache stampede prevention**: check absolute expiry before triggering cache refresh
- **Audit logging**: record the exact timestamp a key expired (not just "X seconds ago")
- **Scheduling**: align key expiry with business events

## Checking Expiry in Cache Refresh Logic

```python
import redis
import time
import datetime
from datetime import timezone

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

REFRESH_BEFORE_SECONDS = 300  # Refresh 5 minutes before expiry

def should_refresh_cache(key):
    expiry_ts = client.expiretime(key)

    if expiry_ts == -2:
        return True  # Key missing - need to populate

    if expiry_ts == -1:
        return False  # No expiry - permanent key

    time_until_expiry = expiry_ts - time.time()
    should_refresh = time_until_expiry < REFRESH_BEFORE_SECONDS

    if should_refresh:
        expiry_dt = datetime.datetime.fromtimestamp(expiry_ts, tz=timezone.utc)
        print(f"Cache expires at {expiry_dt.isoformat()} - refreshing early")

    return should_refresh

client.set('cache:homepage', '<html>...')
client.expire('cache:homepage', 200)  # Expires in 200 seconds (below 300s threshold)

if should_refresh_cache('cache:homepage'):
    print("Refreshing cache...")
```

## Summary

`EXPIRETIME` and `PEXPIRETIME` (added in Redis 7.0) return the absolute Unix timestamp at which a key will expire in seconds and milliseconds respectively. They return `-1` for persistent keys and `-2` for non-existent keys. Use them when you need the exact calendar time of expiration rather than a relative TTL countdown, making them ideal for displaying expiry times to users and implementing proactive cache refresh logic.
