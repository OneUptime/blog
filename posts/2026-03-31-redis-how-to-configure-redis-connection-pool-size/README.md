# How to Configure Redis Connection Pool Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Connection Pool, Performance Tuning, Node.js, Python, Go

Description: Learn how to right-size your Redis connection pool to maximize throughput, minimize latency, and avoid resource exhaustion in production applications.

---

## Why Connection Pool Size Matters

Redis is single-threaded for command processing, but multiple clients can connect concurrently. Connection pooling reuses existing TCP connections instead of opening new ones for each operation. Setting the pool size too low creates bottlenecks; too high wastes file descriptors and memory.

The optimal pool size depends on:
- Number of application threads or async workers
- Redis command latency
- Expected request rate

## Configuring Pool Size in Popular Clients

### Node.js with ioredis

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  // ioredis uses a single persistent connection by default
  // For pooling, use a cluster or manual pool
});

// For connection pooling with generic-pool
const { createPool } = require('generic-pool');

const pool = createPool({
  create: () => new Redis({ host: 'localhost', port: 6379 }),
  destroy: (client) => client.quit(),
}, {
  min: 2,
  max: 20,
  acquireTimeoutMillis: 3000,
});
```

### Python with redis-py

```python
import redis

# ConnectionPool is the recommended approach in redis-py
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    max_connections=20,       # maximum pool size
    socket_connect_timeout=5,
    socket_timeout=5,
)

client = redis.Redis(connection_pool=pool)

# Check pool stats
print(f"Max connections: {pool.max_connections}")
print(f"Current connections: {pool._created_connections}")
```

### Go with go-redis

```go
rdb := redis.NewClient(&redis.Options{
    Addr:         "localhost:6379",
    PoolSize:     20,           // maximum connections in pool
    MinIdleConns: 5,            // minimum idle connections to keep open
    MaxIdleConns: 10,           // maximum idle connections
    PoolTimeout:  4 * time.Second,
    ConnMaxIdleTime: 5 * time.Minute,
    ConnMaxLifetime: 30 * time.Minute,
})

// Inspect pool stats
stats := rdb.PoolStats()
fmt.Printf("Pool hits: %d, misses: %d, timeouts: %d\n",
    stats.Hits, stats.Misses, stats.Timeouts)
```

### Java with Jedis

```java
JedisPoolConfig poolConfig = new JedisPoolConfig();
poolConfig.setMaxTotal(20);         // max connections
poolConfig.setMaxIdle(10);          // max idle connections
poolConfig.setMinIdle(2);           // min idle connections
poolConfig.setTestOnBorrow(true);   // validate connection before use
poolConfig.setTestWhileIdle(true);  // validate idle connections
poolConfig.setTimeBetweenEvictionRunsMillis(30000);

JedisPool pool = new JedisPool(poolConfig, "localhost", 6379);

try (Jedis jedis = pool.getResource()) {
    jedis.set("key", "value");
}
```

## Calculating the Right Pool Size

A useful formula for synchronous applications:

```text
Pool Size = (Average Command Latency in ms / 1000) * Target Requests Per Second
```

For example, with 1ms average latency and 10,000 RPS:

```text
Pool Size = (1 / 1000) * 10000 = 10 connections
```

For async applications (Node.js, asyncio), a single connection can handle many concurrent requests because I/O is non-blocking. Keep pools smaller - typically 5-20.

## Monitoring Pool Health

### Check Redis server-side connections

```bash
# See current connection count
redis-cli INFO clients | grep connected_clients

# View all connected clients
redis-cli CLIENT LIST

# Set max client connections on server
redis-cli CONFIG SET maxclients 10000
```

### Python pool stats

```python
import redis

pool = redis.ConnectionPool(host='localhost', max_connections=20)
client = redis.Redis(connection_pool=pool)

# After some operations
created = pool._created_connections
available = pool._available_connections
in_use = pool._in_use_connections

print(f"Created: {created}, Available: {len(available)}, In-use: {len(in_use)}")
```

## Common Pool Configuration Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Pool too small | Queue buildup, high latency | Increase max connections |
| Pool too large | Too many Redis connections, OOM | Reduce max, use cluster |
| No min idle | Slow cold start | Set min idle to 2-5 |
| No pool timeout | Requests hang forever | Set acquire timeout |
| No connection validation | Stale connections returned | Enable test on borrow |

## Summary

Properly sizing your Redis connection pool is essential for reliable, high-performance applications. Set pool size based on your concurrency model and measured Redis latency. Always configure minimum idle connections to reduce cold-start latency, and monitor pool statistics in production to detect exhaustion or overprovisioning early.
