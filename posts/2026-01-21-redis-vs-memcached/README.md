# Redis vs Memcached: Which Cache to Choose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memcached, Caching, Comparison, Performance, Architecture

Description: A comprehensive comparison of Redis and Memcached covering data structures, persistence, clustering, performance, and use cases to help you choose the right caching solution.

---

Redis and Memcached are the two most popular in-memory data stores, both excelling at caching but with fundamentally different designs and capabilities. This guide provides a detailed comparison to help you choose the right solution for your needs.

## Quick Comparison Overview

| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data Structures | Strings, Hashes, Lists, Sets, Sorted Sets, Streams, etc. | Strings only |
| Persistence | RDB snapshots, AOF logging | None |
| Replication | Built-in master-replica | None (client-side) |
| Clustering | Redis Cluster | Client-side sharding |
| Pub/Sub | Built-in | None |
| Lua Scripting | Yes | None |
| Transactions | MULTI/EXEC | CAS (Compare-and-Swap) |
| Memory Efficiency | Higher overhead per key | Lower overhead |
| Threading Model | Single-threaded (multi-threaded I/O in 6.0+) | Multi-threaded |
| Max Key Size | 512 MB | 250 bytes |
| Max Value Size | 512 MB | 1 MB (default) |

## Data Structures

### Memcached: Simple Key-Value

Memcached stores everything as strings. Any structure needs to be serialized by the client:

```python
import memcache
import json

mc = memcache.Client(['127.0.0.1:11211'])

# Store a simple value
mc.set('user:1:name', 'Alice')

# Store a complex object (requires serialization)
user = {'name': 'Alice', 'email': 'alice@example.com', 'age': 30}
mc.set('user:1', json.dumps(user))

# Retrieve and deserialize
user_data = json.loads(mc.get('user:1'))

# Atomic increment (one of few atomic operations)
mc.set('counter', '0')
mc.incr('counter')
```

### Redis: Rich Data Structures

Redis provides native data structures with atomic operations:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Strings
r.set('user:1:name', 'Alice')

# Hashes - update individual fields
r.hset('user:1', mapping={
    'name': 'Alice',
    'email': 'alice@example.com',
    'age': 30
})
r.hincrby('user:1', 'age', 1)  # Increment age atomically

# Lists - message queues
r.lpush('queue:tasks', 'task1', 'task2')
task = r.rpop('queue:tasks')

# Sets - unique collections
r.sadd('user:1:tags', 'premium', 'verified')
r.sismember('user:1:tags', 'premium')

# Sorted Sets - leaderboards
r.zadd('leaderboard', {'alice': 1500, 'bob': 1200})
top_players = r.zrevrange('leaderboard', 0, 9, withscores=True)

# HyperLogLog - unique counts
r.pfadd('visitors:today', 'user1', 'user2', 'user1')
unique_count = r.pfcount('visitors:today')  # Approximate: 2
```

**Key Difference**: Redis eliminates the need to read-modify-write for complex operations, reducing latency and race conditions.

## Persistence

### Memcached: Volatile Storage

Memcached is purely in-memory with no persistence:

- Data is lost on restart
- Suitable only for cacheable data
- No backup/restore capabilities
- Simpler operation (no disk I/O concerns)

### Redis: Optional Persistence

Redis offers multiple persistence options:

```bash
# redis.conf - RDB Snapshots
save 900 1      # Save after 900 seconds if at least 1 key changed
save 300 10     # Save after 300 seconds if at least 10 keys changed
save 60 10000   # Save after 60 seconds if at least 10000 keys changed

# AOF (Append Only File)
appendonly yes
appendfsync everysec  # Options: always, everysec, no

# Hybrid persistence (Redis 4.0+)
aof-use-rdb-preamble yes
```

**Persistence Modes**:

| Mode | Durability | Performance | Use Case |
|------|------------|-------------|----------|
| RDB Only | Point-in-time | Best | Caching with occasional recovery |
| AOF Only | Every operation/second | Good | Primary data store |
| RDB + AOF | Best of both | Good | Mission-critical data |
| None | None | Best | Pure caching |

## Memory Management

### Memcached: Slab Allocator

Memcached uses a slab allocator that pre-allocates memory chunks:

```bash
# Start memcached with 1GB memory
memcached -m 1024

# View slab statistics
echo "stats slabs" | nc localhost 11211
```

**Pros**:
- No memory fragmentation
- Predictable memory usage
- Efficient for uniform-sized objects

**Cons**:
- Memory waste if object sizes vary
- Cannot reconfigure slab sizes at runtime

### Redis: jemalloc

Redis uses jemalloc with dynamic memory allocation:

```bash
# Check memory usage
redis-cli INFO memory

# Set max memory and eviction policy
redis-cli CONFIG SET maxmemory 1gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

**Eviction Policies**:

| Policy | Description |
|--------|-------------|
| noeviction | Return errors when memory limit reached |
| allkeys-lru | Evict least recently used keys |
| allkeys-lfu | Evict least frequently used keys |
| volatile-lru | Evict LRU keys with TTL set |
| volatile-ttl | Evict keys with shortest TTL |
| allkeys-random | Evict random keys |

## Clustering and Scaling

### Memcached: Client-Side Sharding

Memcached requires clients to implement sharding:

```python
import memcache

# Client-side consistent hashing
servers = ['server1:11211', 'server2:11211', 'server3:11211']
mc = memcache.Client(servers)

# Client determines which server stores each key
mc.set('key1', 'value1')  # Hashed to server2
mc.set('key2', 'value2')  # Hashed to server1
```

**Limitations**:
- No automatic failover
- Adding/removing servers reshuffles keys
- No cross-server operations

### Redis: Native Clustering

Redis Cluster provides automatic sharding and failover:

```bash
# Create a cluster
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1

# Check cluster status
redis-cli -c -h node1 cluster info
redis-cli -c -h node1 cluster nodes
```

**Redis Cluster Features**:
- 16384 hash slots distributed across nodes
- Automatic slot rebalancing
- Master-replica failover
- Cross-slot transactions with hash tags

```python
# Hash tags ensure keys go to same slot
r.set('{user:1}:profile', 'data')
r.set('{user:1}:settings', 'data')
# Both keys in same slot, can be used in transactions
```

## Performance Comparison

### Throughput Benchmarks

```bash
# Redis benchmark
redis-benchmark -h localhost -p 6379 -n 1000000 -c 50 -t set,get

# Memcached benchmark
memtier_benchmark -s localhost -p 11211 --protocol=memcache_text \
  -n 1000000 -c 50 --ratio=1:1
```

**Typical Results** (single server, 50 connections):

| Operation | Redis | Memcached |
|-----------|-------|-----------|
| SET | ~150,000 ops/sec | ~200,000 ops/sec |
| GET | ~180,000 ops/sec | ~250,000 ops/sec |
| GET (pipeline 10) | ~800,000 ops/sec | ~750,000 ops/sec |

**Note**: Memcached is slightly faster for simple GET/SET due to its multi-threaded architecture, but Redis with pipelining closes the gap.

### Latency Comparison

| Percentile | Redis | Memcached |
|------------|-------|-----------|
| p50 | 0.1ms | 0.08ms |
| p99 | 0.5ms | 0.3ms |
| p99.9 | 2ms | 1ms |

**Note**: Both provide sub-millisecond latency for typical operations.

## Threading Model

### Memcached: Multi-Threaded

```bash
# Start with 4 worker threads
memcached -t 4 -m 1024

# Scales well with multiple CPU cores
# Each thread handles connections independently
```

### Redis: Predominantly Single-Threaded

```bash
# redis.conf - Enable I/O threads (Redis 6.0+)
io-threads 4
io-threads-do-reads yes
```

**Redis Threading Evolution**:
- Pre-6.0: Single-threaded for all operations
- 6.0+: Multi-threaded I/O (parsing, writing)
- Command execution remains single-threaded (atomicity guarantee)

## High Availability

### Memcached: No Native HA

```python
# Client-side failover
from pymemcache.client.hash import HashClient
from pymemcache.client.retrying import RetryingClient

client = HashClient(
    servers=[('server1', 11211), ('server2', 11211)],
    retry_attempts=3,
    retry_timeout=1
)
```

**Options for HA**:
- Client-side retry logic
- Load balancer health checks
- mcrouter (Facebook's proxy)

### Redis: Built-in HA

**Option 1: Redis Sentinel**

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('sentinel1', 26379),
    ('sentinel2', 26379),
    ('sentinel3', 26379)
])

master = sentinel.master_for('mymaster')
replica = sentinel.slave_for('mymaster')
```

**Option 2: Redis Cluster**

```bash
# Automatic failover when master fails
# Replicas promoted automatically
# No external coordination needed
```

## Use Case Comparison

### When to Choose Memcached

1. **Simple Caching**: Pure key-value cache without complex data needs

```python
# Session caching
mc.set(f'session:{session_id}', json.dumps(session_data), time=3600)

# HTML fragment caching
mc.set(f'fragment:{page}:{section}', html_content, time=300)

# Database query caching
mc.set(f'query:{hash(sql)}', json.dumps(results), time=60)
```

2. **Maximum Memory Efficiency**: Many small, uniform-sized objects

3. **Multi-threaded Performance**: Need to saturate multi-core CPU

4. **Simple Operations**: Only need GET/SET/DELETE

### When to Choose Redis

1. **Complex Data Structures**: Need lists, sets, sorted sets, etc.

```python
# Rate limiting with sorted sets
def check_rate_limit(user_id, max_requests=100, window=60):
    now = time.time()
    key = f'ratelimit:{user_id}'

    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, now - window)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window)
    results = pipe.execute()

    return results[2] <= max_requests
```

2. **Persistence Required**: Data must survive restarts

3. **Pub/Sub Messaging**: Real-time notifications

```python
# Publisher
r.publish('notifications', json.dumps({'user': 'alice', 'message': 'Hello'}))

# Subscriber
pubsub = r.pubsub()
pubsub.subscribe('notifications')
for message in pubsub.listen():
    print(message)
```

4. **Atomic Operations**: Complex read-modify-write operations

```python
# Lua script for atomic operations
SCRIPT = """
local current = redis.call('GET', KEYS[1])
if current and tonumber(current) >= tonumber(ARGV[1]) then
    return redis.call('DECRBY', KEYS[1], ARGV[1])
else
    return nil
end
"""

# Atomic decrement only if sufficient balance
result = r.eval(SCRIPT, 1, 'balance:user1', 100)
```

5. **Leaderboards and Rankings**: Sorted sets with scores

6. **Job Queues**: Reliable message processing with lists or streams

## Migration Considerations

### From Memcached to Redis

```python
# Compatibility layer
class RedisMemcacheCompat:
    def __init__(self, redis_client):
        self.r = redis_client

    def set(self, key, value, time=0):
        if time > 0:
            return self.r.setex(key, time, value)
        return self.r.set(key, value)

    def get(self, key):
        return self.r.get(key)

    def delete(self, key):
        return self.r.delete(key)

    def incr(self, key, delta=1):
        return self.r.incrby(key, delta)

    def decr(self, key, delta=1):
        return self.r.decrby(key, delta)

    def get_multi(self, keys):
        return dict(zip(keys, self.r.mget(keys)))

    def set_multi(self, mapping, time=0):
        pipe = self.r.pipeline()
        for key, value in mapping.items():
            if time > 0:
                pipe.setex(key, time, value)
            else:
                pipe.set(key, value)
        return pipe.execute()
```

## Cost Comparison

### Self-Hosted

| Factor | Redis | Memcached |
|--------|-------|-----------|
| Memory per key | ~90 bytes overhead | ~60 bytes overhead |
| CPU usage | Higher (single-threaded) | Lower (multi-threaded) |
| Operational complexity | Higher (persistence, replication) | Lower |
| Feature set | Rich | Limited |

### Managed Services (AWS)

| Service | Pricing Model | Starting Price |
|---------|--------------|----------------|
| ElastiCache for Redis | Per node-hour | ~$0.017/hour (t3.micro) |
| ElastiCache for Memcached | Per node-hour | ~$0.017/hour (t3.micro) |

**Note**: Pricing is similar, but Redis offers more features for the same cost.

## Conclusion

**Choose Memcached if**:
- You need the simplest possible caching solution
- Your data is uniform-sized and string-only
- You want to maximize memory efficiency for simple key-value pairs
- Multi-threaded performance is critical

**Choose Redis if**:
- You need rich data structures
- You require persistence or replication
- You want built-in clustering and high availability
- You need Pub/Sub or Lua scripting
- You want one tool for caching, queues, and more

For most modern applications, **Redis is the recommended choice** due to its versatility, rich feature set, and active development. The slight performance advantage of Memcached rarely outweighs Redis's additional capabilities.

## Related Resources

- [Redis Documentation](https://redis.io/documentation)
- [Memcached Wiki](https://github.com/memcached/memcached/wiki)
- [Redis vs Memcached Benchmark](https://redis.io/docs/management/optimization/benchmarks/)
