# How to Configure LRU and LFU Eviction in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Eviction Policies, LRU, LFU, Memory Management, Caching, Performance

Description: Learn how to configure Redis eviction policies to manage memory efficiently. This guide covers LRU, LFU, and other eviction strategies with practical examples for choosing the right policy for your use case.

---

> When Redis runs out of memory, it needs to decide which keys to remove to make room for new data. The eviction policy you choose significantly impacts your cache hit rate and application performance. Understanding the differences between LRU, LFU, and other policies helps you make the right choice.

Redis provides several eviction policies, each suited for different access patterns. This guide explains when to use each policy and how to configure them for optimal performance.

---

## Understanding Memory Limits

Before eviction kicks in, you need to set a memory limit:

```conf
# redis.conf

# Set maximum memory to 2 gigabytes
maxmemory 2gb

# Or use a percentage (requires Redis 7.0+)
# maxmemory 75%
```

You can also set this at runtime:

```bash
# Set memory limit dynamically
redis-cli CONFIG SET maxmemory 2gb

# Check current setting
redis-cli CONFIG GET maxmemory
```

---

## Eviction Policies Overview

Redis supports eight eviction policies:

| Policy | Description | Use Case |
|--------|-------------|----------|
| noeviction | Return errors when memory limit is reached | When data loss is unacceptable |
| allkeys-lru | Evict least recently used keys | General-purpose caching |
| volatile-lru | Evict LRU keys with TTL set | Mixed persistent and cache data |
| allkeys-lfu | Evict least frequently used keys | Hot/cold access patterns |
| volatile-lfu | Evict LFU keys with TTL set | Mixed data with frequency patterns |
| allkeys-random | Evict random keys | When access is uniform |
| volatile-random | Evict random keys with TTL | Simple TTL-based expiration |
| volatile-ttl | Evict keys with shortest TTL | Prioritize longer-lived data |

---

## LRU (Least Recently Used)

LRU eviction removes keys that have not been accessed recently. Redis uses an approximated LRU algorithm that samples a subset of keys rather than tracking exact access times for all keys.

```conf
# Enable LRU eviction for all keys
maxmemory-policy allkeys-lru

# Number of keys to sample for LRU approximation
# Higher values = more accurate but slower
# Default is 5, recommended range is 5-10
maxmemory-samples 10
```

LRU is ideal when:
- Recent data is more likely to be accessed again
- You have temporal locality in access patterns
- You want simple, predictable behavior

```python
import redis
import time

def demonstrate_lru_behavior():
    """
    Demonstrate how LRU eviction works.
    """
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)

    # Configure for LRU (requires sufficient permissions)
    # r.config_set('maxmemory', '10mb')
    # r.config_set('maxmemory-policy', 'allkeys-lru')

    # Add keys with different access patterns
    for i in range(1000):
        r.set(f'key:{i}', 'x' * 1000)

    # Access some keys to make them "recently used"
    # These should survive eviction longer
    for i in range(0, 100):
        r.get(f'key:{i}')
        time.sleep(0.001)

    # Add more keys to trigger eviction
    for i in range(1000, 2000):
        r.set(f'key:{i}', 'x' * 1000)

    # Check which keys remain
    # Recently accessed keys (0-99) should have higher survival rate
    early_keys_remaining = sum(1 for i in range(100) if r.exists(f'key:{i}'))
    later_keys_remaining = sum(1 for i in range(100, 200) if r.exists(f'key:{i}'))

    print(f"Recently accessed keys remaining: {early_keys_remaining}/100")
    print(f"Not recently accessed keys remaining: {later_keys_remaining}/100")
```

---

## LFU (Least Frequently Used)

LFU eviction removes keys that are accessed least frequently, regardless of recency. Redis implements LFU using a logarithmic counter that decays over time.

```conf
# Enable LFU eviction for all keys
maxmemory-policy allkeys-lfu

# LFU decay time in minutes
# How long until the frequency counter is halved
# Default is 1 minute
lfu-decay-time 1

# LFU logarithmic factor
# Higher values require more hits to saturate the counter
# Default is 10
lfu-log-factor 10
```

LFU is ideal when:
- Some keys are consistently popular (hot keys)
- Access frequency is more important than recency
- You want to keep frequently accessed data in cache

```python
def demonstrate_lfu_behavior():
    """
    Demonstrate how LFU eviction prioritizes frequently accessed keys.
    """
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)

    # Add keys with different access frequencies
    for i in range(500):
        r.set(f'key:{i}', 'x' * 1000)

    # Access some keys many times (high frequency)
    # These "hot" keys should survive eviction
    for _ in range(100):
        for i in range(0, 50):  # First 50 keys accessed frequently
            r.get(f'key:{i}')

    # Access other keys only once (low frequency)
    for i in range(50, 200):
        r.get(f'key:{i}')

    # Add more keys to trigger eviction
    for i in range(500, 1000):
        r.set(f'key:{i}', 'x' * 1000)

    # Check survival rates
    hot_keys_remaining = sum(1 for i in range(50) if r.exists(f'key:{i}'))
    cold_keys_remaining = sum(1 for i in range(50, 100) if r.exists(f'key:{i}'))

    print(f"Frequently accessed keys remaining: {hot_keys_remaining}/50")
    print(f"Rarely accessed keys remaining: {cold_keys_remaining}/50")
```

---

## Tuning LFU Parameters

The LFU algorithm uses two parameters that significantly affect behavior:

### LFU Log Factor

Controls how quickly the frequency counter grows:

```
factor=0:  Counter saturates very quickly
factor=1:  After 5 hits, counter is ~93% of max
factor=10: After 1000 hits, counter is ~93% of max (default)
factor=100: After 10000 hits, counter is ~93% of max
```

```python
def analyze_lfu_counter_growth(log_factor: int) -> None:
    """
    Show how the LFU counter grows with different log factors.
    """
    import math

    # Redis LFU counter formula (simplified)
    def counter_probability(counter, log_factor):
        if counter == 255:  # Max value
            return 0
        return 1.0 / ((counter * log_factor) + 1)

    print(f"\nLFU Counter Growth (log_factor={log_factor})")
    print("-" * 40)

    counter = 5  # Initial value for new keys
    total_hits = 0

    for hits in [1, 10, 100, 1000, 10000]:
        # Simulate hits
        while total_hits < hits:
            p = counter_probability(counter, log_factor)
            # Probabilistic increment
            if p > 0.5:  # Simplified simulation
                counter = min(255, counter + 1)
            total_hits += 1

        print(f"After {hits:>5} hits: counter = {counter}")
```

### LFU Decay Time

Controls how quickly frequency counters decrease over time:

```conf
# Counter halves every minute (default)
lfu-decay-time 1

# Counter halves every 5 minutes (slower decay)
lfu-decay-time 5

# No decay (not recommended)
lfu-decay-time 0
```

---

## Volatile vs Allkeys Policies

The "volatile" prefix means eviction only considers keys with an expiration time set:

```python
def demonstrate_volatile_vs_allkeys():
    """
    Show difference between volatile and allkeys eviction.
    """
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)

    # With volatile-lru policy:
    # - Keys with TTL can be evicted
    # - Keys without TTL are never evicted

    # Set keys with TTL (evictable)
    for i in range(100):
        r.setex(f'cache:{i}', 3600, 'cached_value')

    # Set keys without TTL (protected from eviction)
    for i in range(100):
        r.set(f'permanent:{i}', 'important_value')

    # Under memory pressure with volatile-lru:
    # - cache:* keys may be evicted
    # - permanent:* keys will NOT be evicted

    # This is useful for mixing cache and persistent data
    # in the same Redis instance
```

---

## Monitoring Eviction

Track eviction metrics to understand cache behavior:

```python
def monitor_eviction_stats(redis_client: redis.Redis) -> dict:
    """
    Get eviction statistics from Redis.
    """
    info = redis_client.info('stats')

    return {
        # Total keys evicted since server start
        'evicted_keys': info.get('evicted_keys', 0),

        # Keyspace hits and misses
        'keyspace_hits': info.get('keyspace_hits', 0),
        'keyspace_misses': info.get('keyspace_misses', 0),

        # Hit ratio
        'hit_ratio': calculate_hit_ratio(info)
    }

def calculate_hit_ratio(info: dict) -> float:
    """Calculate cache hit ratio."""
    hits = info.get('keyspace_hits', 0)
    misses = info.get('keyspace_misses', 0)
    total = hits + misses

    if total == 0:
        return 0.0
    return round(hits / total * 100, 2)


def setup_eviction_monitoring(redis_client: redis.Redis, interval: int = 60):
    """
    Periodically log eviction statistics.
    """
    import threading
    import time

    def monitor_loop():
        prev_evicted = 0

        while True:
            stats = monitor_eviction_stats(redis_client)
            current_evicted = stats['evicted_keys']
            evicted_this_interval = current_evicted - prev_evicted

            print(f"Evictions (last {interval}s): {evicted_this_interval}")
            print(f"Hit ratio: {stats['hit_ratio']}%")
            print(f"Total evicted: {current_evicted}")

            prev_evicted = current_evicted
            time.sleep(interval)

    thread = threading.Thread(target=monitor_loop, daemon=True)
    thread.start()
```

---

## Choosing the Right Policy

Decision flowchart:

```
Start
  |
  v
Can you tolerate key eviction?
  |
  +-- No --> Use "noeviction"
  |
  +-- Yes
        |
        v
      Do all keys have TTL?
        |
        +-- No --> Use "allkeys-*"
        |
        +-- Yes --> Use "volatile-*"
              |
              v
            Do some keys have hot/cold patterns?
              |
              +-- Yes --> Use "*-lfu"
              |
              +-- No --> Is recency important?
                    |
                    +-- Yes --> Use "*-lru"
                    |
                    +-- No --> Use "*-random" or "*-ttl"
```

---

## Production Configuration Example

Here is a complete configuration for a production caching server:

```conf
# Memory configuration
maxmemory 4gb

# Use LFU for workloads with clear hot/cold patterns
# Use LRU for general-purpose caching
maxmemory-policy allkeys-lfu

# Increase sample size for better eviction accuracy
maxmemory-samples 10

# LFU tuning
lfu-log-factor 10
lfu-decay-time 1

# Memory usage reporting
# Check with: INFO memory
```

```python
class AdaptiveCache:
    """
    Cache that monitors and suggests eviction policy changes.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.access_log = []

    def analyze_access_patterns(self) -> str:
        """
        Analyze recent access patterns and recommend eviction policy.
        """
        if not self.access_log:
            return "allkeys-lru"  # Safe default

        from collections import Counter

        # Count access frequency per key
        access_counts = Counter(self.access_log[-10000:])

        # Calculate access distribution
        total_accesses = len(self.access_log[-10000:])
        unique_keys = len(access_counts)

        # Check for hot key pattern
        top_10_percent = sorted(access_counts.values(), reverse=True)[:max(1, unique_keys // 10)]
        top_10_accesses = sum(top_10_percent)

        hot_key_ratio = top_10_accesses / total_accesses if total_accesses > 0 else 0

        if hot_key_ratio > 0.5:
            # Strong hot/cold pattern - LFU is better
            return "allkeys-lfu"
        else:
            # More uniform access - LRU is simpler and sufficient
            return "allkeys-lru"
```

---

## Best Practices

1. **Start with allkeys-lru**: It is a good default that works well for most caching scenarios

2. **Use LFU for hot key workloads**: When a small subset of keys gets most accesses, LFU keeps those keys in cache

3. **Increase maxmemory-samples for accuracy**: Higher values (up to 10) improve eviction decisions with minimal overhead

4. **Monitor hit ratios**: A dropping hit ratio may indicate wrong eviction policy

5. **Consider volatile policies for mixed data**: When you need some keys to be protected from eviction

6. **Test under realistic load**: Eviction behavior depends heavily on access patterns

Proper eviction configuration ensures your Redis cache maintains high hit ratios even under memory pressure, keeping your application responsive while making efficient use of available memory.
