# How to Use Redis Sentinel with Client Libraries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Client, Library, High Availability

Description: Learn how to configure Redis client libraries in Python, Node.js, and Java to work with Sentinel for automatic failover-aware connections.

---

Redis client libraries must be Sentinel-aware to automatically redirect to a new primary after failover. This guide shows how to configure clients in Python, Node.js, and Java to use Sentinel properly.

## How Sentinel-Aware Clients Work

1. Client connects to one or more Sentinel instances (not directly to Redis)
2. Client asks Sentinel: "Where is the primary for `mymaster`?"
3. Sentinel returns the current primary's address
4. Client connects to the primary
5. On connection error, client retries Sentinel discovery

## Python - redis-py

```python
from redis.sentinel import Sentinel
import redis

sentinel = Sentinel(
    sentinels=[
        ('sentinel-1', 26379),
        ('sentinel-2', 26380),
        ('sentinel-3', 26381)
    ],
    socket_timeout=0.5,
    password='your-redis-password',   # if Redis requires auth
    sentinel_kwargs={'password': 'sentinel-password'}  # if Sentinel requires auth
)

# Get master connection (write operations)
master = sentinel.master_for('mymaster', socket_timeout=0.5)

# Get replica connection (read operations)
replica = sentinel.slave_for('mymaster', socket_timeout=0.5)

master.set('key', 'value')
value = replica.get('key')
```

## Node.js - ioredis

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 },
    { host: 'sentinel-2', port: 26380 },
    { host: 'sentinel-3', port: 26381 }
  ],
  name: 'mymaster',
  password: 'your-redis-password',
  sentinelPassword: 'sentinel-password',
  role: 'master'  // 'master' or 'slave'
});

redis.set('key', 'value');
redis.get('key', (err, result) => console.log(result));
```

For read replicas:

```javascript
const readClient = new Redis({
  sentinels: [
    { host: 'sentinel-1', port: 26379 }
  ],
  name: 'mymaster',
  role: 'slave',
  natMap: {}  // needed if Sentinel and Redis are behind NAT
});
```

## Java - Jedis

```java
import redis.clients.jedis.JedisSentinelPool;
import redis.clients.jedis.Jedis;
import java.util.Set;
import java.util.HashSet;

Set<String> sentinels = new HashSet<>();
sentinels.add("sentinel-1:26379");
sentinels.add("sentinel-2:26380");
sentinels.add("sentinel-3:26381");

JedisSentinelPool pool = new JedisSentinelPool(
    "mymaster",
    sentinels,
    "your-redis-password"
);

try (Jedis jedis = pool.getResource()) {
    jedis.set("key", "value");
    String value = jedis.get("key");
}
```

## Java - Lettuce (for reactive/async)

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;

RedisURI sentinelUri = RedisURI.Builder
    .sentinel("sentinel-1", 26379, "mymaster")
    .withSentinel("sentinel-2", 26380)
    .withSentinel("sentinel-3", 26381)
    .withPassword("your-redis-password".toCharArray())
    .build();

RedisClient client = RedisClient.create(sentinelUri);
StatefulRedisConnection<String, String> connection = client.connect();
connection.sync().set("key", "value");
```

## Handling Failover Reconnection

All Sentinel-aware clients handle failover automatically, but you should configure retry settings:

```python
# redis-py with retry on failover
from redis.retry import Retry
from redis.backoff import ExponentialBackoff
from redis.exceptions import ConnectionError, TimeoutError

sentinel = Sentinel(
    [('sentinel-1', 26379)],
    socket_timeout=0.5,
    retry=Retry(ExponentialBackoff(), 3),
    retry_on_error=[ConnectionError, TimeoutError]
)
```

## Summary

Sentinel-aware Redis clients query Sentinels to discover the current primary, then connect directly to Redis. All major client libraries (redis-py, ioredis, Jedis, Lettuce) support Sentinel natively. Configure them with all Sentinel addresses, the master name, and appropriate timeouts to handle failover transparently.
