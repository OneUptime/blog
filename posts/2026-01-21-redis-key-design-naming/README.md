# Redis Key Design and Naming Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Key Design, Naming Conventions, Best Practices, Data Modeling, Performance, Scalability

Description: A comprehensive guide to Redis key design and naming conventions. Learn patterns for organizing keys, avoiding common pitfalls, and designing scalable key structures for production applications.

---

> Redis key design significantly impacts application performance, maintainability, and scalability. Good key naming conventions make data easier to understand, query, and manage. Poor design leads to confusion, inefficient operations, and scaling challenges.

This guide covers key naming patterns, common anti-patterns, and practical strategies for designing Redis keys that scale with your application.

---

## Key Naming Fundamentals

### Basic Principles

```
Good key names are:
- Descriptive: Clearly indicate what data they store
- Consistent: Follow a predictable pattern
- Hierarchical: Use delimiters for namespacing
- Reasonably short: Balance clarity with memory efficiency
```

### Standard Delimiter Patterns

```bash
# Colon-separated (most common)
user:1000:profile
order:2024:01:15:ABC123
cache:api:users:list

# Dot-separated
user.1000.profile
config.app.settings

# Underscore (less common for Redis)
user_1000_profile
```

### Recommended Format

```
{object-type}:{identifier}:{sub-object}

Examples:
user:1000                    # User record
user:1000:profile            # User's profile
user:1000:sessions           # User's sessions set
order:ABC123                 # Order record
order:ABC123:items           # Order items list
cache:products:category:5    # Cached products in category 5
```

---

## Key Design Patterns

### Entity Keys

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Pattern: {entity}:{id}
# Stores main entity data

# User entity
user_id = 1000
r.hset(f"user:{user_id}", mapping={
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-15"
})

# Product entity
product_id = "SKU123"
r.hset(f"product:{product_id}", mapping={
    "name": "Widget",
    "price": "29.99",
    "stock": "100"
})

# Access pattern
user = r.hgetall(f"user:{user_id}")
product = r.hgetall(f"product:{product_id}")
```

### Relationship Keys

```python
# Pattern: {entity}:{id}:{relationship}
# Stores references to related entities

user_id = 1000

# One-to-many: User's orders
r.sadd(f"user:{user_id}:orders", "ORD001", "ORD002", "ORD003")

# Many-to-many: User's roles
r.sadd(f"user:{user_id}:roles", "admin", "editor")
r.sadd(f"role:admin:users", user_id)  # Reverse index

# Get user's orders
orders = r.smembers(f"user:{user_id}:orders")

# Get all admins
admins = r.smembers("role:admin:users")
```

### Index Keys

```python
# Pattern: index:{entity}:{field}:{value}
# Secondary indexes for lookups

# Email to user ID index
r.set("index:user:email:john@example.com", 1000)

# Find user by email
def get_user_by_email(email):
    user_id = r.get(f"index:user:email:{email}")
    if user_id:
        return r.hgetall(f"user:{user_id}")
    return None

# Username index (unique)
r.set("index:user:username:johndoe", 1000)

# Multi-value index using sets
r.sadd("index:user:country:US", 1000, 1001, 1002)
r.sadd("index:user:country:UK", 1003, 1004)

# Find users by country
us_users = r.smembers("index:user:country:US")
```

### Counter Keys

```python
# Pattern: counter:{scope}:{metric}
# For atomic counters and statistics

# Global counters
r.incr("counter:global:page_views")
r.incr("counter:global:signups")

# Scoped counters
r.incr(f"counter:user:{user_id}:logins")
r.incr(f"counter:product:{product_id}:views")

# Time-based counters
from datetime import datetime
today = datetime.now().strftime("%Y-%m-%d")
r.incr(f"counter:daily:{today}:orders")
r.incr(f"counter:hourly:{datetime.now().strftime('%Y-%m-%d:%H')}:requests")
```

### Cache Keys

```python
# Pattern: cache:{source}:{identifier}:{params_hash}
# For cached data with clear provenance

import hashlib
import json

def cache_key(source, identifier, params=None):
    """Generate consistent cache key"""
    if params:
        params_hash = hashlib.md5(
            json.dumps(params, sort_keys=True).encode()
        ).hexdigest()[:8]
        return f"cache:{source}:{identifier}:{params_hash}"
    return f"cache:{source}:{identifier}"

# API response cache
r.setex(
    cache_key("api", "products", {"category": 5, "page": 1}),
    300,  # 5 minutes TTL
    json.dumps(products_data)
)

# Database query cache
r.setex(
    cache_key("db", "user_orders", {"user_id": 1000}),
    60,
    json.dumps(orders)
)

# Computed result cache
r.setex(
    cache_key("computed", "dashboard_stats", {"period": "weekly"}),
    3600,
    json.dumps(stats)
)
```

### Session Keys

```python
# Pattern: session:{session_id}
# For user session data

import uuid

def create_session(user_id):
    session_id = str(uuid.uuid4())
    session_key = f"session:{session_id}"

    r.hset(session_key, mapping={
        "user_id": user_id,
        "created_at": str(datetime.now()),
        "ip_address": "192.168.1.1"
    })
    r.expire(session_key, 86400)  # 24 hours

    # Also track in user's sessions set
    r.sadd(f"user:{user_id}:sessions", session_id)

    return session_id

def get_session(session_id):
    return r.hgetall(f"session:{session_id}")

def invalidate_session(session_id):
    session = get_session(session_id)
    if session:
        user_id = session.get('user_id')
        r.delete(f"session:{session_id}")
        r.srem(f"user:{user_id}:sessions", session_id)
```

### Lock Keys

```python
# Pattern: lock:{resource}:{identifier}
# For distributed locks

def acquire_lock(resource, identifier, timeout=30):
    lock_key = f"lock:{resource}:{identifier}"
    lock_value = str(uuid.uuid4())

    acquired = r.set(lock_key, lock_value, nx=True, ex=timeout)

    if acquired:
        return lock_value
    return None

def release_lock(resource, identifier, lock_value):
    lock_key = f"lock:{resource}:{identifier}"

    # Only release if we own the lock (use Lua for atomicity)
    script = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    else
        return 0
    end
    """
    return r.eval(script, 1, lock_key, lock_value)

# Usage
lock = acquire_lock("order", "ORD123")
if lock:
    try:
        # Process order
        pass
    finally:
        release_lock("order", "ORD123", lock)
```

---

## Namespacing Strategies

### Application Prefix

```python
# Multi-tenant or multi-application environments

class RedisNamespace:
    def __init__(self, redis_client, namespace):
        self.r = redis_client
        self.namespace = namespace

    def _key(self, key):
        return f"{self.namespace}:{key}"

    def get(self, key):
        return self.r.get(self._key(key))

    def set(self, key, value, **kwargs):
        return self.r.set(self._key(key), value, **kwargs)

    def hset(self, key, mapping):
        return self.r.hset(self._key(key), mapping=mapping)

    def hgetall(self, key):
        return self.r.hgetall(self._key(key))

# Usage
app1 = RedisNamespace(r, "app1")
app2 = RedisNamespace(r, "app2")

app1.set("user:1000", "data")  # Key: app1:user:1000
app2.set("user:1000", "data")  # Key: app2:user:1000
```

### Environment Prefix

```python
import os

class EnvRedis:
    def __init__(self, redis_client):
        self.r = redis_client
        self.env = os.environ.get('ENVIRONMENT', 'dev')

    def _key(self, key):
        return f"{self.env}:{key}"

    # ... methods similar to above

# Usage
# Development: dev:user:1000
# Staging: staging:user:1000
# Production: prod:user:1000
```

### Tenant Isolation

```python
class TenantRedis:
    """Redis wrapper with tenant isolation"""

    def __init__(self, redis_client, tenant_id):
        self.r = redis_client
        self.tenant_id = tenant_id

    def _key(self, key):
        return f"tenant:{self.tenant_id}:{key}"

    def get(self, key):
        return self.r.get(self._key(key))

    def set(self, key, value, **kwargs):
        return self.r.set(self._key(key), value, **kwargs)

    def keys(self, pattern="*"):
        """Get keys for this tenant only"""
        return self.r.keys(self._key(pattern))

    def flush_tenant(self):
        """Delete all keys for this tenant"""
        keys = self.keys()
        if keys:
            self.r.delete(*keys)

# Usage
tenant1 = TenantRedis(r, "acme")
tenant2 = TenantRedis(r, "globex")

tenant1.set("config:api_key", "key1")  # tenant:acme:config:api_key
tenant2.set("config:api_key", "key2")  # tenant:globex:config:api_key
```

---

## Key Size Optimization

### Short vs Descriptive Keys

```python
# Memory comparison for 1 million keys

# Long descriptive keys
# Key: "user:profile:information:1000" (30 bytes) x 1M = 30MB in keys alone

# Shorter keys
# Key: "u:p:1000" (8 bytes) x 1M = 8MB in keys alone

# Balance: reasonably descriptive but not verbose
# Key: "user:1000:profile" (17 bytes) x 1M = 17MB

# For high-volume scenarios, consider abbreviations with documentation
KEY_PREFIXES = {
    'u': 'user',
    'p': 'product',
    'o': 'order',
    's': 'session',
    'c': 'cache',
}
```

### Hashed Keys for Long Identifiers

```python
import hashlib

def short_key(long_identifier, prefix="k"):
    """Create shorter key from long identifier"""
    hash_value = hashlib.md5(long_identifier.encode()).hexdigest()[:12]
    return f"{prefix}:{hash_value}"

# Long URL as cache key
url = "https://api.example.com/v1/users?page=1&limit=100&sort=created"

# Bad: Direct URL as key (very long)
# cache:https://api.example.com/v1/users?page=1&limit=100&sort=created

# Good: Hashed key with mapping
cache_key = short_key(url, "cache:url")  # cache:url:a1b2c3d4e5f6

# Store mapping if you need reverse lookup
r.hset("key:mappings:urls", cache_key, url)
```

---

## Common Anti-Patterns

### 1. KEYS Command in Production

```python
# BAD: KEYS blocks Redis and scans entire keyspace
keys = r.keys("user:*")  # O(N) - Never in production!

# GOOD: Use SCAN for iteration
def scan_keys(r, pattern, count=100):
    """Safely iterate keys matching pattern"""
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=count)
        for key in keys:
            yield key
        if cursor == 0:
            break

# Usage
for key in scan_keys(r, "user:*"):
    process(key)
```

### 2. Unpredictable Key Names

```python
# BAD: User input directly in key name
username = request.get("username")  # Could be "../../etc/passwd"
r.set(f"user:{username}", data)

# GOOD: Validate and sanitize
import re

def safe_key_component(value, max_length=64):
    """Sanitize value for use in Redis key"""
    # Remove non-alphanumeric characters except dash/underscore
    safe = re.sub(r'[^a-zA-Z0-9_-]', '', str(value))
    return safe[:max_length]

username = safe_key_component(request.get("username"))
r.set(f"user:{username}", data)

# Better: Use numeric IDs
r.set(f"user:{user_id}", data)  # user:1000
```

### 3. Missing TTLs on Cache Keys

```python
# BAD: Cache without expiration
r.set("cache:expensive:query", result)  # Stays forever!

# GOOD: Always set TTL for cache
r.setex("cache:expensive:query", 3600, result)

# Or use naming convention to enforce
def set_cache(key, value, ttl=3600):
    """All cache keys must have TTL"""
    if not key.startswith("cache:"):
        raise ValueError("Cache keys must start with 'cache:'")
    r.setex(key, ttl, value)
```

### 4. Flat Key Structure

```python
# BAD: No organization
r.set("john_email", "john@example.com")
r.set("john_orders", "[1,2,3]")
r.set("product_SKU123_name", "Widget")

# GOOD: Hierarchical structure
r.hset("user:john", "email", "john@example.com")
r.sadd("user:john:orders", 1, 2, 3)
r.hset("product:SKU123", "name", "Widget")
```

### 5. Overly Generic Keys

```python
# BAD: Ambiguous keys
r.set("data", value)
r.set("temp", value)
r.set("config", value)

# GOOD: Specific, namespaced keys
r.set("user:1000:profile:data", value)
r.set("job:ABC123:temp:results", value)
r.set("app:myapp:config:database", value)
```

---

## Key Organization for Common Use Cases

### E-Commerce Application

```python
# Products
product:{id}                    # Hash - product details
product:{id}:reviews            # List - recent reviews
product:{id}:rating             # String - average rating
index:product:category:{cat_id} # Set - products in category
index:product:brand:{brand}     # Set - products by brand

# Users
user:{id}                       # Hash - user profile
user:{id}:cart                  # Hash - shopping cart
user:{id}:wishlist              # Set - wishlist items
user:{id}:orders                # List - order history
session:{session_id}            # Hash - session data

# Orders
order:{id}                      # Hash - order details
order:{id}:items                # List - order items
order:{id}:status:history       # List - status changes

# Inventory
inventory:{product_id}          # String - stock count
inventory:{product_id}:reserved # String - reserved count
lock:inventory:{product_id}     # Lock for inventory operations

# Cache
cache:product:{id}              # Cached product JSON
cache:category:{id}:products    # Cached category products
cache:search:{query_hash}       # Cached search results
```

### Social Media Application

```python
# Users
user:{id}                       # Hash - profile
user:{id}:followers             # Set - follower IDs
user:{id}:following             # Set - following IDs
user:{id}:posts                 # List - post IDs (timeline)
user:{id}:notifications         # List - notification objects

# Posts
post:{id}                       # Hash - post content
post:{id}:likes                 # Set - user IDs who liked
post:{id}:comments              # List - comment IDs
post:{id}:shares                # Counter

# Feed
feed:user:{id}                  # Sorted set - personalized feed
feed:global:trending            # Sorted set - trending posts

# Relationships
index:hashtag:{tag}             # Set - post IDs with hashtag
index:mention:{user_id}         # List - posts mentioning user

# Real-time
presence:user:{id}              # String - online status
typing:{conversation_id}:{user_id} # String - typing indicator
```

### Analytics Application

```python
# Counters
counter:pageviews:{date}                    # Daily page views
counter:pageviews:{date}:{page_id}          # Page-specific views
counter:events:{event_type}:{date}          # Event counts

# Time series (using sorted sets)
timeseries:cpu:{server_id}                  # CPU metrics
timeseries:memory:{server_id}               # Memory metrics
timeseries:requests:{endpoint}              # Request counts

# Aggregations
agg:hourly:{metric}:{date}:{hour}          # Hourly aggregates
agg:daily:{metric}:{date}                   # Daily aggregates

# Unique counts (HyperLogLog)
unique:visitors:{date}                      # Unique visitors
unique:users:{feature}:{date}               # Feature usage

# Leaderboards
leaderboard:scores:daily:{date}             # Daily scores
leaderboard:scores:alltime                  # All-time scores
```

---

## Key Documentation

### Self-Documenting Keys

```python
# Store key schema documentation in Redis itself
KEY_SCHEMA = {
    "user:{id}": {
        "type": "hash",
        "fields": ["name", "email", "created_at"],
        "ttl": None,
        "description": "User profile data"
    },
    "session:{session_id}": {
        "type": "hash",
        "fields": ["user_id", "created_at", "ip_address"],
        "ttl": 86400,
        "description": "User session"
    },
    "cache:*": {
        "type": "string",
        "ttl": "varies",
        "description": "Cached data, always has TTL"
    }
}

# Store in Redis for runtime reference
r.hset("_schema:keys", mapping={
    pattern: json.dumps(schema)
    for pattern, schema in KEY_SCHEMA.items()
})
```

---

## Conclusion

Good Redis key design:

- **Uses consistent naming conventions**: Colon-separated hierarchical names
- **Is descriptive but efficient**: Balance clarity with memory usage
- **Supports querying patterns**: Enable SCAN operations with predictable prefixes
- **Includes proper namespacing**: Isolate by app, environment, or tenant

Key takeaways:
- Use `{entity}:{id}:{attribute}` pattern
- Always namespace keys appropriately
- Never use KEYS in production - use SCAN
- Document your key schema
- Validate user input before using in keys

---

*Need to monitor your Redis key usage? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with key pattern analysis, memory tracking, and performance insights.*
