# How to Use Redis Data Tiering for Cost Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Tiering, Cost Optimization, ElastiCache, Flash, Architecture

Description: Reduce Redis infrastructure costs by implementing data tiering strategies that keep frequently accessed hot data in memory while moving cold data to cheaper storage tiers.

---

## What Is Redis Data Tiering

Data tiering is a cost optimization strategy where you store data in multiple tiers based on access frequency:

- **Hot tier** - frequently accessed data in full RAM Redis
- **Warm tier** - less frequent data in a cheaper instance or with reduced RAM
- **Cold tier** - rarely accessed data in a persistent database or object storage

By tiering data, you can run a smaller (cheaper) Redis instance for your true hot data while still serving all queries.

## AWS ElastiCache Data Tiering

AWS ElastiCache for Redis offers data tiering on `r6gd` instance types that include NVMe SSD. Data tiering in ElastiCache automatically moves less-accessed data from RAM to the local SSD:

```bash
# Create a data-tiering enabled replication group
aws elasticache create-replication-group \
  --replication-group-id my-tiered-cluster \
  --replication-group-description "Data tiering enabled cluster" \
  --cache-node-type cache.r6gd.xlarge \
  --engine redis \
  --engine-version 6.2 \
  --num-cache-clusters 1 \
  --data-tiering-enabled

# Verify data tiering is enabled
aws elasticache describe-replication-groups \
  --replication-group-id my-tiered-cluster \
  --query 'ReplicationGroups[0].DataTiering'
```

### Supported Instance Types

Data tiering requires `r6gd` instance family:
- `cache.r6gd.xlarge` - ~26 GiB memory + ~237 GiB NVMe SSD
- `cache.r6gd.2xlarge` - ~53 GiB memory + ~474 GiB NVMe SSD
- `cache.r6gd.4xlarge` - ~106 GiB memory + ~950 GiB NVMe SSD

The effective capacity is RAM + NVMe SSD. You can store more data than RAM alone for a fraction of the cost of adding more RAM-only instances.

## Manual Data Tiering with Two Redis Instances

If you are not on AWS or do not have ElastiCache data tiering available, implement tiering manually:

### Architecture

```text
Application
  |
  v
Hot Cache (Redis - small, fast)
  |-- Cache miss
  v
Warm Cache (Redis - larger, cheaper)
  |-- Cache miss
  v
Persistent Database (PostgreSQL, MongoDB)
```

### Implementation

```python
import redis
import json

class TieredCache:
    def __init__(self):
        # Hot tier: small, expensive instance (e.g., r6g.large)
        self.hot = redis.Redis(host='hot-redis-host', port=6379)
        # Warm tier: larger, cheaper instance (e.g., m6g.2xlarge)
        self.warm = redis.Redis(host='warm-redis-host', port=6379)

        # TTLs for each tier
        self.hot_ttl = 300    # 5 minutes in hot cache
        self.warm_ttl = 86400  # 24 hours in warm cache

    def get(self, key):
        # Check hot tier first
        value = self.hot.get(key)
        if value is not None:
            return json.loads(value)

        # Check warm tier
        value = self.warm.get(key)
        if value is not None:
            # Promote to hot tier
            self.hot.set(key, value, ex=self.hot_ttl)
            return json.loads(value)

        return None  # Cache miss - caller queries database

    def set(self, key, value, hot=True):
        serialized = json.dumps(value)
        if hot:
            # Write to hot tier with short TTL
            self.hot.set(key, serialized, ex=self.hot_ttl)
        # Always write to warm tier
        self.warm.set(key, serialized, ex=self.warm_ttl)

    def invalidate(self, key):
        self.hot.delete(key)
        self.warm.delete(key)

cache = TieredCache()

def get_user(user_id):
    key = f'user:{user_id}'
    cached = cache.get(key)
    if cached:
        return cached
    # Query database
    user = db.get_user(user_id)
    # Store in tiered cache - mark as hot
    cache.set(key, user, hot=True)
    return user
```

## Key Access Pattern Analysis

Before implementing tiering, analyze which keys are hot vs cold:

```python
import redis

r = redis.Redis()

def analyze_key_access_patterns(sample_size=10000):
    """
    Uses OBJECT IDLETIME to classify keys by last access time
    """
    hot_keys = []
    warm_keys = []
    cold_keys = []
    cursor = 0
    count = 0

    while count < sample_size:
        cursor, keys = r.scan(cursor, count=100)
        for key in keys:
            idle = r.object("idletime", key)
            if idle is None:
                continue
            size = r.memory_usage(key) or 0
            record = (key.decode(), idle, size)

            if idle < 300:       # Hot: accessed in last 5 min
                hot_keys.append(record)
            elif idle < 86400:   # Warm: accessed in last day
                warm_keys.append(record)
            else:                # Cold: not accessed in > 1 day
                cold_keys.append(record)
            count += 1

        if cursor == 0:
            break

    hot_memory = sum(k[2] for k in hot_keys)
    warm_memory = sum(k[2] for k in warm_keys)
    cold_memory = sum(k[2] for k in cold_keys)

    total = len(hot_keys) + len(warm_keys) + len(cold_keys)
    total_mem = hot_memory + warm_memory + cold_memory

    print(f"Hot keys: {len(hot_keys)} ({100*len(hot_keys)/total:.1f}%) - {hot_memory/1024/1024:.1f} MB")
    print(f"Warm keys: {len(warm_keys)} ({100*len(warm_keys)/total:.1f}%) - {warm_memory/1024/1024:.1f} MB")
    print(f"Cold keys: {len(cold_keys)} ({100*len(cold_keys)/total:.1f}%) - {cold_memory/1024/1024:.1f} MB")
    print(f"Potential savings from tiering cold data: {cold_memory/1024/1024:.1f} MB")

analyze_key_access_patterns()
```

## Cost Comparison

```python
def estimate_tiering_savings(
    total_data_gb: float,
    hot_data_pct: float,
    ram_cost_per_gb_monthly: float = 0.10,  # e.g., ElastiCache r6g pricing
    ssd_cost_per_gb_monthly: float = 0.02   # e.g., EBS gp3 pricing
):
    hot_gb = total_data_gb * (hot_data_pct / 100)
    cold_gb = total_data_gb - hot_gb

    # Without tiering: all in RAM
    cost_no_tiering = total_data_gb * ram_cost_per_gb_monthly

    # With tiering: hot in RAM, cold in SSD/cheaper tier
    cost_with_tiering = (hot_gb * ram_cost_per_gb_monthly) + (cold_gb * ssd_cost_per_gb_monthly)

    monthly_savings = cost_no_tiering - cost_with_tiering
    savings_pct = (monthly_savings / cost_no_tiering) * 100

    print(f"Total data: {total_data_gb} GB")
    print(f"Hot data: {hot_gb:.1f} GB ({hot_data_pct}%)")
    print(f"Cold data: {cold_gb:.1f} GB")
    print(f"Monthly cost without tiering: ${cost_no_tiering:.2f}")
    print(f"Monthly cost with tiering:    ${cost_with_tiering:.2f}")
    print(f"Monthly savings: ${monthly_savings:.2f} ({savings_pct:.1f}%)")

# Example: 500 GB total, 20% hot data
estimate_tiering_savings(500, 20)
```

## Summary

Redis data tiering reduces costs by storing only hot, frequently accessed data in expensive in-memory tiers while keeping cold data on cheaper SSD or object storage. On AWS ElastiCache, use `r6gd` instances with built-in NVMe tiering enabled via `--data-tiering-enabled`. For self-hosted or multi-cloud deployments, implement manual tiering with two Redis instances of different sizes, using OBJECT IDLETIME to classify access patterns and promoting warm keys to the hot tier on access.
