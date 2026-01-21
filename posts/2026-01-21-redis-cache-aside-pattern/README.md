# How to Implement Cache-Aside Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Caching, Cache-Aside, Performance, Database, Python, Node.js, Go

Description: A comprehensive guide to implementing the cache-aside pattern with Redis for read-through caching of database queries. Learn best practices, code examples in multiple languages, and strategies for cache invalidation.

---

> The cache-aside pattern is the most widely used caching strategy for database queries. Also known as "lazy loading" or "read-through" caching, it loads data into the cache only when needed, reducing database load while keeping your cache efficient.

In the cache-aside pattern, the application code is responsible for maintaining the cache. When data is requested, the application first checks the cache - if found (cache hit), it returns immediately. If not found (cache miss), it fetches from the database, stores in cache, and then returns the data.

---

## How Cache-Aside Works

The cache-aside pattern follows these steps:

1. **Read Request**: Application receives a request for data
2. **Cache Check**: Look for the data in Redis cache
3. **Cache Hit**: If found, return data immediately
4. **Cache Miss**: If not found, query the database
5. **Cache Update**: Store the database result in cache
6. **Return Data**: Return the data to the caller

```
┌─────────────┐     1. Request     ┌─────────────┐
│             │ ────────────────── │             │
│   Client    │                    │ Application │
│             │ ◄───────────────── │             │
└─────────────┘     6. Response    └──────┬──────┘
                                          │
                              2. Check    │    4. Query
                                 Cache    │    (on miss)
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     │                     ▼
             ┌─────────────┐              │              ┌─────────────┐
             │             │              │              │             │
             │    Redis    │              │              │  Database   │
             │    Cache    │              │              │             │
             └─────────────┘              │              └─────────────┘
                    │                     │                     │
                    │       3. Return     │      5. Store       │
                    │       (on hit)      │      in cache       │
                    └─────────────────────┴─────────────────────┘
```

---

## Basic Implementation in Python

### Setup

```bash
pip install redis
```

### Simple Cache-Aside Pattern

```python
import redis
import json
from typing import Optional, Any
import hashlib

# Initialize Redis client
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True
)

def get_user(user_id: str) -> Optional[dict]:
    """
    Get user data using cache-aside pattern.
    First checks Redis cache, falls back to database on miss.
    """
    cache_key = f"user:{user_id}"

    # Step 1: Check cache
    cached_data = redis_client.get(cache_key)

    if cached_data:
        # Cache hit - return cached data
        print(f"Cache hit for {cache_key}")
        return json.loads(cached_data)

    # Cache miss - fetch from database
    print(f"Cache miss for {cache_key}")
    user_data = fetch_user_from_database(user_id)

    if user_data:
        # Store in cache with TTL of 1 hour
        redis_client.setex(
            cache_key,
            3600,  # TTL in seconds
            json.dumps(user_data)
        )

    return user_data

def fetch_user_from_database(user_id: str) -> Optional[dict]:
    """Simulate database query"""
    # In real code, this would query PostgreSQL, MySQL, etc.
    return {
        "id": user_id,
        "name": "John Doe",
        "email": "john@example.com"
    }
```

### Reusable Cache-Aside Decorator

```python
import functools
from typing import Callable
import json

def cache_aside(
    prefix: str,
    ttl: int = 3600,
    key_builder: Callable = None
):
    """
    Decorator that implements cache-aside pattern.

    Args:
        prefix: Cache key prefix (e.g., "user", "product")
        ttl: Time-to-live in seconds
        key_builder: Optional function to build cache key from args
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = f"{prefix}:{key_builder(*args, **kwargs)}"
            else:
                # Default: use first argument as key
                cache_key = f"{prefix}:{args[0] if args else 'default'}"

            # Check cache
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # Execute function
            result = func(*args, **kwargs)

            # Store in cache
            if result is not None:
                redis_client.setex(cache_key, ttl, json.dumps(result))

            return result

        return wrapper
    return decorator

# Usage
@cache_aside(prefix="user", ttl=3600)
def get_user_profile(user_id: str) -> dict:
    """Fetch user profile from database"""
    return query_database(f"SELECT * FROM users WHERE id = {user_id}")

@cache_aside(
    prefix="search",
    ttl=300,
    key_builder=lambda query, page: f"{hashlib.md5(query.encode()).hexdigest()}:{page}"
)
def search_products(query: str, page: int = 1) -> list:
    """Search products with caching"""
    return search_database(query, page)
```

---

## Implementation in Node.js

### Setup

```bash
npm install redis
```

### Basic Implementation

```javascript
const redis = require('redis');

// Create Redis client
const client = redis.createClient({
    url: 'redis://localhost:6379'
});

client.connect();

/**
 * Get user data using cache-aside pattern
 */
async function getUser(userId) {
    const cacheKey = `user:${userId}`;

    // Check cache
    const cached = await client.get(cacheKey);

    if (cached) {
        console.log(`Cache hit for ${cacheKey}`);
        return JSON.parse(cached);
    }

    // Cache miss - fetch from database
    console.log(`Cache miss for ${cacheKey}`);
    const userData = await fetchUserFromDatabase(userId);

    if (userData) {
        // Store in cache with TTL
        await client.setEx(cacheKey, 3600, JSON.stringify(userData));
    }

    return userData;
}

/**
 * Reusable cache-aside wrapper
 */
function cacheAside(options = {}) {
    const {
        prefix = 'cache',
        ttl = 3600,
        keyBuilder = (args) => args[0]
    } = options;

    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function(...args) {
            const cacheKey = `${prefix}:${keyBuilder(args)}`;

            // Check cache
            const cached = await client.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            // Execute original method
            const result = await originalMethod.apply(this, args);

            // Store in cache
            if (result !== null && result !== undefined) {
                await client.setEx(cacheKey, ttl, JSON.stringify(result));
            }

            return result;
        };

        return descriptor;
    };
}

// Functional wrapper for non-decorator use
async function withCache(key, ttl, fetchFn) {
    // Check cache
    const cached = await client.get(key);
    if (cached) {
        return JSON.parse(cached);
    }

    // Fetch and cache
    const result = await fetchFn();
    if (result !== null && result !== undefined) {
        await client.setEx(key, ttl, JSON.stringify(result));
    }

    return result;
}

// Usage
async function getProduct(productId) {
    return withCache(
        `product:${productId}`,
        3600,
        () => fetchProductFromDatabase(productId)
    );
}
```

---

## Implementation in Go

### Setup

```bash
go get github.com/redis/go-redis/v9
```

### Basic Implementation

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

var ctx = context.Background()

type CacheAside struct {
    client *redis.Client
    ttl    time.Duration
}

func NewCacheAside(addr string, ttl time.Duration) *CacheAside {
    client := redis.NewClient(&redis.Options{
        Addr: addr,
    })
    return &CacheAside{client: client, ttl: ttl}
}

// Get retrieves data using cache-aside pattern
func (c *CacheAside) Get(key string, fetchFn func() (interface{}, error)) (interface{}, error) {
    // Check cache
    cached, err := c.client.Get(ctx, key).Result()
    if err == nil {
        var result interface{}
        if err := json.Unmarshal([]byte(cached), &result); err == nil {
            fmt.Printf("Cache hit for %s\n", key)
            return result, nil
        }
    }

    // Cache miss - fetch from source
    fmt.Printf("Cache miss for %s\n", key)
    data, err := fetchFn()
    if err != nil {
        return nil, err
    }

    // Store in cache
    if data != nil {
        jsonData, _ := json.Marshal(data)
        c.client.Set(ctx, key, jsonData, c.ttl)
    }

    return data, nil
}

// User represents a user entity
type User struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

// GetUser demonstrates cache-aside pattern usage
func GetUser(cache *CacheAside, userID string) (*User, error) {
    key := fmt.Sprintf("user:%s", userID)

    result, err := cache.Get(key, func() (interface{}, error) {
        // Fetch from database
        return fetchUserFromDatabase(userID)
    })

    if err != nil {
        return nil, err
    }

    // Type assertion
    if user, ok := result.(map[string]interface{}); ok {
        return &User{
            ID:    user["id"].(string),
            Name:  user["name"].(string),
            Email: user["email"].(string),
        }, nil
    }

    return nil, fmt.Errorf("invalid user data")
}

func main() {
    cache := NewCacheAside("localhost:6379", time.Hour)

    // First call - cache miss
    user, _ := GetUser(cache, "123")
    fmt.Printf("User: %+v\n", user)

    // Second call - cache hit
    user, _ = GetUser(cache, "123")
    fmt.Printf("User: %+v\n", user)
}
```

---

## Cache Invalidation Strategies

Cache invalidation is one of the hardest problems in computer science. Here are proven strategies:

### 1. Time-Based Expiration (TTL)

```python
# Simple TTL - data expires after fixed time
redis_client.setex("user:123", 3600, json.dumps(user_data))

# Use shorter TTL for frequently changing data
redis_client.setex("stock:AAPL", 60, json.dumps(stock_price))  # 1 minute

# Use longer TTL for static data
redis_client.setex("product:catalog", 86400, json.dumps(catalog))  # 24 hours
```

### 2. Explicit Invalidation on Write

```python
def update_user(user_id: str, data: dict) -> dict:
    """Update user and invalidate cache"""
    # Update database
    updated_user = update_user_in_database(user_id, data)

    # Invalidate cache
    cache_key = f"user:{user_id}"
    redis_client.delete(cache_key)

    return updated_user

def delete_user(user_id: str) -> bool:
    """Delete user and invalidate cache"""
    # Delete from database
    delete_user_from_database(user_id)

    # Invalidate cache
    redis_client.delete(f"user:{user_id}")

    # Also invalidate related caches
    redis_client.delete(f"user:{user_id}:orders")
    redis_client.delete(f"user:{user_id}:preferences")

    return True
```

### 3. Pattern-Based Invalidation

```python
def invalidate_user_caches(user_id: str):
    """Invalidate all caches related to a user"""
    pattern = f"user:{user_id}:*"

    # Use SCAN to find matching keys (don't use KEYS in production)
    cursor = 0
    while True:
        cursor, keys = redis_client.scan(cursor, match=pattern, count=100)
        if keys:
            redis_client.delete(*keys)
        if cursor == 0:
            break

def invalidate_by_tag(tag: str):
    """Invalidate all caches with a specific tag"""
    # Store cache keys in a set for easy invalidation
    keys_to_delete = redis_client.smembers(f"tag:{tag}")
    if keys_to_delete:
        redis_client.delete(*keys_to_delete)
    redis_client.delete(f"tag:{tag}")
```

### 4. Version-Based Cache Keys

```python
def get_cache_version(entity: str) -> int:
    """Get current version for cache key generation"""
    version = redis_client.get(f"version:{entity}")
    return int(version) if version else 1

def increment_cache_version(entity: str):
    """Increment version to invalidate all related caches"""
    return redis_client.incr(f"version:{entity}")

def get_user_with_version(user_id: str) -> dict:
    """Get user with version-based cache key"""
    version = get_cache_version("users")
    cache_key = f"user:v{version}:{user_id}"

    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    user = fetch_user_from_database(user_id)
    if user:
        redis_client.setex(cache_key, 3600, json.dumps(user))

    return user

def update_all_user_caches():
    """Invalidate all user caches by incrementing version"""
    increment_cache_version("users")
    # Old versioned keys will expire naturally via TTL
```

---

## Handling Race Conditions

### Problem: Concurrent Cache Miss

When multiple requests hit a cache miss simultaneously, they all query the database:

```python
# Without protection - multiple DB queries
def get_user_unsafe(user_id: str) -> dict:
    cached = redis_client.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)

    # Multiple requests can reach here simultaneously
    user = fetch_user_from_database(user_id)  # Expensive!
    redis_client.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user
```

### Solution: Distributed Lock

```python
import time
import uuid

def get_user_with_lock(user_id: str) -> dict:
    """Get user with distributed lock to prevent thundering herd"""
    cache_key = f"user:{user_id}"
    lock_key = f"lock:{cache_key}"

    # Check cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Try to acquire lock
    lock_value = str(uuid.uuid4())
    acquired = redis_client.set(lock_key, lock_value, nx=True, ex=10)

    if acquired:
        try:
            # Double-check cache after acquiring lock
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # Fetch from database
            user = fetch_user_from_database(user_id)
            if user:
                redis_client.setex(cache_key, 3600, json.dumps(user))
            return user
        finally:
            # Release lock (only if we own it)
            if redis_client.get(lock_key) == lock_value:
                redis_client.delete(lock_key)
    else:
        # Wait for lock holder to populate cache
        for _ in range(50):  # Max 5 seconds
            time.sleep(0.1)
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

        # Fallback to database if cache still empty
        return fetch_user_from_database(user_id)
```

### Solution: Probabilistic Early Expiration

```python
import random
import math

def get_with_early_expiration(
    key: str,
    ttl: int,
    fetch_fn,
    beta: float = 1.0
) -> Any:
    """
    Cache-aside with probabilistic early expiration.
    Reduces thundering herd by randomly refreshing before expiration.
    """
    cached = redis_client.get(key)

    if cached:
        data = json.loads(cached)

        # Get TTL remaining
        remaining_ttl = redis_client.ttl(key)

        # Calculate early expiration probability
        # As TTL decreases, probability of refresh increases
        delta = ttl - remaining_ttl
        probability = math.exp(-delta / (beta * ttl))

        if random.random() < probability:
            # Early refresh - fetch in background
            data = fetch_fn()
            redis_client.setex(key, ttl, json.dumps(data))

        return data

    # Cache miss
    data = fetch_fn()
    if data:
        redis_client.setex(key, ttl, json.dumps(data))

    return data
```

---

## Best Practices

### 1. Choose Appropriate TTL Values

```python
# Short TTL for frequently changing data
CACHE_TTL = {
    "real_time_data": 10,       # 10 seconds
    "user_session": 1800,       # 30 minutes
    "user_profile": 3600,       # 1 hour
    "product_catalog": 86400,   # 24 hours
    "static_content": 604800,   # 1 week
}

def get_with_appropriate_ttl(key: str, data_type: str, fetch_fn):
    ttl = CACHE_TTL.get(data_type, 3600)
    # ... cache logic
```

### 2. Handle Cache Failures Gracefully

```python
def get_user_resilient(user_id: str) -> dict:
    """Cache-aside with graceful degradation"""
    cache_key = f"user:{user_id}"

    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except redis.RedisError as e:
        # Log error but continue to database
        logger.warning(f"Redis error: {e}")

    # Fetch from database
    user = fetch_user_from_database(user_id)

    # Try to cache, but don't fail if Redis is down
    try:
        if user:
            redis_client.setex(cache_key, 3600, json.dumps(user))
    except redis.RedisError:
        pass

    return user
```

### 3. Use Consistent Key Naming

```python
# Good: Consistent, hierarchical key naming
def build_cache_key(entity: str, entity_id: str, *sub_keys) -> str:
    """Build consistent cache keys"""
    parts = [entity, entity_id] + list(sub_keys)
    return ":".join(parts)

# Examples
user_key = build_cache_key("user", "123")                    # user:123
user_orders_key = build_cache_key("user", "123", "orders")   # user:123:orders
user_cart_key = build_cache_key("user", "123", "cart")       # user:123:cart
```

### 4. Monitor Cache Performance

```python
from prometheus_client import Counter, Histogram

cache_hits = Counter('cache_hits_total', 'Cache hits', ['cache'])
cache_misses = Counter('cache_misses_total', 'Cache misses', ['cache'])
cache_latency = Histogram('cache_latency_seconds', 'Cache latency', ['cache', 'operation'])

def get_user_instrumented(user_id: str) -> dict:
    """Cache-aside with metrics"""
    cache_key = f"user:{user_id}"

    with cache_latency.labels(cache='user', operation='get').time():
        cached = redis_client.get(cache_key)

    if cached:
        cache_hits.labels(cache='user').inc()
        return json.loads(cached)

    cache_misses.labels(cache='user').inc()

    user = fetch_user_from_database(user_id)

    if user:
        with cache_latency.labels(cache='user', operation='set').time():
            redis_client.setex(cache_key, 3600, json.dumps(user))

    return user
```

---

## When to Use Cache-Aside

**Use cache-aside when:**
- Data is read frequently but written infrequently
- Cache misses are acceptable (data will be fetched from database)
- You need fine-grained control over what gets cached
- Different data types need different TTLs

**Consider alternatives when:**
- Data must always be in cache (use write-through)
- You need guaranteed cache consistency (use write-through)
- Write-heavy workloads dominate (use write-behind)

---

## Conclusion

The cache-aside pattern is simple yet powerful. Key takeaways:

- **Check cache first** - return immediately on hit
- **Lazy loading** - only cache what's actually needed
- **TTL-based expiration** - set appropriate TTLs for each data type
- **Explicit invalidation** - delete cache entries on updates
- **Handle failures gracefully** - cache unavailability should not break your app

---

*Need to monitor your Redis cache performance? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Redis with cache hit ratios, latency tracking, and alerting.*
