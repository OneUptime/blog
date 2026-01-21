# How to Optimize Redis for Read-Heavy Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Read Optimization, Caching, Replicas, Scalability, High Throughput

Description: A comprehensive guide to optimizing Redis for read-heavy workloads, covering replica read scaling, caching strategies, data structure selection, client-side caching, and configuration tuning for maximum read throughput.

---

Read-heavy workloads are common in caching scenarios, session stores, and content delivery systems where data is read far more frequently than it is written. This guide covers strategies to maximize Redis read throughput, including replica reads, caching patterns, data structure optimization, and client-side techniques.

## Understanding Read-Heavy Workloads

Read-heavy workloads typically have these characteristics:

| Metric | Typical Value |
|--------|---------------|
| Read:Write Ratio | 10:1 to 1000:1 |
| Latency Requirement | < 1ms p99 |
| Throughput | 100K+ ops/sec |
| Data Freshness | Seconds to minutes acceptable |

Common use cases:
- API response caching
- Session storage
- Feature flags
- Configuration data
- Content metadata
- Leaderboards (reads)

## Replica Read Scaling

### Setting Up Read Replicas

```
Primary (Writes) -----> Replica 1 (Reads)
                  |---> Replica 2 (Reads)
                  |---> Replica 3 (Reads)
```

#### Redis Configuration

```bash
# On replica servers
replicaof <master-ip> <master-port>

# For read-only replicas (default in Redis 7+)
replica-read-only yes

# Replica priority for failover (lower = higher priority)
replica-priority 100

# Replication settings
repl-diskless-sync yes
repl-diskless-sync-delay 5
repl-ping-replica-period 10
repl-timeout 60
```

### Python: Read Replica Client

```python
import redis
from redis import sentinel
import random
from typing import List, Optional, Any
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReadReplicaClient:
    """
    Redis client that routes reads to replicas and writes to master.
    Supports multiple load balancing strategies.
    """

    def __init__(
        self,
        master_host: str,
        master_port: int,
        replica_hosts: List[tuple],  # [(host, port), ...]
        password: str = None,
        load_balance_strategy: str = 'round_robin',  # round_robin, random, least_connections
        max_lag_ms: int = 1000,
        health_check_interval: int = 5
    ):
        self.password = password
        self.load_balance_strategy = load_balance_strategy
        self.max_lag_ms = max_lag_ms

        # Master connection for writes
        self.master = redis.Redis(
            host=master_host,
            port=master_port,
            password=password,
            decode_responses=True,
            socket_timeout=5,
            socket_connect_timeout=5
        )

        # Replica connections for reads
        self.replicas = []
        for host, port in replica_hosts:
            replica = redis.Redis(
                host=host,
                port=port,
                password=password,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            self.replicas.append({
                'client': replica,
                'host': host,
                'port': port,
                'healthy': True,
                'connections': 0,
                'last_check': 0
            })

        self._round_robin_index = 0
        self._health_check_interval = health_check_interval

    def _get_read_replica(self) -> Optional[redis.Redis]:
        """Get a healthy replica for reading."""
        healthy_replicas = [r for r in self.replicas if r['healthy']]

        if not healthy_replicas:
            logger.warning("No healthy replicas, falling back to master")
            return self.master

        if self.load_balance_strategy == 'round_robin':
            self._round_robin_index = (self._round_robin_index + 1) % len(healthy_replicas)
            return healthy_replicas[self._round_robin_index]['client']

        elif self.load_balance_strategy == 'random':
            return random.choice(healthy_replicas)['client']

        elif self.load_balance_strategy == 'least_connections':
            replica = min(healthy_replicas, key=lambda r: r['connections'])
            return replica['client']

        return healthy_replicas[0]['client']

    def check_replica_health(self):
        """Check health and replication lag of all replicas."""
        master_offset = self._get_master_offset()

        for replica in self.replicas:
            try:
                # Check if replica is responsive
                start = time.time()
                replica['client'].ping()
                latency = (time.time() - start) * 1000

                # Check replication lag
                info = replica['client'].info('replication')
                replica_offset = info.get('master_repl_offset', 0)

                lag_bytes = master_offset - replica_offset
                # Rough estimate: 1 byte = 1ms at moderate write rate
                estimated_lag_ms = lag_bytes / 1000 if lag_bytes > 0 else 0

                replica['healthy'] = latency < 100 and estimated_lag_ms < self.max_lag_ms
                replica['lag_ms'] = estimated_lag_ms
                replica['last_check'] = time.time()

                if not replica['healthy']:
                    logger.warning(
                        f"Replica {replica['host']}:{replica['port']} unhealthy: "
                        f"latency={latency:.1f}ms, lag={estimated_lag_ms:.1f}ms"
                    )

            except redis.RedisError as e:
                replica['healthy'] = False
                logger.error(f"Replica {replica['host']}:{replica['port']} error: {e}")

    def _get_master_offset(self) -> int:
        """Get master replication offset."""
        try:
            info = self.master.info('replication')
            return info.get('master_repl_offset', 0)
        except redis.RedisError:
            return 0

    # ==========================================
    # Read Operations (go to replicas)
    # ==========================================

    def get(self, key: str) -> Optional[str]:
        """Get a value from a replica."""
        replica = self._get_read_replica()
        return replica.get(key)

    def mget(self, *keys) -> List[Optional[str]]:
        """Get multiple values from a replica."""
        replica = self._get_read_replica()
        return replica.mget(*keys)

    def hget(self, name: str, key: str) -> Optional[str]:
        """Get a hash field from a replica."""
        replica = self._get_read_replica()
        return replica.hget(name, key)

    def hgetall(self, name: str) -> dict:
        """Get all hash fields from a replica."""
        replica = self._get_read_replica()
        return replica.hgetall(name)

    def smembers(self, name: str) -> set:
        """Get set members from a replica."""
        replica = self._get_read_replica()
        return replica.smembers(name)

    def zrange(self, name: str, start: int, end: int, **kwargs) -> list:
        """Get sorted set range from a replica."""
        replica = self._get_read_replica()
        return replica.zrange(name, start, end, **kwargs)

    def exists(self, *keys) -> int:
        """Check key existence on a replica."""
        replica = self._get_read_replica()
        return replica.exists(*keys)

    def lrange(self, name: str, start: int, end: int) -> list:
        """Get list range from a replica."""
        replica = self._get_read_replica()
        return replica.lrange(name, start, end)

    # ==========================================
    # Write Operations (go to master)
    # ==========================================

    def set(self, key: str, value: str, **kwargs) -> bool:
        """Set a value on master."""
        return self.master.set(key, value, **kwargs)

    def setex(self, key: str, seconds: int, value: str) -> bool:
        """Set with expiration on master."""
        return self.master.setex(key, seconds, value)

    def hset(self, name: str, key: str = None, value: str = None, mapping: dict = None) -> int:
        """Set hash fields on master."""
        if mapping:
            return self.master.hset(name, mapping=mapping)
        return self.master.hset(name, key, value)

    def sadd(self, name: str, *values) -> int:
        """Add to set on master."""
        return self.master.sadd(name, *values)

    def zadd(self, name: str, mapping: dict, **kwargs) -> int:
        """Add to sorted set on master."""
        return self.master.zadd(name, mapping, **kwargs)

    def delete(self, *keys) -> int:
        """Delete keys on master."""
        return self.master.delete(*keys)

    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on master."""
        return self.master.expire(key, seconds)

    # ==========================================
    # Read-after-write consistency
    # ==========================================

    def get_with_consistency(self, key: str, read_from_master: bool = False) -> Optional[str]:
        """
        Get with optional strong consistency (read from master).
        Use after a write when immediate consistency is needed.
        """
        if read_from_master:
            return self.master.get(key)
        return self.get(key)

    def set_and_get(self, key: str, value: str, **kwargs) -> str:
        """
        Set a value and immediately return it.
        Useful when you need write + immediate read.
        """
        self.master.set(key, value, **kwargs)
        return value  # Return the value we just wrote

    def get_stats(self) -> dict:
        """Get client statistics."""
        return {
            'master': {
                'host': self.master.connection_pool.connection_kwargs['host'],
                'port': self.master.connection_pool.connection_kwargs['port']
            },
            'replicas': [
                {
                    'host': r['host'],
                    'port': r['port'],
                    'healthy': r['healthy'],
                    'lag_ms': r.get('lag_ms', 0)
                }
                for r in self.replicas
            ],
            'load_balance_strategy': self.load_balance_strategy
        }


# Usage example
def main():
    client = ReadReplicaClient(
        master_host='localhost',
        master_port=6379,
        replica_hosts=[
            ('localhost', 6380),
            ('localhost', 6381),
            ('localhost', 6382)
        ],
        load_balance_strategy='round_robin',
        max_lag_ms=1000
    )

    # Check replica health
    client.check_replica_health()

    # Write to master
    client.set('user:1001', 'John Doe')

    # Read from replica
    value = client.get('user:1001')
    print(f"Value: {value}")

    # Read-after-write with consistency
    client.set('counter', '0')
    # Immediately read from master to ensure consistency
    current = client.get_with_consistency('counter', read_from_master=True)
    print(f"Counter: {current}")

    # Get stats
    stats = client.get_stats()
    print(f"Stats: {stats}")


if __name__ == '__main__':
    main()
```

### Node.js: Read Replica Client

```javascript
const Redis = require('ioredis');

/**
 * Redis client with read replica support
 */
class ReadReplicaClient {
    constructor(options) {
        this.masterConfig = options.master;
        this.replicaConfigs = options.replicas;
        this.loadBalanceStrategy = options.loadBalanceStrategy || 'round-robin';
        this.maxLagMs = options.maxLagMs || 1000;

        // Master connection
        this.master = new Redis({
            host: this.masterConfig.host,
            port: this.masterConfig.port,
            password: this.masterConfig.password,
            connectTimeout: 5000,
            commandTimeout: 5000
        });

        // Replica connections
        this.replicas = this.replicaConfigs.map(config => ({
            client: new Redis({
                host: config.host,
                port: config.port,
                password: config.password,
                connectTimeout: 5000,
                commandTimeout: 5000
            }),
            host: config.host,
            port: config.port,
            healthy: true,
            lagMs: 0
        }));

        this.roundRobinIndex = 0;

        // Start health checks
        this.healthCheckInterval = setInterval(
            () => this.checkReplicaHealth(),
            options.healthCheckInterval || 5000
        );
    }

    /**
     * Get a healthy replica for reading
     */
    getReadReplica() {
        const healthyReplicas = this.replicas.filter(r => r.healthy);

        if (healthyReplicas.length === 0) {
            console.warn('No healthy replicas, falling back to master');
            return this.master;
        }

        switch (this.loadBalanceStrategy) {
            case 'round-robin':
                this.roundRobinIndex = (this.roundRobinIndex + 1) % healthyReplicas.length;
                return healthyReplicas[this.roundRobinIndex].client;

            case 'random':
                const idx = Math.floor(Math.random() * healthyReplicas.length);
                return healthyReplicas[idx].client;

            case 'least-lag':
                const leastLag = healthyReplicas.reduce((a, b) =>
                    a.lagMs < b.lagMs ? a : b
                );
                return leastLag.client;

            default:
                return healthyReplicas[0].client;
        }
    }

    /**
     * Check health of all replicas
     */
    async checkReplicaHealth() {
        try {
            const masterInfo = await this.master.info('replication');
            const masterOffset = this.parseReplicationOffset(masterInfo);

            for (const replica of this.replicas) {
                try {
                    const start = Date.now();
                    await replica.client.ping();
                    const latency = Date.now() - start;

                    const replicaInfo = await replica.client.info('replication');
                    const replicaOffset = this.parseReplicationOffset(replicaInfo);

                    const lagBytes = masterOffset - replicaOffset;
                    replica.lagMs = lagBytes > 0 ? lagBytes / 1000 : 0;

                    replica.healthy = latency < 100 && replica.lagMs < this.maxLagMs;

                    if (!replica.healthy) {
                        console.warn(
                            `Replica ${replica.host}:${replica.port} unhealthy: ` +
                            `latency=${latency}ms, lag=${replica.lagMs.toFixed(1)}ms`
                        );
                    }
                } catch (err) {
                    replica.healthy = false;
                    console.error(`Replica ${replica.host}:${replica.port} error:`, err.message);
                }
            }
        } catch (err) {
            console.error('Health check error:', err.message);
        }
    }

    parseReplicationOffset(info) {
        const match = info.match(/master_repl_offset:(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    // Read operations - go to replicas
    async get(key) {
        return this.getReadReplica().get(key);
    }

    async mget(...keys) {
        return this.getReadReplica().mget(...keys);
    }

    async hget(name, key) {
        return this.getReadReplica().hget(name, key);
    }

    async hgetall(name) {
        return this.getReadReplica().hgetall(name);
    }

    async smembers(name) {
        return this.getReadReplica().smembers(name);
    }

    async zrange(name, start, stop, options) {
        return this.getReadReplica().zrange(name, start, stop, options);
    }

    async lrange(name, start, stop) {
        return this.getReadReplica().lrange(name, start, stop);
    }

    async exists(...keys) {
        return this.getReadReplica().exists(...keys);
    }

    // Write operations - go to master
    async set(key, value, ...args) {
        return this.master.set(key, value, ...args);
    }

    async setex(key, seconds, value) {
        return this.master.setex(key, seconds, value);
    }

    async hset(name, ...args) {
        return this.master.hset(name, ...args);
    }

    async sadd(name, ...values) {
        return this.master.sadd(name, ...values);
    }

    async zadd(name, ...args) {
        return this.master.zadd(name, ...args);
    }

    async del(...keys) {
        return this.master.del(...keys);
    }

    async expire(key, seconds) {
        return this.master.expire(key, seconds);
    }

    // Read from master for consistency
    async getFromMaster(key) {
        return this.master.get(key);
    }

    // Pipeline for batch reads from replica
    async batchGet(keys) {
        const replica = this.getReadReplica();
        const pipeline = replica.pipeline();

        for (const key of keys) {
            pipeline.get(key);
        }

        const results = await pipeline.exec();
        return results.map(([err, val]) => (err ? null : val));
    }

    getStats() {
        return {
            master: {
                host: this.masterConfig.host,
                port: this.masterConfig.port
            },
            replicas: this.replicas.map(r => ({
                host: r.host,
                port: r.port,
                healthy: r.healthy,
                lagMs: r.lagMs
            })),
            loadBalanceStrategy: this.loadBalanceStrategy
        };
    }

    async close() {
        clearInterval(this.healthCheckInterval);
        await this.master.quit();
        await Promise.all(this.replicas.map(r => r.client.quit()));
    }
}

// Usage
async function main() {
    const client = new ReadReplicaClient({
        master: { host: 'localhost', port: 6379 },
        replicas: [
            { host: 'localhost', port: 6380 },
            { host: 'localhost', port: 6381 }
        ],
        loadBalanceStrategy: 'round-robin',
        maxLagMs: 1000,
        healthCheckInterval: 5000
    });

    // Write to master
    await client.set('key1', 'value1');

    // Read from replica
    const value = await client.get('key1');
    console.log('Value:', value);

    // Batch read
    await client.set('key2', 'value2');
    await client.set('key3', 'value3');

    const values = await client.batchGet(['key1', 'key2', 'key3']);
    console.log('Batch values:', values);

    console.log('Stats:', client.getStats());

    await client.close();
}

main().catch(console.error);
```

## Client-Side Caching

Redis 6+ supports server-assisted client-side caching with tracking.

### Python Implementation

```python
import redis
import threading
from typing import Dict, Any, Optional, Callable
import time
from collections import OrderedDict

class ClientSideCache:
    """
    Client-side caching with Redis server-assisted invalidation.
    Uses RESP3 protocol and client tracking.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        max_size: int = 10000,
        default_ttl: int = 300
    ):
        self.redis = redis_client
        self.max_size = max_size
        self.default_ttl = default_ttl

        # LRU cache using OrderedDict
        self._cache: OrderedDict = OrderedDict()
        self._cache_times: Dict[str, float] = {}
        self._lock = threading.Lock()

        # Stats
        self.hits = 0
        self.misses = 0
        self.invalidations = 0

    def get(self, key: str, ttl: int = None) -> Optional[Any]:
        """Get value from cache or Redis."""
        with self._lock:
            # Check local cache first
            if key in self._cache:
                # Check TTL
                cache_time = self._cache_times.get(key, 0)
                max_age = ttl or self.default_ttl

                if time.time() - cache_time < max_age:
                    # Move to end (most recently used)
                    self._cache.move_to_end(key)
                    self.hits += 1
                    return self._cache[key]
                else:
                    # Expired, remove from cache
                    del self._cache[key]
                    del self._cache_times[key]

            self.misses += 1

        # Fetch from Redis
        value = self.redis.get(key)

        if value is not None:
            self._add_to_cache(key, value)

        return value

    def _add_to_cache(self, key: str, value: Any):
        """Add item to cache with LRU eviction."""
        with self._lock:
            # Evict if at capacity
            while len(self._cache) >= self.max_size:
                oldest = next(iter(self._cache))
                del self._cache[oldest]
                del self._cache_times[oldest]

            self._cache[key] = value
            self._cache_times[key] = time.time()

    def invalidate(self, key: str):
        """Invalidate a key from the local cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                del self._cache_times[key]
                self.invalidations += 1

    def invalidate_prefix(self, prefix: str):
        """Invalidate all keys with a prefix."""
        with self._lock:
            keys_to_remove = [k for k in self._cache if k.startswith(prefix)]
            for key in keys_to_remove:
                del self._cache[key]
                del self._cache_times[key]
                self.invalidations += 1

    def set(self, key: str, value: Any, ex: int = None) -> bool:
        """Set value in Redis and local cache."""
        result = self.redis.set(key, value, ex=ex)
        if result:
            self._add_to_cache(key, value)
        return result

    def delete(self, key: str) -> int:
        """Delete from Redis and invalidate local cache."""
        result = self.redis.delete(key)
        self.invalidate(key)
        return result

    def mget(self, *keys) -> list:
        """Get multiple values with caching."""
        results = []
        keys_to_fetch = []
        key_indices = {}

        with self._lock:
            for i, key in enumerate(keys):
                if key in self._cache:
                    cache_time = self._cache_times.get(key, 0)
                    if time.time() - cache_time < self.default_ttl:
                        self._cache.move_to_end(key)
                        self.hits += 1
                        results.append(self._cache[key])
                        continue

                self.misses += 1
                keys_to_fetch.append(key)
                key_indices[key] = i
                results.append(None)

        # Fetch missing keys from Redis
        if keys_to_fetch:
            values = self.redis.mget(*keys_to_fetch)
            for key, value in zip(keys_to_fetch, values):
                if value is not None:
                    self._add_to_cache(key, value)
                results[key_indices[key]] = value

        return results

    def get_stats(self) -> dict:
        """Get cache statistics."""
        with self._lock:
            total = self.hits + self.misses
            hit_rate = self.hits / total if total > 0 else 0

            return {
                'size': len(self._cache),
                'max_size': self.max_size,
                'hits': self.hits,
                'misses': self.misses,
                'hit_rate': hit_rate,
                'invalidations': self.invalidations
            }

    def clear(self):
        """Clear the local cache."""
        with self._lock:
            self._cache.clear()
            self._cache_times.clear()


class ServerAssistedCache:
    """
    Client-side cache with server-assisted invalidation using Redis 6+ tracking.
    """

    def __init__(
        self,
        host: str = 'localhost',
        port: int = 6379,
        password: str = None,
        max_size: int = 10000
    ):
        # Main connection for commands
        self.redis = redis.Redis(
            host=host,
            port=port,
            password=password,
            decode_responses=True
        )

        # Tracking connection for invalidation messages
        self.tracking_conn = redis.Redis(
            host=host,
            port=port,
            password=password,
            decode_responses=True
        )

        self._cache: Dict[str, Any] = {}
        self._lock = threading.Lock()
        self._running = False
        self._tracking_thread = None
        self.max_size = max_size

    def start_tracking(self):
        """Start the tracking subscriber."""
        # Enable client tracking with BCAST mode
        # This makes Redis broadcast invalidations for all tracked keys
        client_id = self.redis.client_id()

        # Subscribe to invalidation channel
        self.pubsub = self.tracking_conn.pubsub()
        self.pubsub.subscribe('__redis__:invalidate')

        # Enable tracking
        self.redis.execute_command(
            'CLIENT', 'TRACKING', 'ON',
            'REDIRECT', client_id,
            'BCAST', 'PREFIX', ''  # Track all keys
        )

        self._running = True
        self._tracking_thread = threading.Thread(
            target=self._invalidation_listener,
            daemon=True
        )
        self._tracking_thread.start()

    def _invalidation_listener(self):
        """Listen for invalidation messages."""
        while self._running:
            try:
                message = self.pubsub.get_message(timeout=1)
                if message and message['type'] == 'message':
                    # message['data'] contains the invalidated key
                    key = message['data']
                    if key:
                        self._invalidate(key)
            except Exception as e:
                print(f"Invalidation listener error: {e}")

    def _invalidate(self, key: str):
        """Remove key from local cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]

    def get(self, key: str) -> Optional[Any]:
        """Get with local cache."""
        with self._lock:
            if key in self._cache:
                return self._cache[key]

        value = self.redis.get(key)
        if value is not None:
            with self._lock:
                if len(self._cache) >= self.max_size:
                    # Simple eviction - remove first item
                    first_key = next(iter(self._cache))
                    del self._cache[first_key]
                self._cache[key] = value

        return value

    def stop_tracking(self):
        """Stop tracking and clean up."""
        self._running = False
        self.redis.execute_command('CLIENT', 'TRACKING', 'OFF')
        if self._tracking_thread:
            self._tracking_thread.join(timeout=5)
        self.pubsub.close()


# Usage example
client = redis.Redis(decode_responses=True)
cache = ClientSideCache(client, max_size=10000, default_ttl=60)

# First read - cache miss, fetches from Redis
value = cache.get('user:1001')

# Second read - cache hit
value = cache.get('user:1001')

# Write updates both Redis and local cache
cache.set('user:1001', 'updated_value', ex=300)

# Get stats
print(cache.get_stats())
```

## Data Structure Optimization for Reads

### Choosing the Right Data Structure

```python
import redis
import json
import time
from typing import Dict, Any, List

class ReadOptimizedStorage:
    """
    Examples of read-optimized data structures.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    # ==========================================
    # Strategy 1: Pre-computed Aggregations
    # ==========================================

    def store_user_with_stats(self, user_id: str, user_data: dict):
        """
        Store user data with pre-computed stats for fast reads.
        Instead of computing stats on read, compute on write.
        """
        # Store raw user data
        self.redis.hset(f"user:{user_id}", mapping=user_data)

        # Pre-compute and store aggregations
        stats = {
            'total_orders': user_data.get('orders_count', 0),
            'total_spent': user_data.get('total_spent', 0),
            'avg_order_value': (
                user_data.get('total_spent', 0) /
                max(user_data.get('orders_count', 1), 1)
            ),
            'member_days': (
                time.time() - user_data.get('created_at', time.time())
            ) // 86400
        }
        self.redis.hset(f"user:{user_id}:stats", mapping={
            k: str(v) for k, v in stats.items()
        })

    def get_user_stats_fast(self, user_id: str) -> dict:
        """
        Get pre-computed stats - single O(1) operation.
        Much faster than computing on the fly.
        """
        return self.redis.hgetall(f"user:{user_id}:stats")

    # ==========================================
    # Strategy 2: Denormalized Data
    # ==========================================

    def store_order_denormalized(self, order_id: str, order: dict):
        """
        Store denormalized order data for fast reads.
        Includes user and product info directly.
        """
        # Denormalized order includes everything needed for display
        denormalized = {
            'order_id': order_id,
            'status': order['status'],
            'total': str(order['total']),
            'created_at': order['created_at'],
            # Embedded user info (denormalized)
            'user_id': order['user_id'],
            'user_name': order['user_name'],
            'user_email': order['user_email'],
            # Embedded product info (denormalized)
            'items': json.dumps(order['items'])  # Full item details
        }

        self.redis.hset(f"order:{order_id}", mapping=denormalized)

    def get_order_fast(self, order_id: str) -> dict:
        """
        Get complete order info in single read.
        No need to join with user/product data.
        """
        data = self.redis.hgetall(f"order:{order_id}")
        if data:
            data['items'] = json.loads(data['items'])
        return data

    # ==========================================
    # Strategy 3: Indexed Lookups
    # ==========================================

    def create_user_indexes(self, user_id: str, user: dict):
        """
        Create secondary indexes for fast lookups.
        """
        pipe = self.redis.pipeline()

        # Primary data
        pipe.hset(f"user:{user_id}", mapping=user)

        # Email index for lookup
        pipe.set(f"user:email:{user['email']}", user_id)

        # Username index
        pipe.set(f"user:username:{user['username']}", user_id)

        # Region index (set for multiple users per region)
        pipe.sadd(f"users:region:{user['region']}", user_id)

        # Score-based index for sorting
        pipe.zadd('users:by_score', {user_id: float(user['score'])})

        pipe.execute()

    def get_user_by_email(self, email: str) -> dict:
        """
        Fast lookup by email using index.
        """
        user_id = self.redis.get(f"user:email:{email}")
        if user_id:
            return self.redis.hgetall(f"user:{user_id}")
        return None

    def get_users_by_region(self, region: str, limit: int = 100) -> List[dict]:
        """
        Get all users in a region.
        """
        user_ids = self.redis.srandmember(f"users:region:{region}", limit)
        if not user_ids:
            return []

        pipe = self.redis.pipeline()
        for user_id in user_ids:
            pipe.hgetall(f"user:{user_id}")

        return pipe.execute()

    def get_top_users(self, limit: int = 10) -> List[dict]:
        """
        Get top users by score using sorted set.
        """
        user_ids = self.redis.zrevrange('users:by_score', 0, limit - 1)

        pipe = self.redis.pipeline()
        for user_id in user_ids:
            pipe.hgetall(f"user:{user_id}")

        return pipe.execute()

    # ==========================================
    # Strategy 4: Compressed Strings vs Hashes
    # ==========================================

    def store_config_as_json(self, config_name: str, config: dict):
        """
        Store configuration as JSON string.
        Better for small configs read as a whole.
        """
        self.redis.set(
            f"config:{config_name}",
            json.dumps(config),
            ex=3600
        )

    def get_config_fast(self, config_name: str) -> dict:
        """
        Get entire config in one read.
        """
        data = self.redis.get(f"config:{config_name}")
        return json.loads(data) if data else None

    def store_config_as_hash(self, config_name: str, config: dict):
        """
        Store configuration as hash.
        Better for large configs with partial reads.
        """
        flat_config = {}
        for k, v in config.items():
            if isinstance(v, (dict, list)):
                flat_config[k] = json.dumps(v)
            else:
                flat_config[k] = str(v)

        self.redis.hset(f"config:{config_name}:hash", mapping=flat_config)

    def get_config_field(self, config_name: str, field: str) -> Any:
        """
        Get single config field - O(1).
        """
        value = self.redis.hget(f"config:{config_name}:hash", field)
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value


# Usage
client = redis.Redis(decode_responses=True)
storage = ReadOptimizedStorage(client)

# Pre-computed stats
storage.store_user_with_stats('user:1001', {
    'name': 'John Doe',
    'orders_count': 50,
    'total_spent': 5000,
    'created_at': time.time() - 365 * 86400
})

stats = storage.get_user_stats_fast('user:1001')
print(f"User stats (fast read): {stats}")
```

## Configuration Tuning

### Redis Configuration for Read-Heavy Workloads

```bash
# redis.conf optimizations for read-heavy workloads

# Network
tcp-keepalive 300
timeout 0

# Memory - allocate more for data
maxmemory 8gb
maxmemory-policy allkeys-lru

# Disable persistence for pure cache (faster)
# save ""
# appendonly no

# Or use less frequent persistence
save 900 1
save 300 10
appendonly no

# Increase client buffer limits
client-output-buffer-limit normal 256mb 128mb 60
client-output-buffer-limit replica 512mb 256mb 60

# Lazy freeing for faster operations
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes

# Disable slow operations
slowlog-log-slower-than 10000
slowlog-max-len 128

# Active rehashing for large datasets
activerehashing yes

# For replica reads
replica-serve-stale-data yes
replica-read-only yes

# Faster replica sync
repl-diskless-sync yes
```

### Kernel Tuning

```bash
# /etc/sysctl.conf additions for read-heavy Redis

# Increase max connections
net.core.somaxconn = 65535

# Increase network buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Disable transparent huge pages
echo never > /sys/kernel/mm/transparent_hugepage/enabled

# Increase file descriptor limits
# /etc/security/limits.conf
# redis soft nofile 65535
# redis hard nofile 65535
```

## Monitoring Read Performance

```python
import redis
import time
from typing import Dict

def monitor_read_performance(client: redis.Redis, duration: int = 60) -> Dict:
    """
    Monitor Redis read performance metrics.
    """
    # Get initial stats
    initial_info = client.info()

    time.sleep(duration)

    # Get final stats
    final_info = client.info()

    # Calculate metrics
    reads = final_info['total_reads_processed'] - initial_info.get('total_reads_processed', 0)
    writes = final_info['total_writes_processed'] - initial_info.get('total_writes_processed', 0)

    keyspace_hits = final_info['keyspace_hits'] - initial_info['keyspace_hits']
    keyspace_misses = final_info['keyspace_misses'] - initial_info['keyspace_misses']

    total_commands = final_info['total_commands_processed'] - initial_info['total_commands_processed']

    return {
        'duration_seconds': duration,
        'read_write_ratio': reads / max(writes, 1),
        'ops_per_second': total_commands / duration,
        'hit_rate': keyspace_hits / max(keyspace_hits + keyspace_misses, 1),
        'keyspace_hits': keyspace_hits,
        'keyspace_misses': keyspace_misses,
        'connected_clients': final_info['connected_clients'],
        'used_memory_human': final_info['used_memory_human'],
        'instantaneous_input_kbps': final_info.get('instantaneous_input_kbps', 0),
        'instantaneous_output_kbps': final_info.get('instantaneous_output_kbps', 0)
    }


# Usage
client = redis.Redis()
metrics = monitor_read_performance(client, duration=60)
print(f"Read performance metrics: {metrics}")
```

## Summary

Optimizing Redis for read-heavy workloads involves:

1. **Replica Read Scaling** - Distribute reads across replicas
2. **Client-Side Caching** - Reduce round-trips with local cache
3. **Data Structure Selection** - Use appropriate structures for access patterns
4. **Pre-computation** - Calculate aggregations on write, not read
5. **Denormalization** - Include related data to avoid multiple reads
6. **Connection Pooling** - Reuse connections efficiently
7. **Configuration Tuning** - Optimize Redis and OS settings

Key metrics to monitor:
- Hit rate (target > 90%)
- Read latency (p99 < 1ms)
- Operations per second
- Replica lag
- Memory usage
