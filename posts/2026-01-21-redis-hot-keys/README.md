# How to Handle Hot Keys in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hot Keys, Performance, Scalability, Caching, Load Distribution, High Traffic

Description: A comprehensive guide to detecting and mitigating hot keys in Redis, covering identification techniques, local caching strategies, key splitting, read replicas, and architectural patterns for handling high-traffic keys.

---

Hot keys - keys that receive a disproportionately high volume of requests - can become a major performance bottleneck in Redis deployments. A single hot key can overwhelm a Redis node, causing latency spikes and degraded performance for all clients. This guide covers detection, mitigation, and prevention strategies for hot key issues.

## Understanding Hot Keys

### What Are Hot Keys?

Hot keys are keys that receive significantly more traffic than others, creating an uneven load distribution:

```
Normal Distribution:           Hot Key Scenario:
Key A: 5% traffic              Key A: 60% traffic  <-- Hot Key!
Key B: 5% traffic              Key B: 10% traffic
Key C: 5% traffic              Key C: 10% traffic
Key D: 5% traffic              Key D: 5% traffic
...                            ...
```

### Common Causes

| Cause | Example |
|-------|---------|
| Viral content | Trending post, breaking news article |
| Flash sales | Popular product during sale event |
| Global counters | Site-wide view counter, rate limiter |
| Configuration | Frequently accessed feature flags |
| Session data | Celebrity/influencer session |
| Leaderboards | Top of global leaderboard |

### Impact of Hot Keys

1. **Single-node bottleneck** - One Redis node handles all requests
2. **Increased latency** - Queue buildup for hot key operations
3. **Network saturation** - Large values amplify bandwidth issues
4. **Cluster imbalance** - Hot key's slot receives disproportionate load
5. **Cascading failures** - Hot key node failure affects many requests

## Detecting Hot Keys

### Using Redis Commands

```python
import redis
import time
from collections import Counter
from typing import Dict, List, Tuple
import threading

class HotKeyDetector:
    """
    Detect hot keys using various Redis techniques.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def detect_with_monitor(self, duration: int = 10) -> Dict[str, int]:
        """
        Use MONITOR command to detect hot keys.
        WARNING: MONITOR impacts performance - use only for debugging.
        """
        key_counts = Counter()
        stop_time = time.time() + duration

        # Note: This is a simplified example
        # In production, use redis-cli or dedicated tools
        with self.redis.monitor() as monitor:
            for command in monitor.listen():
                if time.time() > stop_time:
                    break

                if isinstance(command, dict):
                    cmd = command.get('command', '')
                    # Extract key from common commands
                    parts = cmd.split()
                    if len(parts) >= 2:
                        command_name = parts[0].upper()
                        if command_name in ['GET', 'SET', 'HGET', 'HSET', 'INCR', 'ZADD']:
                            key = parts[1]
                            key_counts[key] += 1

        return dict(key_counts.most_common(20))

    def detect_with_slowlog(self, min_count: int = 10) -> List[Dict]:
        """
        Analyze SLOWLOG for frequently slow keys.
        """
        # Get slowlog entries
        slowlog = self.redis.slowlog_get(1000)

        key_stats = Counter()
        for entry in slowlog:
            # entry format: [id, timestamp, duration, command]
            command = entry.get('command', [])
            if len(command) >= 2:
                key = command[1]
                if isinstance(key, bytes):
                    key = key.decode()
                key_stats[key] += 1

        # Return keys appearing frequently in slowlog
        hot_keys = [
            {'key': key, 'slowlog_count': count}
            for key, count in key_stats.items()
            if count >= min_count
        ]

        return sorted(hot_keys, key=lambda x: x['slowlog_count'], reverse=True)

    def detect_with_keyspace_notifications(self, patterns: List[str], duration: int = 60) -> Dict[str, int]:
        """
        Use keyspace notifications to track key access.
        Requires: notify-keyspace-events = "KEA"
        """
        key_counts = Counter()
        pubsub = self.redis.pubsub()

        # Subscribe to keyspace events for patterns
        for pattern in patterns:
            pubsub.psubscribe(f'__keyspace@0__:{pattern}')

        stop_time = time.time() + duration
        while time.time() < stop_time:
            message = pubsub.get_message(timeout=1)
            if message and message['type'] == 'pmessage':
                # Extract key from channel name
                channel = message['channel']
                if isinstance(channel, bytes):
                    channel = channel.decode()
                key = channel.split(':', 1)[1] if ':' in channel else channel
                key_counts[key] += 1

        pubsub.close()
        return dict(key_counts.most_common(50))

    def analyze_memory_by_pattern(self, patterns: List[str], sample_size: int = 1000) -> Dict[str, Dict]:
        """
        Analyze memory usage by key pattern to find large/hot keys.
        """
        results = {}

        for pattern in patterns:
            cursor = 0
            keys_analyzed = 0
            total_memory = 0
            largest_key = None
            largest_memory = 0

            while keys_analyzed < sample_size:
                cursor, keys = self.redis.scan(cursor, match=pattern, count=100)

                for key in keys:
                    try:
                        memory = self.redis.memory_usage(key) or 0
                        total_memory += memory
                        keys_analyzed += 1

                        if memory > largest_memory:
                            largest_memory = memory
                            largest_key = key

                        if keys_analyzed >= sample_size:
                            break
                    except redis.ResponseError:
                        continue

                if cursor == 0:
                    break

            if keys_analyzed > 0:
                results[pattern] = {
                    'keys_analyzed': keys_analyzed,
                    'total_memory': total_memory,
                    'avg_memory': total_memory / keys_analyzed,
                    'largest_key': largest_key,
                    'largest_memory': largest_memory
                }

        return results

    def get_big_keys_sample(self, count: int = 100) -> List[Dict]:
        """
        Sample keys and check for unusually large ones.
        """
        big_keys = []
        cursor = 0
        checked = 0

        while checked < count * 10:  # Check more keys to find big ones
            cursor, keys = self.redis.scan(cursor, count=100)

            for key in keys:
                try:
                    memory = self.redis.memory_usage(key)
                    if memory and memory > 10240:  # > 10KB
                        key_type = self.redis.type(key)
                        big_keys.append({
                            'key': key,
                            'type': key_type,
                            'memory_bytes': memory
                        })

                    checked += 1
                    if len(big_keys) >= count:
                        break
                except redis.ResponseError:
                    continue

            if cursor == 0 or len(big_keys) >= count:
                break

        return sorted(big_keys, key=lambda x: x['memory_bytes'], reverse=True)


# Usage
client = redis.Redis(decode_responses=True)
detector = HotKeyDetector(client)

# Analyze memory by pattern
patterns = ['user:*', 'session:*', 'cache:*', 'counter:*']
memory_analysis = detector.analyze_memory_by_pattern(patterns)
for pattern, stats in memory_analysis.items():
    print(f"{pattern}: avg={stats['avg_memory']:.0f}B, largest={stats['largest_key']}")

# Find big keys
big_keys = detector.get_big_keys_sample(20)
for key_info in big_keys[:10]:
    print(f"Big key: {key_info['key']} - {key_info['memory_bytes']} bytes")
```

### Node.js Detection

```javascript
const Redis = require('ioredis');

/**
 * Hot key detection utilities for Node.js
 */
class HotKeyDetector {
    constructor(redis) {
        this.redis = redis;
        this.accessCounts = new Map();
        this.isTracking = false;
    }

    /**
     * Start tracking key access patterns using a proxy
     */
    startTracking() {
        this.isTracking = true;
        this.accessCounts.clear();

        // Override common read methods to track access
        const originalGet = this.redis.get.bind(this.redis);
        const originalHgetall = this.redis.hgetall.bind(this.redis);
        const originalZrange = this.redis.zrange.bind(this.redis);

        const self = this;

        this.redis.get = async function(key) {
            self.recordAccess(key);
            return originalGet(key);
        };

        this.redis.hgetall = async function(key) {
            self.recordAccess(key);
            return originalHgetall(key);
        };

        this.redis.zrange = async function(key, start, stop, ...args) {
            self.recordAccess(key);
            return originalZrange(key, start, stop, ...args);
        };

        this._originalMethods = { get: originalGet, hgetall: originalHgetall, zrange: originalZrange };
    }

    recordAccess(key) {
        if (!this.isTracking) return;

        const count = this.accessCounts.get(key) || 0;
        this.accessCounts.set(key, count + 1);
    }

    /**
     * Stop tracking and get results
     */
    stopTracking() {
        this.isTracking = false;

        if (this._originalMethods) {
            this.redis.get = this._originalMethods.get;
            this.redis.hgetall = this._originalMethods.hgetall;
            this.redis.zrange = this._originalMethods.zrange;
        }

        // Sort by access count
        const sorted = [...this.accessCounts.entries()]
            .sort((a, b) => b[1] - a[1]);

        return sorted.slice(0, 50);
    }

    /**
     * Analyze keys for potential hotspots
     */
    async analyzeKeyPatterns(patterns, sampleSize = 1000) {
        const results = {};

        for (const pattern of patterns) {
            let cursor = '0';
            let keysAnalyzed = 0;
            let totalMemory = 0;
            let largestKey = null;
            let largestMemory = 0;

            do {
                const [nextCursor, keys] = await this.redis.scan(
                    cursor, 'MATCH', pattern, 'COUNT', 100
                );
                cursor = nextCursor;

                for (const key of keys) {
                    if (keysAnalyzed >= sampleSize) break;

                    try {
                        const memory = await this.redis.memory('USAGE', key);
                        if (memory) {
                            totalMemory += memory;
                            if (memory > largestMemory) {
                                largestMemory = memory;
                                largestKey = key;
                            }
                        }
                        keysAnalyzed++;
                    } catch (err) {
                        // Key might have been deleted
                    }
                }
            } while (cursor !== '0' && keysAnalyzed < sampleSize);

            if (keysAnalyzed > 0) {
                results[pattern] = {
                    keysAnalyzed,
                    totalMemory,
                    avgMemory: Math.round(totalMemory / keysAnalyzed),
                    largestKey,
                    largestMemory
                };
            }
        }

        return results;
    }

    /**
     * Check cluster slot distribution
     */
    async checkClusterBalance() {
        if (!this.redis.cluster) {
            return { error: 'Not a cluster connection' };
        }

        const nodes = this.redis.nodes('master');
        const nodeStats = [];

        for (const node of nodes) {
            try {
                const info = await node.info('keyspace');
                const memory = await node.info('memory');

                const dbInfo = info.match(/db0:keys=(\d+)/);
                const keyCount = dbInfo ? parseInt(dbInfo[1]) : 0;

                const memMatch = memory.match(/used_memory:(\d+)/);
                const usedMemory = memMatch ? parseInt(memMatch[1]) : 0;

                nodeStats.push({
                    host: node.options.host,
                    port: node.options.port,
                    keys: keyCount,
                    memory: usedMemory
                });
            } catch (err) {
                console.error(`Error checking node:`, err.message);
            }
        }

        // Calculate imbalance
        const avgKeys = nodeStats.reduce((sum, n) => sum + n.keys, 0) / nodeStats.length;
        const avgMemory = nodeStats.reduce((sum, n) => sum + n.memory, 0) / nodeStats.length;

        return {
            nodes: nodeStats,
            avgKeys,
            avgMemory,
            maxKeyImbalance: Math.max(...nodeStats.map(n => Math.abs(n.keys - avgKeys) / avgKeys)),
            maxMemoryImbalance: Math.max(...nodeStats.map(n => Math.abs(n.memory - avgMemory) / avgMemory))
        };
    }
}

// Usage
async function main() {
    const redis = new Redis();
    const detector = new HotKeyDetector(redis);

    // Analyze key patterns
    const analysis = await detector.analyzeKeyPatterns([
        'user:*',
        'session:*',
        'cache:*',
        'counter:*'
    ]);

    console.log('Pattern analysis:', analysis);

    await redis.quit();
}

main().catch(console.error);
```

## Mitigation Strategies

### 1. Local Caching (Client-Side Cache)

```python
import redis
import time
import threading
from typing import Any, Optional, Dict
from collections import OrderedDict
import hashlib

class LocalCacheLayer:
    """
    Local in-memory cache to reduce hot key pressure on Redis.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        local_ttl: int = 10,  # Short TTL for local cache
        max_local_size: int = 10000,
        hot_key_threshold: int = 100  # Requests per second to consider "hot"
    ):
        self.redis = redis_client
        self.local_ttl = local_ttl
        self.max_local_size = max_local_size
        self.hot_key_threshold = hot_key_threshold

        # Local cache: key -> (value, expire_time)
        self._local_cache: OrderedDict = OrderedDict()
        self._cache_lock = threading.Lock()

        # Access tracking for hot key detection
        self._access_counts: Dict[str, int] = {}
        self._access_window_start = time.time()
        self._access_lock = threading.Lock()

    def _is_hot_key(self, key: str) -> bool:
        """Check if a key is considered hot."""
        with self._access_lock:
            # Reset window every second
            now = time.time()
            if now - self._access_window_start > 1:
                self._access_counts.clear()
                self._access_window_start = now

            count = self._access_counts.get(key, 0)
            return count >= self.hot_key_threshold

    def _track_access(self, key: str):
        """Track key access for hot key detection."""
        with self._access_lock:
            self._access_counts[key] = self._access_counts.get(key, 0) + 1

    def _get_local(self, key: str) -> Optional[Any]:
        """Get from local cache if valid."""
        with self._cache_lock:
            if key in self._local_cache:
                value, expire_time = self._local_cache[key]
                if time.time() < expire_time:
                    # Move to end (LRU)
                    self._local_cache.move_to_end(key)
                    return value
                else:
                    # Expired
                    del self._local_cache[key]
            return None

    def _set_local(self, key: str, value: Any, ttl: int = None):
        """Set in local cache."""
        if ttl is None:
            ttl = self.local_ttl

        with self._cache_lock:
            # Evict if at capacity
            while len(self._local_cache) >= self.max_local_size:
                self._local_cache.popitem(last=False)

            self._local_cache[key] = (value, time.time() + ttl)

    def get(self, key: str) -> Optional[str]:
        """
        Get with local caching for hot keys.
        """
        self._track_access(key)

        # Check local cache first
        local_value = self._get_local(key)
        if local_value is not None:
            return local_value

        # Fetch from Redis
        value = self.redis.get(key)

        # Cache locally if hot key
        if value is not None and self._is_hot_key(key):
            self._set_local(key, value)

        return value

    def get_with_jitter(self, key: str, base_ttl: int = 10) -> Optional[str]:
        """
        Get with jittered local TTL to prevent thundering herd.
        """
        import random

        self._track_access(key)

        local_value = self._get_local(key)
        if local_value is not None:
            return local_value

        value = self.redis.get(key)

        if value is not None and self._is_hot_key(key):
            # Add jitter: 80-120% of base TTL
            jittered_ttl = int(base_ttl * (0.8 + random.random() * 0.4))
            self._set_local(key, value, jittered_ttl)

        return value

    def set(self, key: str, value: str, ex: int = None):
        """Set value and invalidate local cache."""
        result = self.redis.set(key, value, ex=ex)
        # Invalidate local cache on write
        with self._cache_lock:
            if key in self._local_cache:
                del self._local_cache[key]
        return result

    def get_stats(self) -> dict:
        """Get cache statistics."""
        with self._cache_lock:
            local_size = len(self._local_cache)

        with self._access_lock:
            hot_keys = [
                k for k, v in self._access_counts.items()
                if v >= self.hot_key_threshold
            ]

        return {
            'local_cache_size': local_size,
            'max_local_size': self.max_local_size,
            'current_hot_keys': hot_keys[:10],
            'hot_key_count': len(hot_keys)
        }


# Usage
client = redis.Redis(decode_responses=True)
cache = LocalCacheLayer(client, local_ttl=5, hot_key_threshold=50)

# Set a value
cache.set('popular_item', 'item_data')

# Get with local caching for hot keys
for _ in range(100):  # Simulate high traffic
    value = cache.get('popular_item')

print(cache.get_stats())
```

### 2. Key Splitting/Sharding

```python
import redis
import random
import hashlib
from typing import List, Optional

class KeySplitter:
    """
    Split hot keys across multiple physical keys to distribute load.
    """

    def __init__(self, redis_client: redis.Redis, num_shards: int = 10):
        self.redis = redis_client
        self.num_shards = num_shards

    def _get_shard(self, key: str, index: int = None) -> str:
        """Get a specific shard key or random one for reads."""
        if index is not None:
            return f"{key}:shard:{index}"
        # Random shard for reads
        return f"{key}:shard:{random.randint(0, self.num_shards - 1)}"

    def _get_all_shards(self, key: str) -> List[str]:
        """Get all shard keys."""
        return [f"{key}:shard:{i}" for i in range(self.num_shards)]

    # ==========================================
    # Strategy 1: Counter Sharding
    # ==========================================

    def increment_sharded(self, key: str, amount: int = 1) -> int:
        """
        Increment a sharded counter.
        Spreads writes across shards.
        """
        shard_key = self._get_shard(key)
        return self.redis.incrby(shard_key, amount)

    def get_counter_total(self, key: str) -> int:
        """
        Get total counter value by summing all shards.
        """
        shard_keys = self._get_all_shards(key)
        pipe = self.redis.pipeline()

        for shard_key in shard_keys:
            pipe.get(shard_key)

        values = pipe.execute()
        return sum(int(v) for v in values if v)

    # ==========================================
    # Strategy 2: Read Distribution
    # ==========================================

    def set_replicated(self, key: str, value: str, ex: int = None):
        """
        Write to all shards (replicate data).
        """
        pipe = self.redis.pipeline()

        for i in range(self.num_shards):
            shard_key = self._get_shard(key, i)
            if ex:
                pipe.setex(shard_key, ex, value)
            else:
                pipe.set(shard_key, value)

        pipe.execute()

    def get_random_shard(self, key: str) -> Optional[str]:
        """
        Read from a random shard (load distribution).
        """
        shard_key = self._get_shard(key)
        return self.redis.get(shard_key)

    # ==========================================
    # Strategy 3: Hash-Based Sharding
    # ==========================================

    def get_consistent_shard(self, key: str, sub_key: str) -> str:
        """
        Get a consistent shard based on sub_key hash.
        Same sub_key always goes to same shard.
        """
        hash_val = int(hashlib.md5(sub_key.encode()).hexdigest(), 16)
        shard_idx = hash_val % self.num_shards
        return self._get_shard(key, shard_idx)

    def set_by_hash(self, key: str, sub_key: str, value: str, ex: int = None):
        """Set value to hash-determined shard."""
        shard_key = self.get_consistent_shard(key, sub_key)
        if ex:
            return self.redis.setex(shard_key, ex, value)
        return self.redis.set(shard_key, value)

    def get_by_hash(self, key: str, sub_key: str) -> Optional[str]:
        """Get value from hash-determined shard."""
        shard_key = self.get_consistent_shard(key, sub_key)
        return self.redis.get(shard_key)

    # ==========================================
    # Strategy 4: Set/List Sharding
    # ==========================================

    def sadd_sharded(self, key: str, *members):
        """Add members to sharded set."""
        pipe = self.redis.pipeline()

        for member in members:
            hash_val = int(hashlib.md5(str(member).encode()).hexdigest(), 16)
            shard_idx = hash_val % self.num_shards
            shard_key = self._get_shard(key, shard_idx)
            pipe.sadd(shard_key, member)

        pipe.execute()

    def smembers_sharded(self, key: str) -> set:
        """Get all members from all shards."""
        shard_keys = self._get_all_shards(key)
        pipe = self.redis.pipeline()

        for shard_key in shard_keys:
            pipe.smembers(shard_key)

        results = pipe.execute()
        all_members = set()
        for members in results:
            if members:
                all_members.update(members)

        return all_members

    def sismember_sharded(self, key: str, member: str) -> bool:
        """Check membership in sharded set."""
        hash_val = int(hashlib.md5(str(member).encode()).hexdigest(), 16)
        shard_idx = hash_val % self.num_shards
        shard_key = self._get_shard(key, shard_idx)
        return self.redis.sismember(shard_key, member)


# Usage
client = redis.Redis(decode_responses=True)
splitter = KeySplitter(client, num_shards=10)

# Sharded counter
for _ in range(1000):
    splitter.increment_sharded('pageviews')

total = splitter.get_counter_total('pageviews')
print(f"Total pageviews: {total}")

# Replicated read-heavy data
splitter.set_replicated('config:feature_flags', '{"dark_mode": true}')
config = splitter.get_random_shard('config:feature_flags')
print(f"Config: {config}")
```

### 3. Read Replicas for Hot Keys

```python
import redis
import random
from typing import List, Optional, Set

class HotKeyReplicaRouter:
    """
    Route hot key reads to replicas to reduce master load.
    """

    def __init__(
        self,
        master: redis.Redis,
        replicas: List[redis.Redis],
        hot_keys: Set[str] = None
    ):
        self.master = master
        self.replicas = replicas
        self.hot_keys = hot_keys or set()
        self._replica_index = 0

    def add_hot_key(self, key: str):
        """Mark a key as hot."""
        self.hot_keys.add(key)

    def remove_hot_key(self, key: str):
        """Remove key from hot list."""
        self.hot_keys.discard(key)

    def _get_replica(self) -> redis.Redis:
        """Get next replica (round-robin)."""
        if not self.replicas:
            return self.master

        self._replica_index = (self._replica_index + 1) % len(self.replicas)
        return self.replicas[self._replica_index]

    def get(self, key: str) -> Optional[str]:
        """
        Get value - route hot keys to replicas.
        """
        if key in self.hot_keys or self._matches_hot_pattern(key):
            return self._get_replica().get(key)
        return self.master.get(key)

    def _matches_hot_pattern(self, key: str) -> bool:
        """Check if key matches any hot key pattern."""
        hot_patterns = ['trending:', 'popular:', 'viral:', 'featured:']
        return any(key.startswith(p) for p in hot_patterns)

    def set(self, key: str, value: str, **kwargs):
        """Set always goes to master."""
        return self.master.set(key, value, **kwargs)

    def mget(self, *keys) -> List[Optional[str]]:
        """
        Multi-get with intelligent routing.
        Groups hot keys to replicas, others to master.
        """
        hot_keys = []
        normal_keys = []
        key_positions = {}

        for i, key in enumerate(keys):
            if key in self.hot_keys or self._matches_hot_pattern(key):
                hot_keys.append(key)
            else:
                normal_keys.append(key)
            key_positions[key] = i

        results = [None] * len(keys)

        # Fetch hot keys from replica
        if hot_keys:
            replica = self._get_replica()
            hot_values = replica.mget(*hot_keys)
            for key, value in zip(hot_keys, hot_values):
                results[key_positions[key]] = value

        # Fetch normal keys from master
        if normal_keys:
            normal_values = self.master.mget(*normal_keys)
            for key, value in zip(normal_keys, normal_values):
                results[key_positions[key]] = value

        return results


# Usage
master = redis.Redis(host='localhost', port=6379, decode_responses=True)
replicas = [
    redis.Redis(host='localhost', port=6380, decode_responses=True),
    redis.Redis(host='localhost', port=6381, decode_responses=True)
]

router = HotKeyReplicaRouter(master, replicas)

# Mark known hot keys
router.add_hot_key('trending:articles')
router.add_hot_key('popular:products')

# Reads are automatically routed
value = router.get('trending:articles')  # Goes to replica
value = router.get('user:1001')  # Goes to master
```

### 4. Probabilistic Early Expiration

```python
import redis
import random
import time
import math
from typing import Optional, Tuple

class ProbabilisticCache:
    """
    Implement probabilistic early expiration to prevent
    cache stampede on hot keys.
    """

    def __init__(self, redis_client: redis.Redis, beta: float = 1.0):
        self.redis = redis_client
        self.beta = beta  # Adjustment factor for early recompute

    def get_with_early_recompute(
        self,
        key: str,
        compute_fn,
        ttl: int = 300
    ) -> Tuple[any, bool]:
        """
        Get value with probabilistic early recomputation.

        Returns (value, should_recompute).
        Callers should trigger recomputation if should_recompute is True.
        """
        # Get value and TTL
        pipe = self.redis.pipeline()
        pipe.get(key)
        pipe.ttl(key)
        value, remaining_ttl = pipe.execute()

        if value is None:
            # Cache miss - compute and store
            new_value = compute_fn()
            self.redis.setex(key, ttl, new_value)
            return new_value, False

        if remaining_ttl < 0:
            # No expiration set or key expired during check
            new_value = compute_fn()
            self.redis.setex(key, ttl, new_value)
            return new_value, False

        # XFetch algorithm: probabilistic early recompute
        # Probability increases as TTL approaches 0
        delta = ttl - remaining_ttl  # Time since last refresh
        should_recompute = self._should_recompute(delta, ttl)

        if should_recompute:
            # Asynchronously trigger recompute
            # (In production, use a background worker)
            return value, True

        return value, False

    def _should_recompute(self, delta: float, ttl: float) -> bool:
        """
        Determine if we should recompute based on XFetch algorithm.

        P(recompute) = exp(-delta * beta / (ttl - delta))
        """
        if delta >= ttl:
            return True

        remaining = ttl - delta
        # Random value vs probability threshold
        threshold = self.beta * math.log(random.random()) * -1

        return delta > remaining * threshold

    def get_hot_key_safe(
        self,
        key: str,
        compute_fn,
        ttl: int = 300,
        lock_timeout: int = 10
    ) -> any:
        """
        Get hot key value with lock-based stampede prevention.
        """
        value = self.redis.get(key)

        if value is not None:
            return value

        # Try to acquire lock
        lock_key = f"{key}:lock"
        lock_acquired = self.redis.set(
            lock_key, '1',
            nx=True,
            ex=lock_timeout
        )

        if lock_acquired:
            try:
                # We got the lock - compute value
                new_value = compute_fn()
                self.redis.setex(key, ttl, new_value)
                return new_value
            finally:
                self.redis.delete(lock_key)
        else:
            # Another process is computing - wait and retry
            for _ in range(lock_timeout * 10):
                time.sleep(0.1)
                value = self.redis.get(key)
                if value is not None:
                    return value

            # Timeout - compute anyway
            return compute_fn()


# Usage
client = redis.Redis(decode_responses=True)
cache = ProbabilisticCache(client, beta=1.0)

def expensive_computation():
    time.sleep(0.5)  # Simulate expensive operation
    return f"computed_value_{time.time()}"

# Get with early recomputation probability
value, should_recompute = cache.get_with_early_recompute(
    'hot_key',
    expensive_computation,
    ttl=60
)

if should_recompute:
    # Trigger async recomputation
    # In production, enqueue to a background worker
    print("Should trigger background recomputation")
```

## Cluster-Specific Solutions

### Handling Hot Keys in Redis Cluster

```python
import redis
from redis.cluster import RedisCluster
import hashlib
from typing import Dict, Any

class ClusterHotKeyHandler:
    """
    Handle hot keys in Redis Cluster environment.
    """

    def __init__(self, cluster: RedisCluster):
        self.cluster = cluster

    def check_slot_distribution(self) -> Dict[str, Any]:
        """
        Check if any slot is receiving disproportionate traffic.
        """
        # Get cluster info
        nodes = self.cluster.cluster_nodes()

        node_stats = {}
        for node_id, info in nodes.items():
            if 'master' in info.get('flags', ''):
                # Get stats for this node
                host, port = info['host'], info['port']

                try:
                    node_client = redis.Redis(host=host, port=port)
                    stats = node_client.info()

                    node_stats[node_id] = {
                        'host': host,
                        'port': port,
                        'slots': info.get('slots', []),
                        'connected_clients': stats.get('connected_clients', 0),
                        'used_memory': stats.get('used_memory', 0),
                        'ops_per_sec': stats.get('instantaneous_ops_per_sec', 0)
                    }
                except:
                    continue

        # Identify imbalanced nodes
        if node_stats:
            avg_ops = sum(n['ops_per_sec'] for n in node_stats.values()) / len(node_stats)
            for node_id, stats in node_stats.items():
                stats['ops_ratio'] = stats['ops_per_sec'] / max(avg_ops, 1)
                if stats['ops_ratio'] > 2:
                    stats['potentially_hot'] = True

        return node_stats

    def use_hash_tags_for_distribution(self, base_key: str, num_variants: int = 16) -> list:
        """
        Create key variants that distribute across different slots.
        """
        variants = []
        for i in range(num_variants):
            # Create different hash tags to spread across slots
            variant_key = f"{{{base_key}:{i}}}:data"
            slot = self.cluster.cluster_keyslot(variant_key)
            variants.append({
                'key': variant_key,
                'slot': slot
            })
        return variants

    def replicate_hot_key_to_slots(self, key: str, value: str, num_copies: int = 8, ex: int = None):
        """
        Replicate a hot key to multiple slots for read distribution.
        """
        pipe = self.cluster.pipeline()

        for i in range(num_copies):
            # Different hash tag = different slot
            replica_key = f"{{hotkey:{key}:{i}}}:replica"
            if ex:
                pipe.setex(replica_key, ex, value)
            else:
                pipe.set(replica_key, value)

        pipe.execute()

        return [f"{{hotkey:{key}:{i}}}:replica" for i in range(num_copies)]

    def get_from_replicated_key(self, key: str, num_copies: int = 8) -> str:
        """
        Read from a random replica of a hot key.
        """
        import random
        idx = random.randint(0, num_copies - 1)
        replica_key = f"{{hotkey:{key}:{idx}}}:replica"
        return self.cluster.get(replica_key)


# Usage
cluster = RedisCluster(
    startup_nodes=[
        redis.cluster.ClusterNode('localhost', 7000)
    ],
    decode_responses=True
)

handler = ClusterHotKeyHandler(cluster)

# Check slot distribution
distribution = handler.check_slot_distribution()
for node_id, stats in distribution.items():
    print(f"Node {node_id}: {stats['ops_per_sec']} ops/sec, ratio: {stats.get('ops_ratio', 0):.2f}")

# Replicate hot key for read distribution
replicas = handler.replicate_hot_key_to_slots('trending:post:1234', 'post_data', num_copies=8, ex=3600)
print(f"Created {len(replicas)} replicas across different slots")

# Read from random replica
value = handler.get_from_replicated_key('trending:post:1234', num_copies=8)
```

## Monitoring and Alerting

```python
import redis
import time
from typing import Dict, List
from collections import deque

class HotKeyMonitor:
    """
    Monitor for hot key detection and alerting.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        sample_window: int = 60,
        hot_key_threshold: int = 1000,  # Requests per minute
        alert_callback=None
    ):
        self.redis = redis_client
        self.sample_window = sample_window
        self.hot_key_threshold = hot_key_threshold
        self.alert_callback = alert_callback

        self._access_log: deque = deque(maxlen=100000)
        self._last_alert_time: Dict[str, float] = {}
        self._alert_cooldown = 300  # 5 minutes between alerts

    def record_access(self, key: str):
        """Record a key access."""
        self._access_log.append((time.time(), key))

    def analyze(self) -> Dict[str, Dict]:
        """Analyze access patterns and detect hot keys."""
        now = time.time()
        window_start = now - self.sample_window

        # Count accesses in window
        key_counts = {}
        for timestamp, key in self._access_log:
            if timestamp >= window_start:
                key_counts[key] = key_counts.get(key, 0) + 1

        # Identify hot keys
        hot_keys = {}
        for key, count in key_counts.items():
            if count >= self.hot_key_threshold:
                hot_keys[key] = {
                    'count': count,
                    'rate_per_second': count / self.sample_window
                }

                # Send alert if not in cooldown
                if self._should_alert(key):
                    self._send_alert(key, count)

        return {
            'total_accesses': len([t for t, _ in self._access_log if t >= window_start]),
            'unique_keys': len(key_counts),
            'hot_keys': hot_keys
        }

    def _should_alert(self, key: str) -> bool:
        """Check if we should send an alert for this key."""
        last_alert = self._last_alert_time.get(key, 0)
        return time.time() - last_alert > self._alert_cooldown

    def _send_alert(self, key: str, count: int):
        """Send alert for hot key."""
        self._last_alert_time[key] = time.time()

        alert_data = {
            'key': key,
            'access_count': count,
            'window_seconds': self.sample_window,
            'timestamp': time.time()
        }

        if self.alert_callback:
            self.alert_callback(alert_data)
        else:
            print(f"HOT KEY ALERT: {key} - {count} accesses in {self.sample_window}s")

    def get_metrics(self) -> dict:
        """Get monitoring metrics for export."""
        analysis = self.analyze()

        return {
            'redis_hot_key_total_accesses': analysis['total_accesses'],
            'redis_hot_key_unique_keys': analysis['unique_keys'],
            'redis_hot_key_count': len(analysis['hot_keys']),
            'redis_hot_keys': list(analysis['hot_keys'].keys())
        }


# Usage with alert callback
def alert_handler(alert_data):
    print(f"ALERT: Hot key detected - {alert_data}")
    # In production: send to Slack, PagerDuty, etc.

client = redis.Redis(decode_responses=True)
monitor = HotKeyMonitor(
    client,
    sample_window=60,
    hot_key_threshold=1000,
    alert_callback=alert_handler
)

# Simulate access tracking
for i in range(5000):
    if i % 10 == 0:
        monitor.record_access('hot:key:1')  # Hot key
    else:
        monitor.record_access(f'normal:key:{i % 100}')

# Analyze
analysis = monitor.analyze()
print(f"Analysis: {analysis}")
```

## Summary

Handling hot keys effectively requires:

1. **Detection** - Monitor access patterns to identify hot keys early
2. **Local Caching** - Reduce Redis load with client-side caching
3. **Key Splitting** - Distribute load across multiple physical keys
4. **Read Replicas** - Route hot key reads to replicas
5. **Probabilistic Expiration** - Prevent cache stampede with early refresh
6. **Cluster Awareness** - Distribute across slots in Redis Cluster

Key principles:
- Proactive monitoring beats reactive firefighting
- Multiple strategies can be combined
- Consider trade-offs between consistency and availability
- Test solutions under realistic load conditions
