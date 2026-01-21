# How to Implement Rolling Window Analytics with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Analytics, Rolling Window, Moving Average, Real-time Analytics

Description: A comprehensive guide to implementing rolling window analytics in Redis including moving averages, sliding aggregations, and real-time statistical computations.

---

Rolling window analytics are essential for real-time monitoring, anomaly detection, and trend analysis. Whether you need to calculate moving averages, track error rates over sliding windows, or compute percentiles for the last N minutes, Redis provides efficient data structures and operations to implement these patterns.

## Understanding Rolling Windows

A rolling window (or sliding window) maintains a fixed-size window of data that moves forward in time. Common use cases include:

- **Moving averages**: Smooth out fluctuations in metrics
- **Rate calculations**: Requests per second, errors per minute
- **Anomaly detection**: Compare current values to recent history
- **SLA monitoring**: Track availability over sliding periods

## Approach 1: Sorted Sets for Time-Based Windows

Sorted sets are ideal for time-based rolling windows where the score represents the timestamp.

### Basic Moving Average Implementation

```python
import redis
import time
import json
from statistics import mean, stdev

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class RollingWindow:
    def __init__(self, key, window_seconds):
        self.key = key
        self.window_seconds = window_seconds

    def add(self, value, timestamp=None):
        """Add a value to the rolling window."""
        if timestamp is None:
            timestamp = time.time()

        # Store value with unique identifier to allow duplicates
        member = f"{timestamp}:{value}"
        r.zadd(self.key, {member: timestamp})

        # Clean up old entries
        cutoff = timestamp - self.window_seconds
        r.zremrangebyscore(self.key, '-inf', cutoff)

    def get_values(self):
        """Get all values in the current window."""
        cutoff = time.time() - self.window_seconds
        members = r.zrangebyscore(self.key, cutoff, '+inf')
        return [float(m.split(':')[1]) for m in members]

    def moving_average(self):
        """Calculate the moving average."""
        values = self.get_values()
        if not values:
            return 0
        return mean(values)

    def moving_sum(self):
        """Calculate the sum over the window."""
        return sum(self.get_values())

    def count(self):
        """Count entries in the window."""
        cutoff = time.time() - self.window_seconds
        return r.zcount(self.key, cutoff, '+inf')

# Usage
window = RollingWindow('metrics:latency:5min', 300)  # 5-minute window

# Add some data
for i in range(100):
    window.add(50 + (i % 20))

print(f"Moving Average: {window.moving_average():.2f}")
print(f"Count: {window.count()}")
print(f"Sum: {window.moving_sum()}")
```

### Lua Script for Atomic Operations

```python
class AtomicRollingWindow:
    def __init__(self, key, window_seconds):
        self.key = key
        self.window_seconds = window_seconds

        # Lua script for atomic add and cleanup
        self.add_script = r.register_script("""
            local key = KEYS[1]
            local value = ARGV[1]
            local timestamp = tonumber(ARGV[2])
            local window = tonumber(ARGV[3])

            -- Add new value
            local member = timestamp .. ':' .. value
            redis.call('ZADD', key, timestamp, member)

            -- Remove old entries
            local cutoff = timestamp - window
            redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)

            return redis.call('ZCARD', key)
        """)

        # Lua script for atomic stats calculation
        self.stats_script = r.register_script("""
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local cutoff = now - window

            local members = redis.call('ZRANGEBYSCORE', key, cutoff, '+inf')
            local count = #members
            local sum = 0

            for _, member in ipairs(members) do
                local value = tonumber(string.match(member, ':(.+)$'))
                sum = sum + value
            end

            local avg = 0
            if count > 0 then
                avg = sum / count
            end

            return {count, tostring(sum), tostring(avg)}
        """)

    def add(self, value):
        """Atomically add value and cleanup old entries."""
        timestamp = time.time()
        return self.add_script(
            keys=[self.key],
            args=[value, timestamp, self.window_seconds]
        )

    def get_stats(self):
        """Get count, sum, and average atomically."""
        result = self.stats_script(
            keys=[self.key],
            args=[time.time(), self.window_seconds]
        )
        return {
            'count': result[0],
            'sum': float(result[1]),
            'average': float(result[2])
        }

# Usage
atomic_window = AtomicRollingWindow('metrics:requests:1min', 60)

for i in range(50):
    atomic_window.add(100 + i)

stats = atomic_window.get_stats()
print(f"Stats: {stats}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');
const redis = new Redis();

class RollingWindow {
  constructor(key, windowSeconds) {
    this.key = key;
    this.windowSeconds = windowSeconds;
  }

  async add(value, timestamp = Date.now() / 1000) {
    const member = `${timestamp}:${value}`;
    const cutoff = timestamp - this.windowSeconds;

    const pipeline = redis.pipeline();
    pipeline.zadd(this.key, timestamp, member);
    pipeline.zremrangebyscore(this.key, '-inf', cutoff);
    await pipeline.exec();
  }

  async getValues() {
    const cutoff = Date.now() / 1000 - this.windowSeconds;
    const members = await redis.zrangebyscore(this.key, cutoff, '+inf');
    return members.map(m => parseFloat(m.split(':')[1]));
  }

  async movingAverage() {
    const values = await this.getValues();
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  async rate() {
    // Calculate rate per second
    const count = await this.count();
    return count / this.windowSeconds;
  }

  async count() {
    const cutoff = Date.now() / 1000 - this.windowSeconds;
    return await redis.zcount(this.key, cutoff, '+inf');
  }
}

// Usage
async function main() {
  const window = new RollingWindow('metrics:api:latency', 60);

  // Simulate data
  for (let i = 0; i < 100; i++) {
    await window.add(Math.random() * 100 + 50);
  }

  console.log('Moving Average:', await window.movingAverage());
  console.log('Request Rate:', await window.rate(), 'per second');
}

main().catch(console.error);
```

## Approach 2: Fixed-Size Sliding Windows

For count-based windows (last N items), use Redis lists with LTRIM.

```python
class FixedSizeWindow:
    def __init__(self, key, max_size):
        self.key = key
        self.max_size = max_size

    def add(self, value):
        """Add value and maintain fixed window size."""
        pipe = r.pipeline()
        pipe.lpush(self.key, value)
        pipe.ltrim(self.key, 0, self.max_size - 1)
        pipe.execute()

    def get_all(self):
        """Get all values in the window."""
        values = r.lrange(self.key, 0, -1)
        return [float(v) for v in values]

    def moving_average(self):
        """Calculate moving average of window."""
        values = self.get_all()
        if not values:
            return 0
        return mean(values)

    def exponential_moving_average(self, alpha=0.2):
        """Calculate EMA with smoothing factor alpha."""
        values = self.get_all()
        if not values:
            return 0

        # Reverse to process oldest first
        values = values[::-1]
        ema = values[0]

        for value in values[1:]:
            ema = alpha * value + (1 - alpha) * ema

        return ema

# Usage
fixed_window = FixedSizeWindow('metrics:latency:last100', 100)

for i in range(200):
    fixed_window.add(50 + (i % 30))

print(f"Simple Moving Average: {fixed_window.moving_average():.2f}")
print(f"Exponential Moving Average: {fixed_window.exponential_moving_average():.2f}")
```

## Approach 3: Time Buckets for High-Performance Counters

For high-throughput scenarios, use pre-defined time buckets.

```python
class TimeBucketWindow:
    def __init__(self, key_prefix, bucket_seconds, num_buckets):
        self.key_prefix = key_prefix
        self.bucket_seconds = bucket_seconds
        self.num_buckets = num_buckets
        self.window_seconds = bucket_seconds * num_buckets

    def _get_bucket_key(self, timestamp=None):
        """Get the bucket key for a timestamp."""
        if timestamp is None:
            timestamp = time.time()
        bucket_id = int(timestamp / self.bucket_seconds)
        return f"{self.key_prefix}:{bucket_id}"

    def increment(self, amount=1, timestamp=None):
        """Increment the counter for the current bucket."""
        key = self._get_bucket_key(timestamp)
        pipe = r.pipeline()
        pipe.incrbyfloat(key, amount)
        pipe.expire(key, self.window_seconds + self.bucket_seconds)
        pipe.execute()

    def get_window_sum(self):
        """Get the sum across all buckets in the window."""
        now = time.time()
        current_bucket = int(now / self.bucket_seconds)

        # Get all bucket keys in window
        keys = [
            f"{self.key_prefix}:{current_bucket - i}"
            for i in range(self.num_buckets)
        ]

        # Fetch all values
        pipe = r.pipeline()
        for key in keys:
            pipe.get(key)
        values = pipe.execute()

        return sum(float(v) for v in values if v is not None)

    def get_rate_per_second(self):
        """Calculate the rate per second over the window."""
        total = self.get_window_sum()
        return total / self.window_seconds

# Usage: Track requests per minute using 5-second buckets
request_counter = TimeBucketWindow('requests:api', 5, 12)  # 12 x 5s = 60s

# Simulate traffic
for _ in range(1000):
    request_counter.increment()

print(f"Total in window: {request_counter.get_window_sum()}")
print(f"Rate per second: {request_counter.get_rate_per_second():.2f}")
```

### Optimized Lua Script Version

```python
class OptimizedTimeBucketWindow:
    def __init__(self, key_prefix, bucket_seconds, num_buckets):
        self.key_prefix = key_prefix
        self.bucket_seconds = bucket_seconds
        self.num_buckets = num_buckets

        self.increment_script = r.register_script("""
            local prefix = KEYS[1]
            local amount = tonumber(ARGV[1])
            local bucket_seconds = tonumber(ARGV[2])
            local ttl = tonumber(ARGV[3])
            local now = tonumber(ARGV[4])

            local bucket_id = math.floor(now / bucket_seconds)
            local key = prefix .. ':' .. bucket_id

            local new_value = redis.call('INCRBYFLOAT', key, amount)
            redis.call('EXPIRE', key, ttl)

            return new_value
        """)

        self.sum_script = r.register_script("""
            local prefix = KEYS[1]
            local bucket_seconds = tonumber(ARGV[1])
            local num_buckets = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])

            local current_bucket = math.floor(now / bucket_seconds)
            local sum = 0

            for i = 0, num_buckets - 1 do
                local key = prefix .. ':' .. (current_bucket - i)
                local value = redis.call('GET', key)
                if value then
                    sum = sum + tonumber(value)
                end
            end

            return tostring(sum)
        """)

    def increment(self, amount=1):
        """Atomically increment and set expiry."""
        ttl = self.bucket_seconds * (self.num_buckets + 1)
        return self.increment_script(
            keys=[self.key_prefix],
            args=[amount, self.bucket_seconds, ttl, time.time()]
        )

    def get_sum(self):
        """Get sum across all buckets."""
        result = self.sum_script(
            keys=[self.key_prefix],
            args=[self.bucket_seconds, self.num_buckets, time.time()]
        )
        return float(result)
```

## Approach 4: HyperLogLog for Unique Counts

When you need to count unique items in a rolling window, combine HyperLogLog with time buckets.

```python
class UniqueCountWindow:
    def __init__(self, key_prefix, bucket_seconds, num_buckets):
        self.key_prefix = key_prefix
        self.bucket_seconds = bucket_seconds
        self.num_buckets = num_buckets

    def _get_bucket_key(self, timestamp=None):
        if timestamp is None:
            timestamp = time.time()
        bucket_id = int(timestamp / self.bucket_seconds)
        return f"{self.key_prefix}:{bucket_id}"

    def add(self, item):
        """Add an item to the current HLL bucket."""
        key = self._get_bucket_key()
        ttl = self.bucket_seconds * (self.num_buckets + 1)

        pipe = r.pipeline()
        pipe.pfadd(key, item)
        pipe.expire(key, ttl)
        pipe.execute()

    def count_unique(self):
        """Count unique items across the window."""
        now = time.time()
        current_bucket = int(now / self.bucket_seconds)

        keys = [
            f"{self.key_prefix}:{current_bucket - i}"
            for i in range(self.num_buckets)
        ]

        # Filter to only existing keys
        existing_keys = [k for k in keys if r.exists(k)]

        if not existing_keys:
            return 0

        # PFCOUNT can merge multiple HLLs
        return r.pfcount(*existing_keys)

# Track unique visitors per hour using 10-minute buckets
visitors = UniqueCountWindow('visitors:hourly', 600, 6)  # 6 x 10min = 1hr

# Simulate visitors
for i in range(10000):
    visitors.add(f"user:{i % 500}")  # 500 unique users

print(f"Unique visitors in window: {visitors.count_unique()}")
```

## Real-World Example: API Rate Monitoring

```python
class APIMetrics:
    def __init__(self, endpoint):
        self.endpoint = endpoint
        self.request_window = TimeBucketWindow(
            f'api:{endpoint}:requests', 10, 6
        )  # 1-minute window
        self.error_window = TimeBucketWindow(
            f'api:{endpoint}:errors', 10, 6
        )
        self.latency_window = RollingWindow(
            f'api:{endpoint}:latency', 60
        )

    def record_request(self, latency_ms, is_error=False):
        """Record an API request."""
        self.request_window.increment()
        self.latency_window.add(latency_ms)

        if is_error:
            self.error_window.increment()

    def get_metrics(self):
        """Get current rolling metrics."""
        total_requests = self.request_window.get_window_sum()
        total_errors = self.error_window.get_window_sum()
        avg_latency = self.latency_window.moving_average()

        error_rate = 0
        if total_requests > 0:
            error_rate = (total_errors / total_requests) * 100

        return {
            'requests_per_second': self.request_window.get_rate_per_second(),
            'total_requests': total_requests,
            'error_rate_percent': error_rate,
            'avg_latency_ms': avg_latency
        }

# Usage
api = APIMetrics('/api/users')

# Simulate traffic
import random
for _ in range(500):
    latency = random.randint(10, 200)
    is_error = random.random() < 0.05  # 5% error rate
    api.record_request(latency, is_error)

metrics = api.get_metrics()
print(f"API Metrics: {metrics}")
```

## Best Practices

### 1. Choose the Right Window Granularity

```python
# For real-time dashboards: small buckets, fewer of them
realtime = TimeBucketWindow('metrics:realtime', 1, 60)  # 1s buckets, 1min

# For trend analysis: larger buckets, more of them
trends = TimeBucketWindow('metrics:trends', 300, 288)  # 5min buckets, 24hr
```

### 2. Use Pipelines for Batch Operations

```python
def record_batch_metrics(metrics):
    """Record multiple metrics efficiently."""
    pipe = r.pipeline()

    for metric in metrics:
        key = f"metrics:{metric['name']}"
        timestamp = metric.get('timestamp', time.time())
        member = f"{timestamp}:{metric['value']}"

        pipe.zadd(key, {member: timestamp})

    pipe.execute()
```

### 3. Implement Cleanup Strategies

```python
def cleanup_expired_windows(pattern, max_age):
    """Clean up old data from rolling windows."""
    cutoff = time.time() - max_age

    for key in r.scan_iter(match=pattern):
        r.zremrangebyscore(key, '-inf', cutoff)
```

## Conclusion

Rolling window analytics in Redis enable real-time monitoring and statistical analysis with minimal latency. Choose your approach based on your requirements:

- **Sorted sets**: Best for time-based windows with precise timestamps
- **Fixed-size lists**: Ideal for count-based windows (last N items)
- **Time buckets**: Optimal for high-throughput counters and rates
- **HyperLogLog buckets**: Perfect for unique count estimation

For production systems, combine these patterns to build comprehensive monitoring solutions that track rates, averages, and trends across multiple time horizons.
