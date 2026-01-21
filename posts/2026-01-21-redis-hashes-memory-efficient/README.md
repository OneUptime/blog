# How to Use Redis Hashes for Memory-Efficient Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hashes, Memory Optimization, Data Structures, Ziplist, Performance

Description: A comprehensive guide to using Redis hashes for memory-efficient storage, covering ziplist encoding, hash-max-ziplist optimizations, and patterns for storing millions of small objects efficiently.

---

Redis hashes can be dramatically more memory-efficient than storing individual keys when properly configured. By leveraging ziplist encoding, you can store millions of small objects using a fraction of the memory. This guide covers the internals, configuration, and practical patterns for memory-optimized Redis storage.

## Understanding Redis Hash Memory Optimization

Redis uses two internal encodings for hashes:

1. **Ziplist (listpack in Redis 7.0+)**: Compact, memory-efficient encoding for small hashes
2. **Hashtable**: Standard hash table for larger hashes

The magic happens with ziplist encoding - it stores data in a contiguous memory block without the overhead of pointers, resulting in 5-10x memory savings for small objects.

## Ziplist Configuration Thresholds

```bash
# Check current settings
redis-cli CONFIG GET hash-max-ziplist-entries
redis-cli CONFIG GET hash-max-ziplist-value

# Default values:
# hash-max-ziplist-entries: 512
# hash-max-ziplist-value: 64

# Optimize for more entries per hash
redis-cli CONFIG SET hash-max-ziplist-entries 1024
redis-cli CONFIG SET hash-max-ziplist-value 128
```

A hash uses ziplist encoding when BOTH conditions are met:
- Number of fields <= hash-max-ziplist-entries
- All field names and values are <= hash-max-ziplist-value bytes

## Memory Comparison: Keys vs Hashes

```python
import redis
import sys

r = redis.Redis(host='localhost', port=6379)

def measure_memory(key_pattern):
    """Measure memory used by keys matching pattern"""
    total = 0
    for key in r.scan_iter(match=key_pattern):
        total += r.memory_usage(key) or 0
    return total

# Method 1: Individual keys
def store_as_keys(count):
    """Store each item as separate key"""
    r.flushdb()
    for i in range(count):
        r.set(f'user:{i}:name', f'User {i}')
        r.set(f'user:{i}:email', f'user{i}@example.com')
        r.set(f'user:{i}:age', str(20 + i % 50))

    return r.dbsize(), r.info('memory')['used_memory']

# Method 2: Hashes per user
def store_as_user_hashes(count):
    """Store each user as a hash"""
    r.flushdb()
    for i in range(count):
        r.hset(f'user:{i}', mapping={
            'name': f'User {i}',
            'email': f'user{i}@example.com',
            'age': str(20 + i % 50)
        })

    return r.dbsize(), r.info('memory')['used_memory']

# Method 3: Bucket hashes (most efficient)
def store_as_bucket_hashes(count, bucket_size=100):
    """Store users in bucket hashes"""
    r.flushdb()
    for i in range(count):
        bucket = i // bucket_size
        field = f'{i}:name'
        r.hset(f'users:{bucket}', mapping={
            f'{i}:name': f'User {i}',
            f'{i}:email': f'user{i}@example.com',
            f'{i}:age': str(20 + i % 50)
        })

    return r.dbsize(), r.info('memory')['used_memory']

# Compare
count = 10000

keys, mem1 = store_as_keys(count)
print(f"Individual keys: {keys} keys, {mem1 / 1024 / 1024:.2f} MB")

keys, mem2 = store_as_user_hashes(count)
print(f"User hashes: {keys} keys, {mem2 / 1024 / 1024:.2f} MB")

keys, mem3 = store_as_bucket_hashes(count, 100)
print(f"Bucket hashes: {keys} keys, {mem3 / 1024 / 1024:.2f} MB")

print(f"\nMemory savings:")
print(f"  User hashes vs keys: {(1 - mem2/mem1) * 100:.1f}%")
print(f"  Bucket hashes vs keys: {(1 - mem3/mem1) * 100:.1f}%")
```

Typical results for 10,000 users with 3 fields each:
- Individual keys: ~8 MB
- User hashes: ~3 MB
- Bucket hashes: ~1 MB

## Hash Bucketing Pattern

The most memory-efficient pattern groups items into hash buckets:

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class HashBucketStore:
    def __init__(self, name, bucket_size=100, redis_client=None):
        self.name = name
        self.bucket_size = bucket_size
        self.redis = redis_client or r

    def _get_bucket_and_key(self, item_id):
        """Calculate bucket and field key for item"""
        # Convert string IDs to int for bucketing
        if isinstance(item_id, str):
            # Hash string IDs for consistent bucketing
            numeric_id = hash(item_id) % (10 ** 9)
        else:
            numeric_id = item_id

        bucket = numeric_id // self.bucket_size
        return f"{self.name}:{bucket}", str(item_id)

    def set(self, item_id, data):
        """Store item data"""
        bucket_key, field = self._get_bucket_and_key(item_id)

        if isinstance(data, dict):
            data = json.dumps(data)

        self.redis.hset(bucket_key, field, data)

    def get(self, item_id):
        """Retrieve item data"""
        bucket_key, field = self._get_bucket_and_key(item_id)
        data = self.redis.hget(bucket_key, field)

        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                return data
        return None

    def delete(self, item_id):
        """Delete item"""
        bucket_key, field = self._get_bucket_and_key(item_id)
        return self.redis.hdel(bucket_key, field)

    def exists(self, item_id):
        """Check if item exists"""
        bucket_key, field = self._get_bucket_and_key(item_id)
        return self.redis.hexists(bucket_key, field)

    def mset(self, items):
        """Bulk set items"""
        # Group by bucket
        by_bucket = {}
        for item_id, data in items.items():
            bucket_key, field = self._get_bucket_and_key(item_id)
            if bucket_key not in by_bucket:
                by_bucket[bucket_key] = {}

            if isinstance(data, dict):
                data = json.dumps(data)
            by_bucket[bucket_key][field] = data

        # Execute in pipeline
        pipe = self.redis.pipeline()
        for bucket_key, fields in by_bucket.items():
            pipe.hset(bucket_key, mapping=fields)
        pipe.execute()

    def mget(self, item_ids):
        """Bulk get items"""
        # Group by bucket
        by_bucket = {}
        for item_id in item_ids:
            bucket_key, field = self._get_bucket_and_key(item_id)
            if bucket_key not in by_bucket:
                by_bucket[bucket_key] = []
            by_bucket[bucket_key].append((item_id, field))

        # Fetch all at once
        pipe = self.redis.pipeline()
        order = []  # Track order for result mapping

        for bucket_key, items in by_bucket.items():
            for item_id, field in items:
                pipe.hget(bucket_key, field)
                order.append(item_id)

        results = pipe.execute()

        # Map results back to item IDs
        output = {}
        for item_id, data in zip(order, results):
            if data:
                try:
                    output[item_id] = json.loads(data)
                except json.JSONDecodeError:
                    output[item_id] = data

        return output

# Usage
store = HashBucketStore('sessions', bucket_size=100)

# Store sessions
store.set('sess_abc123', {'user_id': 1, 'created': '2024-01-15'})
store.set('sess_def456', {'user_id': 2, 'created': '2024-01-15'})

# Retrieve
session = store.get('sess_abc123')
print(f"Session: {session}")

# Bulk operations
store.mset({
    'sess_001': {'user_id': 10},
    'sess_002': {'user_id': 20},
    'sess_003': {'user_id': 30}
})

sessions = store.mget(['sess_001', 'sess_002', 'sess_abc123'])
print(f"Bulk get: {sessions}")
```

## Multi-Field Storage Without JSON

For structured data, store fields directly in the hash:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class EfficientUserStore:
    def __init__(self, bucket_size=100, redis_client=None):
        self.bucket_size = bucket_size
        self.redis = redis_client or r
        self.fields = ['name', 'email', 'age', 'created_at', 'status']

    def _bucket_key(self, user_id):
        bucket = int(user_id) // self.bucket_size
        return f"users:{bucket}"

    def _field_key(self, user_id, field):
        return f"{user_id}:{field}"

    def set_user(self, user_id, **data):
        """Store user with individual fields in hash"""
        bucket_key = self._bucket_key(user_id)

        mapping = {}
        for field in self.fields:
            if field in data:
                mapping[self._field_key(user_id, field)] = str(data[field])

        if mapping:
            self.redis.hset(bucket_key, mapping=mapping)

    def get_user(self, user_id):
        """Get all fields for a user"""
        bucket_key = self._bucket_key(user_id)

        # Build field keys
        field_keys = [self._field_key(user_id, f) for f in self.fields]

        # Get all fields at once
        values = self.redis.hmget(bucket_key, field_keys)

        # Build result dict
        result = {}
        for field, value in zip(self.fields, values):
            if value is not None:
                result[field] = value

        return result if result else None

    def get_field(self, user_id, field):
        """Get single field for a user"""
        bucket_key = self._bucket_key(user_id)
        return self.redis.hget(bucket_key, self._field_key(user_id, field))

    def set_field(self, user_id, field, value):
        """Set single field for a user"""
        bucket_key = self._bucket_key(user_id)
        self.redis.hset(bucket_key, self._field_key(user_id, field), str(value))

    def delete_user(self, user_id):
        """Delete all fields for a user"""
        bucket_key = self._bucket_key(user_id)
        field_keys = [self._field_key(user_id, f) for f in self.fields]
        self.redis.hdel(bucket_key, *field_keys)

    def increment_field(self, user_id, field, amount=1):
        """Increment a numeric field"""
        bucket_key = self._bucket_key(user_id)
        return self.redis.hincrby(bucket_key, self._field_key(user_id, field), amount)

# Usage
users = EfficientUserStore(bucket_size=100)

# Store users
users.set_user(1, name='Alice', email='alice@example.com', age=30, status='active')
users.set_user(2, name='Bob', email='bob@example.com', age=25, status='active')

# Retrieve
user = users.get_user(1)
print(f"User 1: {user}")

# Get single field
email = users.get_field(1, 'email')
print(f"Email: {email}")

# Update single field
users.set_field(1, 'status', 'premium')
```

## Memory-Efficient Counters

Store millions of counters efficiently:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class EfficientCounters:
    def __init__(self, name, bucket_size=500, redis_client=None):
        self.name = name
        self.bucket_size = bucket_size
        self.redis = redis_client or r

    def _bucket_key(self, counter_id):
        # Use hash of counter_id for distribution
        bucket = hash(counter_id) % 10000
        return f"counters:{self.name}:{bucket}"

    def increment(self, counter_id, amount=1):
        """Increment a counter"""
        return self.redis.hincrby(
            self._bucket_key(counter_id),
            str(counter_id),
            amount
        )

    def decrement(self, counter_id, amount=1):
        """Decrement a counter"""
        return self.redis.hincrby(
            self._bucket_key(counter_id),
            str(counter_id),
            -amount
        )

    def get(self, counter_id):
        """Get counter value"""
        value = self.redis.hget(
            self._bucket_key(counter_id),
            str(counter_id)
        )
        return int(value) if value else 0

    def mget(self, counter_ids):
        """Get multiple counter values"""
        # Group by bucket
        by_bucket = {}
        for cid in counter_ids:
            bucket_key = self._bucket_key(cid)
            if bucket_key not in by_bucket:
                by_bucket[bucket_key] = []
            by_bucket[bucket_key].append(cid)

        # Fetch
        pipe = self.redis.pipeline()
        order = []

        for bucket_key, cids in by_bucket.items():
            for cid in cids:
                pipe.hget(bucket_key, str(cid))
                order.append(cid)

        results = pipe.execute()

        return {
            cid: int(val) if val else 0
            for cid, val in zip(order, results)
        }

    def set(self, counter_id, value):
        """Set counter to specific value"""
        self.redis.hset(
            self._bucket_key(counter_id),
            str(counter_id),
            value
        )

    def reset(self, counter_id):
        """Reset counter to zero"""
        self.redis.hdel(
            self._bucket_key(counter_id),
            str(counter_id)
        )

# Usage: Page view counters
views = EfficientCounters('pageviews')

# Increment page views
views.increment('page:/home')
views.increment('page:/about')
views.increment('page:/home')
views.increment('page:/products/123')

# Get view count
home_views = views.get('page:/home')
print(f"Home page views: {home_views}")

# Bulk get
counts = views.mget(['page:/home', 'page:/about', 'page:/products/123'])
print(f"All counts: {counts}")
```

## Time-Series Bucketing

Store time-series data efficiently:

```python
import redis
import time
from datetime import datetime, timedelta

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class TimeSeriesBuckets:
    def __init__(self, name, bucket_interval_seconds=3600, redis_client=None):
        self.name = name
        self.bucket_interval = bucket_interval_seconds  # 1 hour default
        self.redis = redis_client or r

    def _bucket_key(self, timestamp):
        """Get bucket key for timestamp"""
        bucket = int(timestamp // self.bucket_interval)
        return f"ts:{self.name}:{bucket}"

    def _field_key(self, timestamp, metric_id):
        """Get field key within bucket"""
        offset = int(timestamp % self.bucket_interval)
        return f"{metric_id}:{offset}"

    def record(self, metric_id, value, timestamp=None):
        """Record a metric value"""
        ts = timestamp or time.time()
        bucket_key = self._bucket_key(ts)
        field_key = self._field_key(ts, metric_id)

        pipe = self.redis.pipeline()
        pipe.hset(bucket_key, field_key, value)
        # Set expiration on bucket (e.g., 7 days)
        pipe.expire(bucket_key, 86400 * 7)
        pipe.execute()

    def record_many(self, metric_id, values_with_timestamps):
        """Record multiple values efficiently"""
        by_bucket = {}

        for value, ts in values_with_timestamps:
            bucket_key = self._bucket_key(ts)
            field_key = self._field_key(ts, metric_id)

            if bucket_key not in by_bucket:
                by_bucket[bucket_key] = {}
            by_bucket[bucket_key][field_key] = value

        pipe = self.redis.pipeline()
        for bucket_key, fields in by_bucket.items():
            pipe.hset(bucket_key, mapping=fields)
            pipe.expire(bucket_key, 86400 * 7)
        pipe.execute()

    def get_range(self, metric_id, start_time, end_time):
        """Get values in time range"""
        values = []

        # Iterate through buckets in range
        current_bucket = int(start_time // self.bucket_interval)
        end_bucket = int(end_time // self.bucket_interval)

        pipe = self.redis.pipeline()
        bucket_keys = []

        while current_bucket <= end_bucket:
            bucket_key = f"ts:{self.name}:{current_bucket}"
            pipe.hgetall(bucket_key)
            bucket_keys.append((bucket_key, current_bucket))
            current_bucket += 1

        results = pipe.execute()

        for (bucket_key, bucket_num), bucket_data in zip(bucket_keys, results):
            for field_key, value in bucket_data.items():
                parts = field_key.split(':')
                if parts[0] == metric_id:
                    offset = int(parts[1])
                    ts = bucket_num * self.bucket_interval + offset

                    if start_time <= ts <= end_time:
                        values.append((ts, float(value)))

        values.sort(key=lambda x: x[0])
        return values

    def aggregate(self, metric_id, start_time, end_time, func='avg'):
        """Aggregate values in range"""
        values = self.get_range(metric_id, start_time, end_time)

        if not values:
            return None

        nums = [v[1] for v in values]

        if func == 'avg':
            return sum(nums) / len(nums)
        elif func == 'sum':
            return sum(nums)
        elif func == 'min':
            return min(nums)
        elif func == 'max':
            return max(nums)
        elif func == 'count':
            return len(nums)

# Usage
ts = TimeSeriesBuckets('cpu_metrics', bucket_interval_seconds=3600)

# Record metrics
for i in range(100):
    ts.record('server1', 45 + i % 20, time.time() - i * 60)

# Query range
now = time.time()
hour_ago = now - 3600

values = ts.get_range('server1', hour_ago, now)
print(f"Got {len(values)} data points")

# Aggregate
avg = ts.aggregate('server1', hour_ago, now, 'avg')
print(f"Average CPU: {avg:.2f}")
```

## Monitoring Hash Efficiency

Check if your hashes are using ziplist encoding:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

def analyze_hash(key):
    """Analyze a hash for memory efficiency"""
    # Get encoding
    encoding = r.object('encoding', key)
    print(f"Key: {key}")
    print(f"  Encoding: {encoding}")  # 'ziplist', 'listpack', or 'hashtable'

    # Get memory usage
    memory = r.memory_usage(key)
    print(f"  Memory: {memory} bytes")

    # Get field count
    field_count = r.hlen(key)
    print(f"  Fields: {field_count}")

    # Sample field sizes
    fields = r.hkeys(key)[:5]  # Sample first 5
    for field in fields:
        value = r.hget(key, field)
        print(f"    Field '{field}': {len(value)} bytes")

    # Calculate bytes per field
    if field_count > 0:
        print(f"  Avg memory per field: {memory / field_count:.1f} bytes")

    # Check if ziplist thresholds might be exceeded
    config_entries = int(r.config_get('hash-max-ziplist-entries')['hash-max-ziplist-entries'])
    config_value = int(r.config_get('hash-max-ziplist-value')['hash-max-ziplist-value'])

    if field_count > config_entries:
        print(f"  WARNING: Field count {field_count} exceeds ziplist threshold {config_entries}")
    if encoding != b'ziplist' and encoding != b'listpack':
        print(f"  WARNING: Not using compact encoding")

# Usage
r.hset('test_hash', mapping={f'field{i}': f'value{i}' for i in range(100)})
analyze_hash('test_hash')
```

## Configuration Recommendations

```bash
# For storing many small objects (sessions, counters, etc.)
# Increase entries threshold
redis-cli CONFIG SET hash-max-ziplist-entries 1024

# For storing larger field values (JSON, longer strings)
# Increase value threshold
redis-cli CONFIG SET hash-max-ziplist-value 256

# Monitor memory efficiency
redis-cli INFO memory | grep hash

# Check specific hash encoding
redis-cli DEBUG OBJECT myhash
```

## Best Practices Summary

1. **Use bucket hashes** for millions of small objects
2. **Keep bucket size under ziplist threshold** (default 512)
3. **Keep field values short** (under 64 bytes default)
4. **Tune hash-max-ziplist-* settings** for your workload
5. **Monitor encoding** to ensure ziplist is used
6. **Avoid HGETALL on large hashes** - use HSCAN
7. **Consider field naming** - shorter field names save memory

## Conclusion

Redis hashes with ziplist encoding can reduce memory usage by 5-10x compared to individual keys. The key strategies are:

- Group related data into hash buckets
- Keep bucket sizes within ziplist thresholds
- Use efficient field naming
- Monitor encoding to verify optimization

For applications storing millions of small objects like sessions, counters, or cached data, properly configured hash storage can be the difference between fitting in memory and needing to scale out.
