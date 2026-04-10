# Why You Should Not Use Multiple Databases in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Best Practice, Database, Architecture, Anti-Pattern

Description: Understand why using multiple Redis databases (SELECT 0-15) is an anti-pattern and learn better alternatives for data isolation in production systems.

---

## What Are Redis Databases?

Redis ships with 16 logical databases numbered 0 through 15 by default. You can switch between them using the SELECT command:

```bash
# Switch to database 1
SELECT 1

# Set a key in database 1
SET mykey "value"

# Switch back to database 0
SELECT 0

# mykey does not exist here
GET mykey
# (nil)
```

At first glance this seems like a convenient way to separate data for different applications or environments. In practice, it causes more problems than it solves.

## Why Multiple Databases Are Problematic

### 1. No Actual Isolation

All databases share the same memory, the same CPU, the same connection pool, and the same persistence mechanism. A heavy workload in database 1 degrades performance for database 0.

```bash
# Both databases run on the same server
# A slow KEYS * in db 1 blocks operations in db 0 too
SELECT 1
KEYS *   # This blocks the entire Redis instance!
```

### 2. Most Clients Handle It Poorly

Many Redis client libraries, connection pools, and frameworks default to database 0 and do not support SELECT cleanly. Cluster mode does not support multiple databases at all - only database 0 is available in Redis Cluster.

```javascript
// Redis Cluster - only DB 0 works
const redis = new Redis.Cluster([{ host: 'localhost', port: 7000 }]);

// This will throw an error in Cluster mode
await redis.select(1); // Error: ERR SELECT is not allowed in cluster mode
```

### 3. No Per-Database ACLs

Redis ACL rules apply at the instance level, not per-database. Users with access to the instance can read from any database. Even with Redis 7's ACL improvements, there is no way to restrict a user to a specific database number.

### 4. Cross-Database Operations Are Limited

Redis provides MOVE (since 1.0) and COPY with a DB option (since 6.2) for transferring keys between databases, but most other operations do not work across database boundaries. Pub/Sub, Lua scripts, and transactions (MULTI/EXEC) do not respect database boundaries in useful ways.

```bash
# MOVE a key from the current database to database 1
MOVE mykey 1

# COPY a key to database 1 (Redis 6.2+)
COPY mykey mykey DB 1

# But you cannot run cross-database queries, joins, or transactions
```

### 5. Monitoring Becomes Confusing

Most Redis monitoring tools report metrics at the instance level. Separating metrics per-database requires custom tooling, and the built-in INFO keyspace output only shows databases that have keys.

```bash
INFO keyspace
# db0:keys=1000,expires=200,avg_ttl=3600
# db3:keys=50,expires=10,avg_ttl=1800
# db0 and db3 are visible - but what about 1 and 2? Empty or forgotten?
```

## Better Alternatives

### Use Key Namespacing

The simplest alternative: prefix your keys with the application or environment name:

```bash
# Instead of SELECT 1 for app1
SET app1:session:abc123 "data"

# Instead of SELECT 2 for app2
SET app2:session:abc123 "data"

# Instead of SELECT 3 for staging
SET staging:user:42 "profile"
```

### Use Separate Redis Instances

For true isolation, run separate Redis processes:

```bash
# Production instance on port 6379
redis-server --port 6379 --maxmemory 4gb

# Staging instance on port 6380
redis-server --port 6380 --maxmemory 1gb

# Cache instance on port 6381
redis-server --port 6381 --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### Use Redis Namespaces in Client Configuration

```javascript
// Node.js - use key prefix instead of SELECT
const cacheClient = new Redis({
  host: 'localhost',
  port: 6379,
  keyPrefix: 'cache:'
});

const sessionClient = new Redis({
  host: 'localhost',
  port: 6379,
  keyPrefix: 'session:'
});

// Keys are automatically prefixed
await cacheClient.set('user:42', data);   // Stores as cache:user:42
await sessionClient.set('user:42', data); // Stores as session:user:42
```

```python
import redis

# Python with key prefix wrapper
class NamespacedRedis:
    def __init__(self, client, namespace):
        self.client = client
        self.namespace = namespace

    def get(self, key):
        return self.client.get(f"{self.namespace}:{key}")

    def set(self, key, value, **kwargs):
        return self.client.set(f"{self.namespace}:{key}", value, **kwargs)

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
cache = NamespacedRedis(r, 'cache')
session = NamespacedRedis(r, 'session')
```

## When SELECT Is Acceptable

There are a few narrow cases where SELECT is acceptable:

- Quick local development with a single Redis instance shared between projects
- Testing scripts where isolation is temporary and throwaway
- Legacy systems where refactoring is not currently feasible

Even in these cases, document the database numbers clearly and never rely on them in production.

## Summary

Redis multiple databases provide false isolation - they share all resources and do not work with Redis Cluster. Use key namespacing for lightweight separation, and separate Redis instances for true workload isolation. This keeps your architecture predictable, monitorable, and cluster-ready.
