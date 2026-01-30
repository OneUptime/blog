# How to Build Redis Key Eviction Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Redis, Caching, Memory Management, Performance

Description: Configure Redis key eviction policies for memory management with LRU, LFU, and TTL-based strategies to optimize cache hit rates.

---

Redis stores all data in memory, which makes it fast but also means you need a plan for when memory fills up. Key eviction strategies determine which keys Redis removes when it hits memory limits. Getting this right directly impacts your cache hit rates and application performance.

This guide walks through configuring maxmemory, choosing the right eviction policy, understanding how Redis approximates LRU, and monitoring evictions in production.

## Understanding Redis Memory Limits

Before diving into eviction strategies, you need to understand how Redis handles memory constraints.

### How Redis Uses Memory

Redis stores data structures in RAM along with overhead for:

- Key metadata and pointers
- Client output buffers
- AOF and RDB buffers during persistence
- Replication buffers for replicas
- Lua script caches

The actual memory used is always higher than the sum of your key-value sizes. A good rule of thumb: expect 2-3x overhead for small keys.

### Checking Current Memory Usage

Use the INFO memory command to see current memory statistics.

```bash
redis-cli INFO memory
```

This returns detailed memory information:

```
# Memory
used_memory:1073741824
used_memory_human:1.00G
used_memory_rss:1288490188
used_memory_rss_human:1.20G
used_memory_peak:1610612736
used_memory_peak_human:1.50G
used_memory_lua:37888
maxmemory:2147483648
maxmemory_human:2.00G
maxmemory_policy:allkeys-lru
mem_fragmentation_ratio:1.20
```

Key metrics to watch:

| Metric | Description |
|--------|-------------|
| used_memory | Total bytes allocated by Redis |
| used_memory_rss | Bytes allocated as seen by the OS |
| maxmemory | Configured memory limit |
| maxmemory_policy | Current eviction policy |
| mem_fragmentation_ratio | Ratio of RSS to used_memory (1.0-1.5 is normal) |

## Configuring maxmemory

The maxmemory directive sets the memory ceiling for Redis. When this limit is reached, Redis applies the configured eviction policy.

### Setting maxmemory in redis.conf

Open your Redis configuration file and set the limit:

```conf
# Set maximum memory to 2GB
maxmemory 2gb

# Alternative formats
maxmemory 2147483648    # bytes
maxmemory 2048mb        # megabytes
maxmemory 2gb           # gigabytes
```

### Setting maxmemory at Runtime

You can change maxmemory without restarting Redis:

```bash
# Set to 4GB
redis-cli CONFIG SET maxmemory 4gb

# Verify the change
redis-cli CONFIG GET maxmemory
```

Output:

```
1) "maxmemory"
2) "4294967296"
```

### Sizing Guidelines

How much memory should you allocate? Consider these factors:

| Scenario | Recommendation |
|----------|----------------|
| Dedicated cache server | 75-80% of available RAM |
| Shared server with other services | 50-60% of available RAM |
| Server with persistence enabled | 60-70% of available RAM (leave room for fork) |
| Kubernetes pod | Set to pod memory limit minus 20% buffer |

Example for a dedicated 8GB cache server:

```conf
# Leave 1.5GB for OS, Redis overhead, and fragmentation
maxmemory 6500mb
```

## Eviction Policies Explained

Redis provides eight eviction policies. Each behaves differently based on which keys it considers for eviction and how it selects among candidates.

### Policy Overview

| Policy | Keys Considered | Selection Method |
|--------|-----------------|------------------|
| noeviction | None | Returns error on writes |
| allkeys-lru | All keys | Least Recently Used |
| volatile-lru | Keys with TTL | Least Recently Used |
| allkeys-lfu | All keys | Least Frequently Used |
| volatile-lfu | Keys with TTL | Least Frequently Used |
| allkeys-random | All keys | Random selection |
| volatile-random | Keys with TTL | Random selection |
| volatile-ttl | Keys with TTL | Shortest TTL first |

### noeviction

With noeviction, Redis returns an error when memory is full and a client tries to write new data.

```conf
maxmemory-policy noeviction
```

When memory is exceeded:

```bash
redis-cli SET newkey "value"
```

```
(error) OOM command not allowed when used memory > 'maxmemory'.
```

When to use noeviction:

- Data loss is unacceptable
- You want explicit failure rather than silent data removal
- Redis is used as a primary data store, not a cache

### allkeys-lru

This policy evicts the least recently used keys from the entire keyspace. Most common choice for general-purpose caching.

```conf
maxmemory-policy allkeys-lru
```

Example scenario showing LRU behavior:

```bash
# Populate some keys
redis-cli SET user:1 "Alice"
redis-cli SET user:2 "Bob"
redis-cli SET user:3 "Charlie"

# Access user:1 and user:3
redis-cli GET user:1
redis-cli GET user:3

# If eviction occurs, user:2 is most likely to be evicted
# because it was accessed least recently
```

When to use allkeys-lru:

- General web application caching
- Session storage
- API response caching
- Any scenario where recent data is more valuable

### volatile-lru

Evicts least recently used keys, but only considers keys that have an expiration (TTL) set.

```conf
maxmemory-policy volatile-lru
```

Example showing which keys are candidates:

```bash
# Key with TTL - candidate for eviction
redis-cli SET session:abc "data" EX 3600

# Key without TTL - will NOT be evicted
redis-cli SET config:app "settings"

# When memory pressure occurs, only session:abc can be evicted
```

When to use volatile-lru:

- Mix of cache data (with TTL) and persistent data (without TTL)
- You want to protect certain keys from eviction
- Session caches alongside configuration data

Warning: If no keys have TTL set and memory fills up, Redis behaves like noeviction and returns errors.

### allkeys-lfu

Evicts least frequently used keys. Better than LRU when you have keys with varying access patterns.

```conf
maxmemory-policy allkeys-lfu
```

LFU tracks access frequency, not just recency:

```bash
# Popular key - accessed 1000 times
for i in {1..1000}; do redis-cli GET popular:key > /dev/null; done

# Unpopular key - accessed once recently
redis-cli SET unpopular:key "data"
redis-cli GET unpopular:key

# Under LRU: popular:key might be evicted if not accessed recently
# Under LFU: unpopular:key will be evicted due to low frequency
```

When to use allkeys-lfu:

- Workloads with hot and cold data
- Product catalogs where some items are always popular
- Content caches with varying popularity

### volatile-lfu

Same as allkeys-lfu but only considers keys with TTL.

```conf
maxmemory-policy volatile-lfu
```

Combines frequency-based eviction with the safety of protecting keys without TTL.

### allkeys-random

Randomly selects keys to evict from the entire keyspace.

```conf
maxmemory-policy allkeys-random
```

When to use allkeys-random:

- Uniform access patterns where no key is more important than another
- Testing and development environments
- When you need predictable O(1) eviction overhead

### volatile-random

Randomly evicts keys, but only those with TTL set.

```conf
maxmemory-policy volatile-random
```

### volatile-ttl

Evicts keys with the shortest remaining TTL first.

```conf
maxmemory-policy volatile-ttl
```

Example behavior:

```bash
# Key expiring soon - evicted first
redis-cli SET short:ttl "data" EX 60

# Key expiring later - evicted second
redis-cli SET long:ttl "data" EX 3600

# Under memory pressure, short:ttl is evicted before long:ttl
```

When to use volatile-ttl:

- Keys closer to expiration are less valuable
- Time-sensitive data like rate limiting counters
- You want natural ordering based on data freshness

## How Redis Approximates LRU

Redis does not implement true LRU because tracking access times for millions of keys would consume too much memory. Instead, Redis uses approximated LRU.

### The Sampling Approach

When eviction is needed, Redis:

1. Takes a random sample of keys (default: 5 keys)
2. Evicts the least recently used key from that sample
3. Repeats until enough memory is freed

This provides near-LRU behavior with O(1) memory overhead.

### Configuring Sample Size

The maxmemory-samples setting controls accuracy versus performance:

```conf
# Default: 5 samples (good balance)
maxmemory-samples 5

# More accurate but slower
maxmemory-samples 10

# Less accurate but faster
maxmemory-samples 3
```

Higher values give better approximation of true LRU:

| Sample Size | Accuracy | Performance Impact |
|-------------|----------|-------------------|
| 3 | Lower | Minimal |
| 5 | Good | Low |
| 10 | High | Moderate |

Visual comparison of sample sizes:

```
True LRU:        ████████████████████████████████
maxmemory-samples 10: █████████████████████████████
maxmemory-samples 5:  ██████████████████████████
maxmemory-samples 3:  ████████████████████████
```

For most workloads, the default of 5 provides good enough approximation without noticeable overhead.

### LFU Configuration

LFU uses a probabilistic counter that requires tuning for your workload.

```conf
# LFU logarithmic counter factor (default: 10)
lfu-log-factor 10

# LFU counter decay time in minutes (default: 1)
lfu-decay-time 1
```

The lfu-log-factor controls how quickly the counter saturates:

| Factor | Hits to reach max counter (255) |
|--------|--------------------------------|
| 0 | 255 |
| 1 | ~510 |
| 10 | ~1 million |
| 100 | ~10 million |

Higher factors differentiate better between very popular keys.

The lfu-decay-time controls how fast counters decrease:

```conf
# Decay counters every 10 minutes (slower decay, longer memory)
lfu-decay-time 10

# Decay counters every minute (faster decay, responds quicker to changes)
lfu-decay-time 1

# No decay (counter only increases)
lfu-decay-time 0
```

### Viewing LRU/LFU Data

Check the idle time or frequency of a key:

```bash
# For LRU - shows seconds since last access
redis-cli OBJECT IDLETIME mykey
```

```
(integer) 120
```

```bash
# For LFU - shows access frequency counter
redis-cli OBJECT FREQ mykey
```

```
(integer) 45
```

Note: OBJECT FREQ only works when LFU policy is active.

## Practical Configuration Examples

### Web Application Cache

Standard configuration for caching web responses, sessions, and computed data.

```conf
# Memory limit
maxmemory 4gb

# LRU for general caching - recent data is usually more relevant
maxmemory-policy allkeys-lru

# Default sampling is fine for most cases
maxmemory-samples 5
```

### E-commerce Product Cache

Products have varying popularity. LFU keeps popular items cached.

```conf
# Memory limit
maxmemory 8gb

# LFU to keep frequently accessed products
maxmemory-policy allkeys-lfu

# Higher samples for better accuracy with product lookups
maxmemory-samples 10

# Moderate log factor - products can get thousands of views
lfu-log-factor 10

# Decay over 30 minutes - popularity changes slowly
lfu-decay-time 30
```

### Session Store with Protected Config

Sessions can be evicted, but config keys must persist.

```conf
# Memory limit
maxmemory 2gb

# Only evict keys with TTL (sessions have TTL, config does not)
maxmemory-policy volatile-lru

maxmemory-samples 5
```

Application code pattern:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Sessions have TTL - can be evicted
def store_session(session_id, data, ttl=3600):
    r.setex(f"session:{session_id}", ttl, data)

# Config has no TTL - protected from eviction
def store_config(key, value):
    r.set(f"config:{key}", value)
```

### Rate Limiter

Short-lived keys where TTL-based eviction makes sense.

```conf
maxmemory 1gb

# Evict keys closest to expiration
maxmemory-policy volatile-ttl

maxmemory-samples 5
```

Rate limiter implementation:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

def is_rate_limited(user_id, limit=100, window=60):
    key = f"ratelimit:{user_id}"
    current = r.get(key)

    if current is None:
        # First request in window
        r.setex(key, window, 1)
        return False

    if int(current) >= limit:
        return True

    r.incr(key)
    return False
```

## Monitoring Evictions

Tracking evictions helps you understand if your cache is sized correctly and if your eviction policy is working well.

### Key Metrics to Monitor

Use INFO stats to see eviction counters:

```bash
redis-cli INFO stats | grep evicted
```

```
evicted_keys:12345
```

This counter increases each time a key is evicted due to memory pressure.

### Comprehensive Monitoring Script

Script to track eviction metrics over time:

```bash
#!/bin/bash
# redis-eviction-monitor.sh

INTERVAL=${1:-5}
REDIS_CLI="redis-cli"

echo "Timestamp,Used_Memory_MB,Max_Memory_MB,Memory_Pct,Evicted_Keys,Evicted_Delta,Policy"

PREV_EVICTED=0

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    # Get memory info
    USED_MEM=$($REDIS_CLI INFO memory | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
    MAX_MEM=$($REDIS_CLI INFO memory | grep "maxmemory:" | cut -d: -f2 | tr -d '\r')
    POLICY=$($REDIS_CLI INFO memory | grep "maxmemory_policy:" | cut -d: -f2 | tr -d '\r')

    # Get eviction count
    EVICTED=$($REDIS_CLI INFO stats | grep "evicted_keys:" | cut -d: -f2 | tr -d '\r')

    # Calculate values
    USED_MB=$((USED_MEM / 1048576))
    MAX_MB=$((MAX_MEM / 1048576))

    if [ "$MAX_MEM" -gt 0 ]; then
        MEM_PCT=$((USED_MEM * 100 / MAX_MEM))
    else
        MEM_PCT=0
    fi

    EVICTED_DELTA=$((EVICTED - PREV_EVICTED))
    PREV_EVICTED=$EVICTED

    echo "$TIMESTAMP,$USED_MB,$MAX_MB,$MEM_PCT,$EVICTED,$EVICTED_DELTA,$POLICY"

    sleep $INTERVAL
done
```

Run the script:

```bash
chmod +x redis-eviction-monitor.sh
./redis-eviction-monitor.sh 10
```

Output:

```
Timestamp,Used_Memory_MB,Max_Memory_MB,Memory_Pct,Evicted_Keys,Evicted_Delta,Policy
2026-01-30 10:00:00,3891,4096,95,12345,0,allkeys-lru
2026-01-30 10:00:10,3950,4096,96,12367,22,allkeys-lru
2026-01-30 10:00:20,3912,4096,95,12389,22,allkeys-lru
```

### Setting Up Alerts

Key thresholds to alert on:

| Metric | Warning | Critical |
|--------|---------|----------|
| Memory usage | > 80% of maxmemory | > 95% of maxmemory |
| Eviction rate | > 100/sec sustained | > 1000/sec |
| Cache hit ratio | < 90% | < 80% |

Example Prometheus alert rules:

```yaml
groups:
  - name: redis_eviction_alerts
    rules:
      - alert: RedisHighMemoryUsage
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage above 90%"

      - alert: RedisHighEvictionRate
        expr: rate(redis_evicted_keys_total[5m]) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis evicting more than 100 keys/sec"
```

### Cache Hit Ratio

Track hits versus misses to evaluate cache effectiveness:

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

```
keyspace_hits:1000000
keyspace_misses:50000
```

Calculate hit ratio:

```bash
#!/bin/bash
# cache-hit-ratio.sh

HITS=$(redis-cli INFO stats | grep "keyspace_hits:" | cut -d: -f2 | tr -d '\r')
MISSES=$(redis-cli INFO stats | grep "keyspace_misses:" | cut -d: -f2 | tr -d '\r')

TOTAL=$((HITS + MISSES))

if [ "$TOTAL" -gt 0 ]; then
    RATIO=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
    echo "Cache hit ratio: $RATIO%"
else
    echo "No cache activity yet"
fi
```

A healthy cache typically has > 90% hit ratio. If your hit ratio is low:

- Consider increasing maxmemory
- Review your eviction policy choice
- Check if your access patterns match your policy

## Troubleshooting Common Issues

### Issue: OOM Errors Despite Having Eviction Policy

Symptom:

```
(error) OOM command not allowed when used memory > 'maxmemory'.
```

Possible causes:

1. Policy is set to noeviction
2. Using volatile-* policy but no keys have TTL
3. Single command requires more memory than available

Fix for cause 2:

```bash
# Check how many keys have TTL
redis-cli INFO keyspace
```

```
# Keyspace
db0:keys=1000000,expires=100,avg_ttl=3600000
```

If expires is low compared to keys, switch to allkeys-* policy or add TTLs.

### Issue: High Eviction Rate

Symptom: Thousands of evictions per second.

Diagnosis:

```bash
# Check memory pressure
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"
```

Solutions:

- Increase maxmemory if possible
- Review data being stored (are you caching too much?)
- Consider data compression
- Implement application-level cache tiers

### Issue: Wrong Keys Being Evicted

Symptom: Important keys getting evicted while less important keys persist.

Solutions:

1. Switch from LRU to LFU if popular keys are not accessed in bursts
2. Use volatile-* policies and add TTL only to evictable keys
3. Separate critical data into a different Redis instance

Example of protecting important keys:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Critical data - no TTL, protected with volatile-lru policy
def store_critical(key, value):
    r.set(f"critical:{key}", value)

# Cache data - has TTL, can be evicted
def cache_data(key, value, ttl=3600):
    r.setex(f"cache:{key}", ttl, value)
```

### Issue: Memory Fragmentation

Symptom: used_memory_rss much higher than used_memory.

```bash
redis-cli INFO memory | grep mem_fragmentation_ratio
```

```
mem_fragmentation_ratio:2.50
```

Ratio above 1.5 indicates fragmentation. Solutions:

```conf
# Enable active defragmentation (Redis 4.0+)
activedefrag yes
active-defrag-ignore-bytes 100mb
active-defrag-threshold-lower 10
active-defrag-threshold-upper 100
```

## Best Practices Summary

### Choosing the Right Policy

| Your Situation | Recommended Policy |
|---------------|-------------------|
| General purpose cache | allkeys-lru |
| Some keys more popular than others | allkeys-lfu |
| Mix of cache and persistent data | volatile-lru or volatile-lfu |
| Time-sensitive expiring data | volatile-ttl |
| Uniform access patterns | allkeys-random |
| Cannot lose any data | noeviction |

### Configuration Checklist

1. Set maxmemory to 70-80% of available RAM
2. Choose policy based on access patterns
3. Use maxmemory-samples 5-10 for good accuracy
4. Monitor eviction rate and memory usage
5. Track cache hit ratio
6. Set up alerts before problems occur

### Code Patterns

Always handle eviction gracefully in your application:

```python
import redis
from functools import wraps

r = redis.Redis(host='localhost', port=6379)

def cache_with_fallback(ttl=3600):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{args}:{kwargs}"

            # Try cache first
            cached = r.get(cache_key)
            if cached is not None:
                return cached.decode('utf-8')

            # Cache miss or evicted - compute value
            result = func(*args, **kwargs)

            # Store in cache (might be evicted later, that's ok)
            try:
                r.setex(cache_key, ttl, result)
            except redis.exceptions.ResponseError:
                # Handle OOM gracefully
                pass

            return result
        return wrapper
    return decorator

@cache_with_fallback(ttl=3600)
def expensive_computation(user_id):
    # Simulated expensive operation
    return f"computed_result_for_{user_id}"
```

## Conclusion

Redis key eviction is about tradeoffs. You trade memory for hit rate, accuracy for performance, and complexity for control. The right strategy depends on your data, access patterns, and what happens when a cache miss occurs.

Start with allkeys-lru for most caching scenarios. Switch to LFU if you notice popular items being evicted. Use volatile-* policies when you need to protect certain keys. Monitor evictions continuously and adjust maxmemory based on actual usage.

The best eviction policy is one you do not notice - your cache just works, hit rates stay high, and memory usage stays within bounds.
