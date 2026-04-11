# How to Use EXPIREAT and PEXPIREAT in Redis for Absolute Expiration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Expiration, TTL, Command, Key Management

Description: Learn how to use EXPIREAT and PEXPIREAT in Redis to set key expiration at specific Unix timestamps instead of relative durations, enabling calendar-based expiry.

---

## What Are EXPIREAT and PEXPIREAT

While `EXPIRE` sets a key's TTL relative to now (e.g., "expire in 60 seconds"), `EXPIREAT` sets an absolute Unix timestamp at which the key expires. `PEXPIREAT` is the millisecond-precision variant.

```text
EXPIREAT key unix-time-seconds [NX | XX | GT | LT]
PEXPIREAT key unix-time-milliseconds [NX | XX | GT | LT]
```

Returns:
- `1` if the timeout was set
- `0` if the key does not exist

## Basic Usage

```bash
SET session:token "user:42"

# Expire at a specific Unix timestamp (seconds)
EXPIREAT session:token 1777680000

# Expire at a specific Unix timestamp (milliseconds)
PEXPIREAT session:token 1777680000000

# Check TTL
TTL session:token   # Seconds remaining
PTTL session:token  # Milliseconds remaining

# Check the exact expiry timestamp
EXPIRETIME session:token   # Unix seconds
PEXPIRETIME session:token  # Unix milliseconds
```

## Computing Target Timestamps

```python
from datetime import datetime, timezone

# Midnight on a specific date
dt = datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
unix_seconds = int(dt.timestamp())
print(f"Unix timestamp: {unix_seconds}")

# Tomorrow at midnight
from datetime import timedelta
tomorrow_midnight = (datetime.now(timezone.utc).replace(
    hour=0, minute=0, second=0, microsecond=0
) + timedelta(days=1))
unix_ms = int(tomorrow_midnight.timestamp() * 1000)
print(f"Tomorrow midnight (ms): {unix_ms}")
```

## Practical Example in Python

```python
import redis
from datetime import datetime, timezone, timedelta

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Set a promotion that expires at end of business day
client.set('promo:flash_sale', 'SAVE20')

# Expire at end of today (23:59:59 UTC)
today = datetime.now(timezone.utc)
end_of_day = today.replace(hour=23, minute=59, second=59, microsecond=0)
end_of_day_ts = int(end_of_day.timestamp())

result = client.expireat('promo:flash_sale', end_of_day_ts)
print(f"Expiry set: {bool(result)}")
print(f"Expires at: {end_of_day.isoformat()}")
print(f"TTL: {client.ttl('promo:flash_sale')} seconds")

# Set a subscription that expires at end of billing period
client.set('subscription:user:42', 'premium')
billing_end = datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
client.expireat('subscription:user:42', int(billing_end.timestamp()))
print(f"Subscription expires: {billing_end.isoformat()}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Expire a key at midnight tomorrow
const tomorrow = new Date();
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
tomorrow.setUTCHours(0, 0, 0, 0);

await client.set('daily:report', 'data here');

// EXPIREAT with Unix timestamp in seconds
const tomorrowUnix = Math.floor(tomorrow.getTime() / 1000);
await client.expireAt('daily:report', tomorrowUnix);

console.log(`Key expires at: ${tomorrow.toISOString()}`);
console.log(`TTL: ${await client.ttl('daily:report')} seconds`);

// PEXPIREAT with millisecond precision
await client.set('precise:event', 'data');
const preciseExpiry = tomorrow.getTime(); // Already in ms
await client.pExpireAt('precise:event', preciseExpiry);
console.log(`pTTL: ${await client.pTTL('precise:event')} ms`);
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

    rdb.Set(ctx, "event:ticket:123", "VIP", 0)

    // Expire at event start time
    eventTime := time.Date(2026, 6, 15, 20, 0, 0, 0, time.UTC)
    result, err := rdb.ExpireAt(ctx, "event:ticket:123", eventTime).Result()
    if err != nil {
        panic(err)
    }

    fmt.Printf("Expiry set: %v\n", result)
    ttl, _ := rdb.TTL(ctx, "event:ticket:123").Result()
    fmt.Printf("TTL: %v\n", ttl)
}
```

## Conditional Options

Like `EXPIRE`, `EXPIREAT` supports conditional flags in Redis 7.0+:

```bash
SET mykey "value"
EXPIREAT mykey 1777680000

# NX - only set if no expiry exists
EXPIREAT mykey 1777766400 NX
# Returns 0 if key already has an expiry

# XX - only set if expiry already exists
EXPIREAT mykey 1777766400 XX
# Returns 1 if expiry was updated

# GT - only set if new timestamp is greater (later) than current
EXPIREAT mykey 1777852800 GT

# LT - only set if new timestamp is less (sooner) than current
EXPIREAT mykey 1777593600 LT
```

## EXPIREAT vs EXPIRE Comparison

```python
import redis
from datetime import datetime, timezone, timedelta

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# EXPIRE - relative TTL
client.set('key1', 'value')
client.expire('key1', 3600)  # Expires in 1 hour from now
print(f"EXPIRE TTL: {client.ttl('key1')}")

# EXPIREAT - absolute timestamp
client.set('key2', 'value')
target = datetime.now(timezone.utc) + timedelta(hours=1)
client.expireat('key2', int(target.timestamp()))  # Expires at specific moment
print(f"EXPIREAT TTL: {client.ttl('key2')}")

# Both result in approximately the same TTL
# But EXPIREAT is calendar-based and survives clock drift better
```

## Use Cases

- **Trial periods**: expire user trials at end of month regardless of when they signed up
- **Flash sales**: set promotion end time to exact business hours boundary
- **Scheduled events**: expire event tickets at event start time
- **Session tokens**: expire at end of business day even if issued mid-day
- **Billing cycles**: set subscription keys to expire at billing period end

## Summary

`EXPIREAT` and `PEXPIREAT` let you set key expiration at absolute Unix timestamps (seconds and milliseconds respectively), making them ideal for calendar-based expiry scenarios like end-of-day promotions, billing cycle expirations, and scheduled events. Use `EXPIRETIME` and `PEXPIRETIME` to retrieve the exact expiry timestamp you set.
