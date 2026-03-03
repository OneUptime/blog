# How to Configure Redis as a Cache with TTL on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Redis, Caching, Performance, Database

Description: Configure Redis as a caching layer on Ubuntu with TTL-based expiration, eviction policies, and practical patterns for caching database queries and API responses.

---

Redis works exceptionally well as a cache because of its sub-millisecond response times and built-in TTL (time-to-live) support. When used as a cache, every key you store should have an expiration time so that stale data does not accumulate. This guide covers configuring Redis for caching workloads, including eviction policies, TTL patterns, and practical caching strategies.

## Configuring Redis for Caching Mode

A Redis cache has different requirements than a Redis data store. The key differences are:

- Memory limit is mandatory (otherwise Redis grows until the server runs out of memory)
- Eviction policy should automatically remove old keys (not return errors)
- Persistence is usually disabled (cache is warm from application requests)

Edit the configuration:

```bash
sudo nano /etc/redis/redis.conf
```

```text
# Required: set a memory limit
maxmemory 2gb

# Eviction policy - what to remove when memory is full
# For a general-purpose cache: allkeys-lru (remove least recently used keys)
maxmemory-policy allkeys-lru

# For a cache with mixed TTL and no-TTL keys:
# volatile-lru - only evict keys that have TTL set

# Increase LRU precision (default 5, max 10)
maxmemory-samples 10

# Disable persistence for a pure cache (faster, data loss on restart is OK)
save ""
appendonly no

# Bind to localhost for security
bind 127.0.0.1

# Set a password
requirepass "strong_cache_password"
```

```bash
sudo systemctl restart redis-server

# Verify settings
redis-cli -a "strong_cache_password" CONFIG GET maxmemory
redis-cli -a "strong_cache_password" CONFIG GET maxmemory-policy
```

## Eviction Policy Comparison

Choosing the right eviction policy matters:

| Policy | Behavior | Best for |
|---|---|---|
| noeviction | Returns error when full (default) | Databases, not caches |
| allkeys-lru | Evicts least recently used keys | General caching |
| volatile-lru | Evicts LRU keys with TTL set | Mixed TTL/no-TTL keys |
| allkeys-random | Evicts random keys | Uniform access pattern |
| volatile-random | Evicts random keys with TTL | When LRU is too expensive |
| volatile-ttl | Evicts keys with shortest TTL | When you want oldest data evicted |
| allkeys-lfu | Evicts least frequently used | Skewed access patterns |
| volatile-lfu | Evicts LFU keys with TTL | Mixed with skewed access |

For most web application caches, `allkeys-lru` is the right choice.

## Setting TTL on Keys

Every key in a cache should have a TTL. Redis provides several ways to set expiration:

```bash
# Connect to Redis
redis-cli -a "strong_cache_password"

# SET with EX (seconds) option - most common
SET user:123 "john_doe_data" EX 3600        # Expires in 1 hour
SET session:abc "session_data" EX 86400      # Expires in 24 hours

# SET with PX (milliseconds) option
SET rate_limit:ip:1.2.3.4 "10" PX 60000    # Expires in 60 seconds

# SET with EXAT (Unix timestamp)
SET promo:summer2026 "20% off" EXAT 1751328000

# SETEX - set value and expiry atomically (older syntax)
SETEX mykey 3600 "value"

# EXPIRE - set TTL on existing key
SET mykey "value"
EXPIRE mykey 3600

# PEXPIRE - set TTL in milliseconds
PEXPIRE mykey 3600000

# Check remaining TTL
TTL user:123     # Returns seconds remaining (-1 = no TTL, -2 = key doesn't exist)
PTTL user:123    # Returns milliseconds remaining

# Persist a key (remove its TTL)
PERSIST user:123
```

## Cache-Aside Pattern in Application Code

The cache-aside (lazy loading) pattern is the most common caching strategy. The application checks the cache first, and if it misses, fetches from the database and stores in cache.

Here is a Python example using redis-py:

```python
import redis
import json
import time

# Connect to Redis
r = redis.Redis(
    host='localhost',
    port=6379,
    password='strong_cache_password',
    decode_responses=True
)

def get_user(user_id: int) -> dict:
    """Get user data with Redis cache-aside pattern."""
    cache_key = f"user:{user_id}"

    # Try the cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - fetch from database
    user = fetch_user_from_database(user_id)  # Your DB query here

    if user:
        # Store in cache with 1 hour TTL
        r.setex(cache_key, 3600, json.dumps(user))

    return user

def invalidate_user_cache(user_id: int):
    """Invalidate cached user when data changes."""
    cache_key = f"user:{user_id}"
    r.delete(cache_key)

def update_user(user_id: int, data: dict):
    """Update user in database and invalidate cache."""
    # Update database first
    update_user_in_database(user_id, data)
    # Then invalidate cache (will be refreshed on next read)
    invalidate_user_cache(user_id)
```

## Caching Database Query Results in Python

```python
import redis
import hashlib
import json

r = redis.Redis(host='localhost', port=6379, password='strong_cache_password',
                decode_responses=True)

def cache_query(query: str, params: tuple, ttl: int = 300):
    """Decorator-style function to cache SQL query results."""
    # Create a cache key from the query and parameters
    cache_key = "query:" + hashlib.md5(
        f"{query}:{params}".encode()
    ).hexdigest()

    # Check cache
    result = r.get(cache_key)
    if result:
        return json.loads(result)

    # Execute query
    rows = execute_database_query(query, params)  # Your DB function

    # Cache the result
    r.setex(cache_key, ttl, json.dumps(rows))

    return rows

# Usage
users = cache_query(
    "SELECT * FROM users WHERE active = %s",
    (True,),
    ttl=600  # Cache for 10 minutes
)
```

## Caching HTTP API Responses

```python
import redis
import hashlib
import requests
import json

r = redis.Redis(host='localhost', port=6379, password='strong_cache_password',
                decode_responses=True)

def fetch_api_with_cache(url: str, ttl: int = 300) -> dict:
    """Fetch an API URL with Redis caching."""
    cache_key = "api:" + hashlib.md5(url.encode()).hexdigest()

    # Check cache
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Fetch from API
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    data = response.json()

    # Cache the response
    r.setex(cache_key, ttl, json.dumps(data))

    return data

# Usage - cache weather data for 30 minutes
weather = fetch_api_with_cache(
    "https://api.weather.example.com/current?city=london",
    ttl=1800
)
```

## Cache Warming

For caches that serve high-traffic after a restart, pre-populate them:

```bash
# Script to warm the cache on startup
cat << 'EOF' > /usr/local/bin/warm-redis-cache.sh
#!/bin/bash
REDIS_CLI="redis-cli -a strong_cache_password"

echo "Warming Redis cache..."

# Pre-load commonly accessed configuration
while IFS=',' read -r key value ttl; do
    $REDIS_CLI SETEX "$key" "$ttl" "$value"
done < /etc/app/cache-seed.csv

echo "Cache warming complete. Keys loaded: $($REDIS_CLI DBSIZE)"
EOF

chmod +x /usr/local/bin/warm-redis-cache.sh
```

## Monitoring Cache Performance

The two key metrics are hit rate and eviction rate:

```bash
# Check hit rate
redis-cli -a "strong_cache_password" INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Calculate hit rate:
# hit_rate = keyspace_hits / (keyspace_hits + keyspace_misses) * 100
# A healthy cache should have >80% hit rate

# Check evictions
redis-cli -a "strong_cache_password" INFO stats | grep evicted_keys

# Check memory usage
redis-cli -a "strong_cache_password" INFO memory | grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"

# Watch stats in real time
redis-cli -a "strong_cache_password" --stat -i 2

# View keyspace (how many keys in each database and TTL stats)
redis-cli -a "strong_cache_password" INFO keyspace
```

## Batch TTL Operations

Sometimes you need to update TTL for many keys at once:

```bash
# Extend TTL for all keys matching a pattern
redis-cli -a "strong_cache_password" --scan --pattern "user:*" | while read key; do
    redis-cli -a "strong_cache_password" EXPIRE "$key" 7200
done

# Delete all expired keys immediately (Redis handles this lazily, but you can force it)
redis-cli -a "strong_cache_password" DEBUG SLEEP 0

# Delete all keys matching a pattern (use with extreme caution in production)
redis-cli -a "strong_cache_password" --scan --pattern "session:*" | \
  xargs redis-cli -a "strong_cache_password" DEL
```

## Cache Stampede Prevention

When a cached item expires and many requests arrive simultaneously, they all hit the database at once. Prevent this with probabilistic early recomputation:

```python
import redis
import random
import time
import json
import math

r = redis.Redis(host='localhost', port=6379, password='strong_cache_password',
                decode_responses=True)

def get_with_xfetch(key: str, ttl: int, recompute_fn, beta: float = 1.0):
    """
    Get a cached value using the XFetch algorithm to prevent cache stampedes.
    Probabilistically recomputes the value before it expires.
    """
    cached = r.get(key)

    if cached:
        data = json.loads(cached)
        delta = data.get('_delta', 1.0)
        expiry = data.get('_expiry', 0)

        # Probabilistic early recomputation
        if time.time() - beta * delta * math.log(random.random()) >= expiry:
            # Recompute before expiry to avoid stampede
            start = time.time()
            value = recompute_fn()
            delta = time.time() - start

            payload = {'value': value, '_delta': delta, '_expiry': time.time() + ttl}
            r.setex(key, ttl, json.dumps(payload))
            return value

        return data['value']

    # Complete cache miss
    start = time.time()
    value = recompute_fn()
    delta = time.time() - start

    payload = {'value': value, '_delta': delta, '_expiry': time.time() + ttl}
    r.setex(key, ttl, json.dumps(payload))
    return value
```

Properly configured, Redis as a cache dramatically reduces database load and improves response times. The key is always setting TTLs, choosing the right eviction policy, and monitoring your hit rate to ensure the cache is actually being used effectively.
