# How to Use Redis Strings for Caching and Counters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Strings, Caching, Counters, Data Structures, Atomic Operations, TTL

Description: A comprehensive guide to using Redis Strings for caching and counters, covering GET, SET, INCR, EXPIRE commands, atomic operations, and practical examples in Python, Node.js, and Go for building high-performance applications.

---

Redis Strings are the most basic and versatile data type in Redis. Despite the name, Redis Strings can store not just text but also integers, floating-point numbers, and binary data up to 512 MB. This flexibility makes them perfect for caching, counters, and many other use cases.

In this guide, we will explore Redis Strings in depth, covering essential commands, atomic operations, and practical implementations for caching and counters.

## Understanding Redis Strings

Redis Strings are binary-safe sequences of bytes. They can store:

- Text data (JSON, XML, HTML)
- Serialized objects
- Integers and floating-point numbers
- Binary data (images, files)

Maximum size: 512 MB per string value.

## Essential String Commands

### SET and GET

The fundamental operations for storing and retrieving values:

```bash
# Basic SET
SET user:1:name "Alice"

# GET the value
GET user:1:name
# "Alice"

# SET with options
SET key "value" EX 3600    # Expires in 3600 seconds
SET key "value" PX 60000   # Expires in 60000 milliseconds
SET key "value" NX         # Only set if key does not exist
SET key "value" XX         # Only set if key exists

# Combine options
SET session:abc123 "user_data" EX 3600 NX
```

### SETNX and SETEX

Specialized SET variations:

```bash
# SET if Not eXists
SETNX lock:resource "owner1"
# Returns 1 if set, 0 if key existed

# SET with EXpiration
SETEX session:xyz 3600 "session_data"
# Equivalent to: SET session:xyz "session_data" EX 3600

# SET with millisecond expiration
PSETEX temp:key 5000 "temporary"
```

### MSET and MGET

Multiple key operations for efficiency:

```bash
# Set multiple keys at once
MSET user:1:name "Alice" user:1:email "alice@example.com" user:1:age "30"

# Get multiple keys at once
MGET user:1:name user:1:email user:1:age
# 1) "Alice"
# 2) "alice@example.com"
# 3) "30"

# MSETNX - only sets if NONE of the keys exist
MSETNX key1 "val1" key2 "val2"
```

### String Manipulation

```bash
# Append to a string
SET greeting "Hello"
APPEND greeting ", World!"
GET greeting
# "Hello, World!"

# Get string length
STRLEN greeting
# 13

# Get substring
GETRANGE greeting 0 4
# "Hello"

# Overwrite part of string
SETRANGE greeting 7 "Redis!"
GET greeting
# "Hello, Redis!"
```

## Counter Operations

Redis excels at atomic counters thanks to INCR and DECR commands.

### Basic Counters

```bash
# Increment by 1
SET page:views 0
INCR page:views
INCR page:views
GET page:views
# "2"

# Decrement by 1
DECR page:views
GET page:views
# "1"

# Increment by specific amount
INCRBY page:views 10
GET page:views
# "11"

# Decrement by specific amount
DECRBY page:views 5
GET page:views
# "6"

# Increment float values
SET temperature 20.5
INCRBYFLOAT temperature 0.5
GET temperature
# "21"

INCRBYFLOAT temperature -1.5
GET temperature
# "19.5"
```

### Atomic Counter Patterns

```bash
# Counter with automatic initialization
INCR new:counter
# Returns 1 (key created with value 0, then incremented)

# Get and set atomically
GETSET counter "0"
# Returns old value, sets new value

# Get and delete atomically
GETDEL temp:counter
# Returns value and deletes key

# Get current value and set expiration
GET counter
EXPIRE counter 3600
```

## Expiration and TTL

Managing key lifetimes:

```bash
# Set expiration in seconds
SET cache:data "value"
EXPIRE cache:data 3600

# Set expiration in milliseconds
PEXPIRE cache:data 60000

# Set expiration at specific timestamp
EXPIREAT cache:data 1735689600

# Check remaining TTL
TTL cache:data
# Returns seconds remaining, -1 if no expiry, -2 if key doesn't exist

PTTL cache:data
# Returns milliseconds remaining

# Remove expiration
PERSIST cache:data

# Check if key exists
EXISTS cache:data
```

## Practical Examples

### Python Implementation

```python
import redis
import json
import time
from datetime import datetime

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# Caching Examples
# =============================================================================

def cache_user_profile(user_id: int, profile: dict, ttl: int = 3600) -> None:
    """Cache a user profile with expiration."""
    key = f"user:{user_id}:profile"
    client.setex(key, ttl, json.dumps(profile))

def get_cached_user_profile(user_id: int) -> dict | None:
    """Get cached user profile."""
    key = f"user:{user_id}:profile"
    data = client.get(key)
    return json.loads(data) if data else None

def cache_with_lock(key: str, fetch_func, ttl: int = 3600, lock_ttl: int = 10):
    """Cache-aside pattern with lock to prevent stampede."""
    # Try to get from cache
    cached = client.get(key)
    if cached:
        return json.loads(cached)

    # Acquire lock
    lock_key = f"lock:{key}"
    if client.set(lock_key, "1", ex=lock_ttl, nx=True):
        try:
            # Fetch fresh data
            data = fetch_func()
            client.setex(key, ttl, json.dumps(data))
            return data
        finally:
            client.delete(lock_key)
    else:
        # Wait and retry
        time.sleep(0.1)
        return cache_with_lock(key, fetch_func, ttl, lock_ttl)

# =============================================================================
# Counter Examples
# =============================================================================

def increment_page_view(page_id: str) -> int:
    """Increment page view counter."""
    key = f"page:{page_id}:views"
    return client.incr(key)

def get_page_views(page_id: str) -> int:
    """Get page view count."""
    key = f"page:{page_id}:views"
    views = client.get(key)
    return int(views) if views else 0

def increment_daily_counter(metric: str) -> int:
    """Increment a daily counter that expires at midnight."""
    today = datetime.now().strftime("%Y-%m-%d")
    key = f"daily:{metric}:{today}"

    # Use pipeline for atomic operation
    pipe = client.pipeline()
    pipe.incr(key)
    pipe.expire(key, 86400 * 2)  # Keep for 2 days
    results = pipe.execute()

    return results[0]

def rate_limit_check(user_id: str, limit: int = 100, window: int = 60) -> bool:
    """Simple rate limiter using counter."""
    key = f"ratelimit:{user_id}"

    current = client.get(key)
    if current is None:
        client.setex(key, window, 1)
        return True

    if int(current) >= limit:
        return False

    client.incr(key)
    return True

# =============================================================================
# Atomic Operations
# =============================================================================

def atomic_transfer(from_account: str, to_account: str, amount: int) -> bool:
    """Atomic balance transfer using WATCH/MULTI/EXEC."""
    from_key = f"balance:{from_account}"
    to_key = f"balance:{to_account}"

    while True:
        try:
            # Watch keys for changes
            client.watch(from_key, to_key)

            # Get current balances
            from_balance = int(client.get(from_key) or 0)
            to_balance = int(client.get(to_key) or 0)

            if from_balance < amount:
                client.unwatch()
                return False

            # Execute transaction
            pipe = client.pipeline(True)
            pipe.set(from_key, from_balance - amount)
            pipe.set(to_key, to_balance + amount)
            pipe.execute()

            return True
        except redis.WatchError:
            # Retry on concurrent modification
            continue

def get_or_set(key: str, fetch_func, ttl: int = 3600):
    """Get value or set it if not exists."""
    value = client.get(key)
    if value is not None:
        return json.loads(value)

    # Use SET NX to prevent race condition
    data = fetch_func()
    serialized = json.dumps(data)

    # Only set if key doesn't exist
    if client.set(key, serialized, ex=ttl, nx=True):
        return data

    # Another process set it, get their value
    return json.loads(client.get(key))

# =============================================================================
# Usage Examples
# =============================================================================

# Cache user profile
profile = {"name": "Alice", "email": "alice@example.com", "age": 30}
cache_user_profile(1, profile)
print(get_cached_user_profile(1))

# Page view counter
for _ in range(5):
    views = increment_page_view("home")
print(f"Page views: {get_page_views('home')}")

# Rate limiting
for i in range(105):
    allowed = rate_limit_check("user:123", limit=100)
    if not allowed:
        print(f"Rate limited at request {i + 1}")
        break

# Daily counter
count = increment_daily_counter("signups")
print(f"Daily signups: {count}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// Caching Examples
// =============================================================================

async function cacheUserProfile(userId, profile, ttl = 3600) {
  const key = `user:${userId}:profile`;
  await redis.setex(key, ttl, JSON.stringify(profile));
}

async function getCachedUserProfile(userId) {
  const key = `user:${userId}:profile`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

async function cacheWithLock(key, fetchFunc, ttl = 3600, lockTtl = 10) {
  // Try to get from cache
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Acquire lock
  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'EX', lockTtl, 'NX');

  if (acquired) {
    try {
      const data = await fetchFunc();
      await redis.setex(key, ttl, JSON.stringify(data));
      return data;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return cacheWithLock(key, fetchFunc, ttl, lockTtl);
  }
}

// =============================================================================
// Counter Examples
// =============================================================================

async function incrementPageView(pageId) {
  const key = `page:${pageId}:views`;
  return await redis.incr(key);
}

async function getPageViews(pageId) {
  const key = `page:${pageId}:views`;
  const views = await redis.get(key);
  return views ? parseInt(views) : 0;
}

async function incrementDailyCounter(metric) {
  const today = new Date().toISOString().split('T')[0];
  const key = `daily:${metric}:${today}`;

  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, 86400 * 2);
  const results = await pipeline.exec();

  return results[0][1];
}

async function rateLimitCheck(userId, limit = 100, window = 60) {
  const key = `ratelimit:${userId}`;

  const current = await redis.get(key);
  if (current === null) {
    await redis.setex(key, window, 1);
    return true;
  }

  if (parseInt(current) >= limit) {
    return false;
  }

  await redis.incr(key);
  return true;
}

// =============================================================================
// Atomic Operations
// =============================================================================

async function atomicTransfer(fromAccount, toAccount, amount) {
  const fromKey = `balance:${fromAccount}`;
  const toKey = `balance:${toAccount}`;

  while (true) {
    try {
      await redis.watch(fromKey, toKey);

      const fromBalance = parseInt(await redis.get(fromKey) || '0');
      const toBalance = parseInt(await redis.get(toKey) || '0');

      if (fromBalance < amount) {
        await redis.unwatch();
        return false;
      }

      const multi = redis.multi();
      multi.set(fromKey, fromBalance - amount);
      multi.set(toKey, toBalance + amount);
      await multi.exec();

      return true;
    } catch (error) {
      if (error.message.includes('EXECABORT')) {
        continue; // Retry on concurrent modification
      }
      throw error;
    }
  }
}

async function getOrSet(key, fetchFunc, ttl = 3600) {
  const value = await redis.get(key);
  if (value !== null) {
    return JSON.parse(value);
  }

  const data = await fetchFunc();
  const serialized = JSON.stringify(data);

  const set = await redis.set(key, serialized, 'EX', ttl, 'NX');
  if (set) {
    return data;
  }

  return JSON.parse(await redis.get(key));
}

// =============================================================================
// Sliding Window Rate Limiter
// =============================================================================

async function slidingWindowRateLimit(userId, limit, windowSeconds) {
  const key = `ratelimit:sliding:${userId}`;
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now, `${now}`);
  pipeline.zcard(key);
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  const count = results[2][1];

  return count <= limit;
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  // Cache user profile
  const profile = { name: 'Alice', email: 'alice@example.com', age: 30 };
  await cacheUserProfile(1, profile);
  console.log(await getCachedUserProfile(1));

  // Page view counter
  for (let i = 0; i < 5; i++) {
    await incrementPageView('home');
  }
  console.log(`Page views: ${await getPageViews('home')}`);

  // Rate limiting
  for (let i = 0; i < 105; i++) {
    const allowed = await rateLimitCheck('user:123', 100);
    if (!allowed) {
      console.log(`Rate limited at request ${i + 1}`);
      break;
    }
  }

  // Daily counter
  const count = await incrementDailyCounter('signups');
  console.log(`Daily signups: ${count}`);

  redis.disconnect();
}

main().catch(console.error);
```

### Go Implementation

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "strconv"
    "time"

    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
}

// =============================================================================
// Caching Examples
// =============================================================================

type UserProfile struct {
    Name  string `json:"name"`
    Email string `json:"email"`
    Age   int    `json:"age"`
}

func cacheUserProfile(userID int, profile UserProfile, ttl time.Duration) error {
    key := fmt.Sprintf("user:%d:profile", userID)
    data, err := json.Marshal(profile)
    if err != nil {
        return err
    }
    return client.SetEx(ctx, key, data, ttl).Err()
}

func getCachedUserProfile(userID int) (*UserProfile, error) {
    key := fmt.Sprintf("user:%d:profile", userID)
    data, err := client.Get(ctx, key).Result()
    if err == redis.Nil {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    var profile UserProfile
    if err := json.Unmarshal([]byte(data), &profile); err != nil {
        return nil, err
    }
    return &profile, nil
}

func cacheWithLock(key string, fetchFunc func() (interface{}, error), ttl, lockTTL time.Duration) (interface{}, error) {
    // Try to get from cache
    cached, err := client.Get(ctx, key).Result()
    if err == nil {
        var result interface{}
        json.Unmarshal([]byte(cached), &result)
        return result, nil
    }

    // Acquire lock
    lockKey := "lock:" + key
    acquired, err := client.SetNX(ctx, lockKey, "1", lockTTL).Result()
    if err != nil {
        return nil, err
    }

    if acquired {
        defer client.Del(ctx, lockKey)

        data, err := fetchFunc()
        if err != nil {
            return nil, err
        }

        serialized, _ := json.Marshal(data)
        client.SetEx(ctx, key, serialized, ttl)
        return data, nil
    }

    // Wait and retry
    time.Sleep(100 * time.Millisecond)
    return cacheWithLock(key, fetchFunc, ttl, lockTTL)
}

// =============================================================================
// Counter Examples
// =============================================================================

func incrementPageView(pageID string) (int64, error) {
    key := fmt.Sprintf("page:%s:views", pageID)
    return client.Incr(ctx, key).Result()
}

func getPageViews(pageID string) (int64, error) {
    key := fmt.Sprintf("page:%s:views", pageID)
    views, err := client.Get(ctx, key).Result()
    if err == redis.Nil {
        return 0, nil
    }
    if err != nil {
        return 0, err
    }
    return strconv.ParseInt(views, 10, 64)
}

func incrementDailyCounter(metric string) (int64, error) {
    today := time.Now().Format("2006-01-02")
    key := fmt.Sprintf("daily:%s:%s", metric, today)

    pipe := client.Pipeline()
    incr := pipe.Incr(ctx, key)
    pipe.Expire(ctx, key, 48*time.Hour)
    _, err := pipe.Exec(ctx)
    if err != nil {
        return 0, err
    }

    return incr.Val(), nil
}

func rateLimitCheck(userID string, limit int64, window time.Duration) (bool, error) {
    key := fmt.Sprintf("ratelimit:%s", userID)

    current, err := client.Get(ctx, key).Result()
    if err == redis.Nil {
        return true, client.SetEx(ctx, key, 1, window).Err()
    }
    if err != nil {
        return false, err
    }

    count, _ := strconv.ParseInt(current, 10, 64)
    if count >= limit {
        return false, nil
    }

    client.Incr(ctx, key)
    return true, nil
}

// =============================================================================
// Atomic Operations
// =============================================================================

func atomicTransfer(fromAccount, toAccount string, amount int64) (bool, error) {
    fromKey := fmt.Sprintf("balance:%s", fromAccount)
    toKey := fmt.Sprintf("balance:%s", toAccount)

    // Transaction with optimistic locking
    txf := func(tx *redis.Tx) error {
        fromBalance, err := tx.Get(ctx, fromKey).Int64()
        if err != nil && err != redis.Nil {
            return err
        }

        if fromBalance < amount {
            return fmt.Errorf("insufficient balance")
        }

        toBalance, err := tx.Get(ctx, toKey).Int64()
        if err != nil && err != redis.Nil {
            return err
        }

        _, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
            pipe.Set(ctx, fromKey, fromBalance-amount, 0)
            pipe.Set(ctx, toKey, toBalance+amount, 0)
            return nil
        })
        return err
    }

    for i := 0; i < 3; i++ {
        err := client.Watch(ctx, txf, fromKey, toKey)
        if err == nil {
            return true, nil
        }
        if err == redis.TxFailedErr {
            continue
        }
        return false, err
    }

    return false, fmt.Errorf("transaction failed after retries")
}

func getOrSet(key string, fetchFunc func() (interface{}, error), ttl time.Duration) (interface{}, error) {
    value, err := client.Get(ctx, key).Result()
    if err == nil {
        var result interface{}
        json.Unmarshal([]byte(value), &result)
        return result, nil
    }

    if err != redis.Nil {
        return nil, err
    }

    data, err := fetchFunc()
    if err != nil {
        return nil, err
    }

    serialized, _ := json.Marshal(data)
    set, err := client.SetNX(ctx, key, serialized, ttl).Result()
    if err != nil {
        return nil, err
    }

    if set {
        return data, nil
    }

    // Another process set it
    value, _ = client.Get(ctx, key).Result()
    var result interface{}
    json.Unmarshal([]byte(value), &result)
    return result, nil
}

// =============================================================================
// Sliding Window Rate Limiter
// =============================================================================

func slidingWindowRateLimit(userID string, limit int64, window time.Duration) (bool, error) {
    key := fmt.Sprintf("ratelimit:sliding:%s", userID)
    now := time.Now().UnixMilli()
    windowStart := now - window.Milliseconds()

    pipe := client.Pipeline()
    pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart, 10))
    pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
    count := pipe.ZCard(ctx, key)
    pipe.Expire(ctx, key, window)

    _, err := pipe.Exec(ctx)
    if err != nil {
        return false, err
    }

    return count.Val() <= limit, nil
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    // Cache user profile
    profile := UserProfile{Name: "Alice", Email: "alice@example.com", Age: 30}
    err := cacheUserProfile(1, profile, time.Hour)
    if err != nil {
        log.Fatal(err)
    }

    cached, _ := getCachedUserProfile(1)
    fmt.Printf("Cached profile: %+v\n", cached)

    // Page view counter
    for i := 0; i < 5; i++ {
        incrementPageView("home")
    }
    views, _ := getPageViews("home")
    fmt.Printf("Page views: %d\n", views)

    // Rate limiting
    for i := 0; i < 105; i++ {
        allowed, _ := rateLimitCheck("user:123", 100, time.Minute)
        if !allowed {
            fmt.Printf("Rate limited at request %d\n", i+1)
            break
        }
    }

    // Daily counter
    count, _ := incrementDailyCounter("signups")
    fmt.Printf("Daily signups: %d\n", count)
}
```

## Best Practices

### Key Naming Conventions

```bash
# Use colons as separators
user:1:profile
cache:api:users:list
session:abc123

# Include version for cache invalidation
cache:v2:products:list

# Use consistent prefixes
cache:    # For cached data
session:  # For session data
lock:     # For distributed locks
counter:  # For counters
temp:     # For temporary data
```

### Memory Optimization

```bash
# Use appropriate data types
SET counter 0           # Use strings for simple counters
# Don't store large JSON objects unnecessarily

# Set memory limits
CONFIG SET maxmemory 100mb
CONFIG SET maxmemory-policy allkeys-lru

# Monitor memory usage
INFO memory
MEMORY USAGE key
```

### Error Handling

Always handle Redis errors gracefully:

- Connection failures
- Key not found (redis.Nil in Go, null in other languages)
- Memory limit exceeded
- Timeout errors

## Conclusion

Redis Strings are fundamental building blocks for caching, counters, and many other use cases. Key takeaways:

- Use SETEX for cache entries with automatic expiration
- INCR/DECR provide atomic counter operations
- Combine SET NX with expiration for distributed locks
- Use pipelines for multiple operations to reduce round trips
- Follow consistent key naming conventions
- Always handle errors and edge cases

Redis Strings' simplicity and performance make them ideal for high-throughput applications requiring fast data access and atomic operations.
