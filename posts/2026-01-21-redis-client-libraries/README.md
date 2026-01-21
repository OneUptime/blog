# How to Connect to Redis from Python, Node.js, and Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Node.js, Go, Client Libraries, Connection Pooling, Programming

Description: A comprehensive guide to connecting to Redis from Python, Node.js, and Go applications, covering client library selection, connection pooling, authentication, error handling, and best practices for production deployments.

---

Redis client libraries are essential for integrating Redis into your applications. Choosing the right library and configuring it properly can significantly impact your application's performance and reliability.

In this guide, we will explore the most popular Redis client libraries for Python, Node.js, and Go, covering connection setup, pooling, authentication, and production best practices.

## Python: redis-py

The `redis-py` library is the official Python client for Redis, offering a comprehensive API and excellent performance.

### Installation

```bash
pip install redis
```

For better performance with connection pooling:

```bash
pip install redis[hiredis]
```

### Basic Connection

```python
import redis

# Simple connection
client = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True  # Return strings instead of bytes
)

# Test connection
print(client.ping())  # True

# Basic operations
client.set('name', 'Alice')
name = client.get('name')
print(f"Name: {name}")  # Name: Alice

# With expiration
client.setex('session', 3600, 'session_data')  # Expires in 1 hour
```

### Connection with Authentication

```python
import redis

client = redis.Redis(
    host='localhost',
    port=6379,
    password='your_secure_password',
    db=0,
    decode_responses=True
)

# Or using URL
client = redis.from_url('redis://:your_secure_password@localhost:6379/0')

# Redis 6+ with username (ACL)
client = redis.Redis(
    host='localhost',
    port=6379,
    username='myuser',
    password='mypassword',
    db=0,
    decode_responses=True
)
```

### Connection Pooling

```python
import redis

# Create a connection pool
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    password='your_password',
    db=0,
    max_connections=20,
    decode_responses=True
)

# Create client using the pool
client = redis.Redis(connection_pool=pool)

# Multiple clients can share the same pool
client1 = redis.Redis(connection_pool=pool)
client2 = redis.Redis(connection_pool=pool)

# Check pool stats
print(f"Active connections: {len(pool._in_use_connections)}")
print(f"Available connections: {len(pool._available_connections)}")
```

### Async Support

```python
import asyncio
import redis.asyncio as redis

async def main():
    # Create async client
    client = redis.Redis(
        host='localhost',
        port=6379,
        decode_responses=True
    )

    # Basic operations
    await client.set('key', 'value')
    value = await client.get('key')
    print(f"Value: {value}")

    # Close connection
    await client.close()

asyncio.run(main())
```

### Async Connection Pool

```python
import asyncio
import redis.asyncio as redis

async def main():
    # Create connection pool
    pool = redis.ConnectionPool.from_url(
        'redis://localhost:6379',
        max_connections=20,
        decode_responses=True
    )

    client = redis.Redis(connection_pool=pool)

    # Perform operations
    await client.set('key', 'value')
    value = await client.get('key')
    print(value)

    # Cleanup
    await client.close()
    await pool.disconnect()

asyncio.run(main())
```

### Pipeline for Batch Operations

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Without pipeline (6 round trips)
client.set('key1', 'value1')
client.set('key2', 'value2')
client.set('key3', 'value3')
val1 = client.get('key1')
val2 = client.get('key2')
val3 = client.get('key3')

# With pipeline (1 round trip)
pipe = client.pipeline()
pipe.set('key1', 'value1')
pipe.set('key2', 'value2')
pipe.set('key3', 'value3')
pipe.get('key1')
pipe.get('key2')
pipe.get('key3')
results = pipe.execute()
print(results)  # [True, True, True, 'value1', 'value2', 'value3']
```

### Sentinel Support

```python
from redis.sentinel import Sentinel

# Connect to Sentinel
sentinel = Sentinel([
    ('sentinel-1', 26379),
    ('sentinel-2', 26379),
    ('sentinel-3', 26379)
], socket_timeout=0.5)

# Get master for writes
master = sentinel.master_for(
    'mymaster',
    password='your_password',
    decode_responses=True
)

# Get slave for reads
slave = sentinel.slave_for(
    'mymaster',
    password='your_password',
    decode_responses=True
)

# Use master for writes
master.set('key', 'value')

# Use slave for reads
value = slave.get('key')
print(value)
```

### Cluster Support

```python
from redis.cluster import RedisCluster

# Connect to Redis Cluster
cluster = RedisCluster(
    host='localhost',
    port=7000,
    password='your_password',
    decode_responses=True
)

# Operations work transparently across shards
cluster.set('key1', 'value1')
cluster.set('key2', 'value2')

value = cluster.get('key1')
print(value)
```

### Error Handling

```python
import redis
from redis.exceptions import (
    ConnectionError,
    TimeoutError,
    AuthenticationError,
    ResponseError
)

def get_redis_client():
    return redis.Redis(
        host='localhost',
        port=6379,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True
    )

def safe_redis_operation():
    client = get_redis_client()

    try:
        result = client.get('key')
        return result
    except ConnectionError as e:
        print(f"Connection failed: {e}")
        # Implement retry logic or fallback
    except TimeoutError as e:
        print(f"Operation timed out: {e}")
    except AuthenticationError as e:
        print(f"Authentication failed: {e}")
    except ResponseError as e:
        print(f"Redis error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

    return None
```

### Production Configuration

```python
import redis

def create_production_client():
    """Create a production-ready Redis client."""
    return redis.Redis(
        host='redis.example.com',
        port=6379,
        password='secure_password',
        db=0,

        # Connection settings
        socket_timeout=5,
        socket_connect_timeout=5,
        socket_keepalive=True,

        # Retry settings
        retry_on_timeout=True,
        retry_on_error=[ConnectionError],

        # Pool settings
        max_connections=20,

        # SSL/TLS
        ssl=True,
        ssl_cert_reqs='required',
        ssl_ca_certs='/path/to/ca.crt',

        # Response handling
        decode_responses=True,

        # Health check
        health_check_interval=30
    )
```

## Node.js: ioredis

`ioredis` is a robust, feature-rich Redis client for Node.js with built-in Cluster and Sentinel support.

### Installation

```bash
npm install ioredis
```

### Basic Connection

```javascript
const Redis = require('ioredis');

// Simple connection
const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// Test connection
redis.ping().then(console.log); // PONG

// Basic operations
async function main() {
  await redis.set('name', 'Alice');
  const name = await redis.get('name');
  console.log(`Name: ${name}`); // Name: Alice

  // With expiration
  await redis.setex('session', 3600, 'session_data');

  // Check TTL
  const ttl = await redis.ttl('session');
  console.log(`TTL: ${ttl}`);
}

main().catch(console.error);
```

### Connection with Authentication

```javascript
const Redis = require('ioredis');

// With password
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'your_secure_password',
});

// With username (Redis 6+ ACL)
const redisAcl = new Redis({
  host: 'localhost',
  port: 6379,
  username: 'myuser',
  password: 'mypassword',
});

// Using URL
const redisUrl = new Redis('redis://:password@localhost:6379/0');
```

### Connection Pool (Automatic)

ioredis manages connection pooling automatically, but you can configure it:

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,

  // Connection pool settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Reconnection settings
  retryStrategy: (times) => {
    if (times > 3) {
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },

  // Connection settings
  connectTimeout: 10000,
  commandTimeout: 5000,
});

// Event listeners
redis.on('connect', () => console.log('Connected to Redis'));
redis.on('ready', () => console.log('Redis is ready'));
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('close', () => console.log('Connection closed'));
redis.on('reconnecting', () => console.log('Reconnecting...'));
```

### Pipeline for Batch Operations

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function batchOperations() {
  // Using pipeline
  const pipeline = redis.pipeline();

  pipeline.set('key1', 'value1');
  pipeline.set('key2', 'value2');
  pipeline.set('key3', 'value3');
  pipeline.get('key1');
  pipeline.get('key2');
  pipeline.get('key3');

  const results = await pipeline.exec();
  console.log(results);
  // [[null, 'OK'], [null, 'OK'], [null, 'OK'],
  //  [null, 'value1'], [null, 'value2'], [null, 'value3']]
}

// Multi for transactions
async function transactionExample() {
  const multi = redis.multi();

  multi.set('balance:1', 100);
  multi.decrby('balance:1', 50);
  multi.incrby('balance:2', 50);

  const results = await multi.exec();
  console.log(results);
}

batchOperations().catch(console.error);
```

### Sentinel Support

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26379 },
    { host: 'sentinel-3', port: 26379 },
  ],
  name: 'mymaster',
  password: 'your_password',
  sentinelPassword: 'sentinel_password',

  // Sentinel-specific options
  preferredSlaves: [
    { ip: 'slave-1', port: 6379, prio: 1 },
  ],

  // Role for read operations
  role: 'master', // or 'slave' for read replicas
});

redis.on('ready', () => {
  console.log('Connected via Sentinel');
});
```

### Cluster Support

```javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: 'node-1', port: 7000 },
  { host: 'node-2', port: 7001 },
  { host: 'node-3', port: 7002 },
], {
  redisOptions: {
    password: 'your_password',
  },

  // Cluster-specific options
  scaleReads: 'slave', // Read from slaves
  maxRedirections: 16,
  retryDelayOnFailover: 100,
  retryDelayOnClusterDown: 100,

  // NAT support
  natMap: {
    '10.0.0.1:7000': { host: 'external-host-1', port: 7000 },
    '10.0.0.2:7001': { host: 'external-host-2', port: 7001 },
  },
});

cluster.on('ready', () => {
  console.log('Cluster is ready');
});

// Operations work transparently
async function clusterOps() {
  await cluster.set('key1', 'value1');
  await cluster.set('key2', 'value2');

  const value = await cluster.get('key1');
  console.log(value);
}
```

### Error Handling

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('Max retries reached, giving up');
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

// Global error handler
redis.on('error', (err) => {
  console.error('Redis error:', err.message);
  // Implement alerting or logging
});

// Per-operation error handling
async function safeOperation() {
  try {
    const result = await redis.get('key');
    return result;
  } catch (error) {
    if (error.message.includes('NOAUTH')) {
      console.error('Authentication failed');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.error('Connection timed out');
    } else {
      console.error('Redis error:', error.message);
    }
    return null;
  }
}
```

### Production Configuration

```javascript
const Redis = require('ioredis');

function createProductionClient() {
  return new Redis({
    host: 'redis.example.com',
    port: 6379,
    password: 'secure_password',
    db: 0,

    // Connection settings
    connectTimeout: 10000,
    commandTimeout: 5000,
    keepAlive: 30000,

    // Retry settings
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 50, 2000);
    },

    // Queue settings
    enableOfflineQueue: true,
    enableReadyCheck: true,

    // TLS
    tls: {
      rejectUnauthorized: true,
      ca: fs.readFileSync('/path/to/ca.crt'),
    },

    // Lazy connect
    lazyConnect: false,
  });
}

const redis = createProductionClient();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await redis.quit();
  process.exit(0);
});
```

## Go: go-redis

The `go-redis` library is the most popular Redis client for Go, offering a type-safe API and excellent performance.

### Installation

```bash
go get github.com/redis/go-redis/v9
```

### Basic Connection

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // Create client
    client := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer client.Close()

    // Test connection
    pong, err := client.Ping(ctx).Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Ping:", pong)

    // Basic operations
    err = client.Set(ctx, "name", "Alice", 0).Err()
    if err != nil {
        log.Fatal(err)
    }

    name, err := client.Get(ctx, "name").Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Name:", name)

    // With expiration
    err = client.SetEx(ctx, "session", "session_data", time.Hour).Err()
    if err != nil {
        log.Fatal(err)
    }
}
```

### Connection with Authentication

```go
package main

import (
    "context"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    // With password
    client := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "your_secure_password",
        DB:       0,
    })
    defer client.Close()

    // With username (Redis 6+ ACL)
    clientAcl := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Username: "myuser",
        Password: "mypassword",
        DB:       0,
    })
    defer clientAcl.Close()

    // Using URL
    opt, _ := redis.ParseURL("redis://:password@localhost:6379/0")
    clientUrl := redis.NewClient(opt)
    defer clientUrl.Close()
}
```

### Connection Pooling

```go
package main

import (
    "context"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    client := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "password",
        DB:       0,

        // Pool settings
        PoolSize:     20,
        MinIdleConns: 5,
        PoolTimeout:  4 * time.Second,

        // Connection settings
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,

        // Idle connection settings
        ConnMaxIdleTime: 5 * time.Minute,
        ConnMaxLifetime: 0, // No max lifetime
    })
    defer client.Close()

    // Check pool stats
    stats := client.PoolStats()
    fmt.Printf("Hits: %d, Misses: %d, Timeouts: %d\n",
        stats.Hits, stats.Misses, stats.Timeouts)
}
```

### Pipeline for Batch Operations

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    client := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    defer client.Close()

    // Pipeline
    pipe := client.Pipeline()

    pipe.Set(ctx, "key1", "value1", 0)
    pipe.Set(ctx, "key2", "value2", 0)
    pipe.Set(ctx, "key3", "value3", 0)
    get1 := pipe.Get(ctx, "key1")
    get2 := pipe.Get(ctx, "key2")
    get3 := pipe.Get(ctx, "key3")

    _, err := pipe.Exec(ctx)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println(get1.Val(), get2.Val(), get3.Val())

    // Transaction with MULTI/EXEC
    tx := client.TxPipeline()

    tx.Set(ctx, "balance:1", 100, 0)
    tx.DecrBy(ctx, "balance:1", 50)
    tx.IncrBy(ctx, "balance:2", 50)

    _, err = tx.Exec(ctx)
    if err != nil {
        log.Fatal(err)
    }
}
```

### Sentinel Support

```go
package main

import (
    "context"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    client := redis.NewFailoverClient(&redis.FailoverOptions{
        MasterName: "mymaster",
        SentinelAddrs: []string{
            "sentinel-1:26379",
            "sentinel-2:26379",
            "sentinel-3:26379",
        },
        Password:         "redis_password",
        SentinelPassword: "sentinel_password",

        // Pool settings
        PoolSize:     20,
        MinIdleConns: 5,

        // Timeouts
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })
    defer client.Close()

    // Use client normally
    err := client.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        log.Fatal(err)
    }
}
```

### Cluster Support

```go
package main

import (
    "context"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    cluster := redis.NewClusterClient(&redis.ClusterOptions{
        Addrs: []string{
            "node-1:7000",
            "node-2:7001",
            "node-3:7002",
        },
        Password: "password",

        // Pool settings per node
        PoolSize:     10,
        MinIdleConns: 3,

        // Routing
        RouteByLatency: true,
        RouteRandomly:  false,

        // Timeouts
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })
    defer cluster.Close()

    // Operations work transparently
    err := cluster.Set(ctx, "key1", "value1", 0).Err()
    if err != nil {
        log.Fatal(err)
    }

    val, err := cluster.Get(ctx, "key1").Result()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(val)
}
```

### Error Handling

```go
package main

import (
    "context"
    "errors"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()

    client := redis.NewClient(&redis.Options{
        Addr:        "localhost:6379",
        DialTimeout: 5 * time.Second,
    })
    defer client.Close()

    // Get with error handling
    val, err := client.Get(ctx, "nonexistent").Result()
    if errors.Is(err, redis.Nil) {
        log.Println("Key does not exist")
    } else if err != nil {
        log.Printf("Error: %v", err)
    } else {
        log.Printf("Value: %s", val)
    }

    // Check connection
    _, err = client.Ping(ctx).Result()
    if err != nil {
        log.Fatalf("Failed to connect to Redis: %v", err)
    }
}

// Wrapper function with retry
func getWithRetry(ctx context.Context, client *redis.Client, key string, maxRetries int) (string, error) {
    var lastErr error

    for i := 0; i < maxRetries; i++ {
        val, err := client.Get(ctx, key).Result()
        if err == nil {
            return val, nil
        }

        if errors.Is(err, redis.Nil) {
            return "", err // Key doesn't exist, no point retrying
        }

        lastErr = err
        time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
    }

    return "", lastErr
}
```

### Production Configuration

```go
package main

import (
    "context"
    "crypto/tls"
    "time"

    "github.com/redis/go-redis/v9"
)

func createProductionClient() *redis.Client {
    return redis.NewClient(&redis.Options{
        Addr:     "redis.example.com:6379",
        Password: "secure_password",
        DB:       0,

        // Pool settings
        PoolSize:        50,
        MinIdleConns:    10,
        PoolTimeout:     4 * time.Second,
        ConnMaxIdleTime: 5 * time.Minute,
        ConnMaxLifetime: 30 * time.Minute,

        // Timeouts
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,

        // TLS
        TLSConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },

        // Hooks for monitoring
        OnConnect: func(ctx context.Context, cn *redis.Conn) error {
            log.Println("New connection established")
            return nil
        },
    })
}

func main() {
    client := createProductionClient()
    defer client.Close()

    ctx := context.Background()

    // Health check
    if err := client.Ping(ctx).Err(); err != nil {
        log.Fatalf("Redis health check failed: %v", err)
    }

    // Use client...
}
```

## Best Practices Summary

### Connection Management

1. **Use connection pooling** - All three libraries support it
2. **Set appropriate timeouts** - Prevent hanging operations
3. **Implement health checks** - Detect connection issues early
4. **Handle reconnection gracefully** - Use retry strategies

### Error Handling

1. **Distinguish error types** - Key not found vs connection error
2. **Implement retry logic** - For transient failures
3. **Log errors appropriately** - For debugging and monitoring
4. **Use circuit breakers** - For production resilience

### Performance

1. **Use pipelining** - For multiple operations
2. **Use connection pooling** - Reuse connections
3. **Set appropriate pool sizes** - Based on workload
4. **Monitor pool statistics** - Identify bottlenecks

### Security

1. **Always use authentication** - In production
2. **Enable TLS** - For encrypted connections
3. **Use ACLs** - For fine-grained access control (Redis 6+)
4. **Rotate credentials** - Regularly

## Conclusion

Each Redis client library offers robust features for connecting to Redis from your applications. Key takeaways:

- **Python (redis-py)**: Great async support, excellent for web applications
- **Node.js (ioredis)**: Feature-rich with built-in Cluster and Sentinel support
- **Go (go-redis)**: Type-safe API with excellent performance

Choose the library that best fits your application's needs and follow the production best practices outlined in this guide for reliable Redis integration.
