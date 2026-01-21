# How to Calculate Percentiles and Histograms with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Percentiles, Histograms, Statistics, Analytics, Performance Monitoring

Description: A comprehensive guide to calculating percentiles, histograms, and statistical aggregations at scale using Redis data structures and algorithms.

---

Percentiles and histograms are essential for understanding the distribution of your data - from API latencies to user engagement metrics. While Redis does not have built-in statistical functions, its data structures can be cleverly used to compute these metrics efficiently at scale.

## Understanding Percentiles and Histograms

- **Percentiles**: The value below which a given percentage of observations fall (e.g., p99 latency means 99% of requests are faster than this value)
- **Histograms**: A representation of data distribution by grouping values into buckets

## Approach 1: Sorted Sets for Exact Percentiles

Sorted sets maintain elements in order by score, making them ideal for percentile calculations.

### Basic Percentile Calculation

```python
import redis
import time
import random
from statistics import median, quantiles

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

class PercentileTracker:
    def __init__(self, key, max_samples=10000):
        self.key = key
        self.max_samples = max_samples

    def add_value(self, value, timestamp=None):
        """Add a value to the dataset."""
        if timestamp is None:
            timestamp = time.time()

        # Use value as score, timestamp:value as member for uniqueness
        member = f"{timestamp}:{value}"
        r.zadd(self.key, {member: value})

        # Trim to max samples (remove lowest scores if over limit)
        current_size = r.zcard(self.key)
        if current_size > self.max_samples:
            r.zremrangebyrank(self.key, 0, current_size - self.max_samples - 1)

    def get_percentile(self, percentile):
        """Get the value at a specific percentile (0-100)."""
        total = r.zcard(self.key)
        if total == 0:
            return None

        # Calculate the rank for the percentile
        rank = int((percentile / 100.0) * (total - 1))

        # Get the value at that rank
        result = r.zrange(self.key, rank, rank, withscores=True)
        if result:
            return result[0][1]  # Return the score (value)
        return None

    def get_percentiles(self, percentiles):
        """Get multiple percentiles efficiently."""
        total = r.zcard(self.key)
        if total == 0:
            return {p: None for p in percentiles}

        results = {}
        pipe = r.pipeline()

        for p in percentiles:
            rank = int((p / 100.0) * (total - 1))
            pipe.zrange(self.key, rank, rank, withscores=True)

        responses = pipe.execute()

        for p, response in zip(percentiles, responses):
            if response:
                results[f"p{p}"] = response[0][1]
            else:
                results[f"p{p}"] = None

        return results

    def get_stats(self):
        """Get comprehensive statistics."""
        total = r.zcard(self.key)
        if total == 0:
            return None

        # Get min, max
        min_result = r.zrange(self.key, 0, 0, withscores=True)
        max_result = r.zrange(self.key, -1, -1, withscores=True)

        # Get percentiles
        percentiles = self.get_percentiles([50, 75, 90, 95, 99])

        return {
            'count': total,
            'min': min_result[0][1] if min_result else None,
            'max': max_result[0][1] if max_result else None,
            **percentiles
        }

# Usage
tracker = PercentileTracker('latency:api:users')

# Add sample latency data
for _ in range(10000):
    # Simulate latency distribution
    latency = random.expovariate(1/50) + 10  # Exponential with min 10ms
    tracker.add_value(latency)

# Get statistics
stats = tracker.get_stats()
print(f"Latency stats: {stats}")

# Get specific percentile
p99 = tracker.get_percentile(99)
print(f"P99 Latency: {p99:.2f}ms")
```

### Time-Windowed Percentiles

```python
class WindowedPercentileTracker:
    def __init__(self, key_prefix, window_seconds=300):
        self.key_prefix = key_prefix
        self.window_seconds = window_seconds

    def add_value(self, value):
        """Add value to current time window."""
        timestamp = time.time()
        bucket = int(timestamp / self.window_seconds)
        key = f"{self.key_prefix}:{bucket}"

        member = f"{timestamp}:{value}"
        pipe = r.pipeline()
        pipe.zadd(key, {member: value})
        pipe.expire(key, self.window_seconds * 3)  # Keep 3 windows
        pipe.execute()

    def get_percentile(self, percentile, num_windows=1):
        """Get percentile across recent windows."""
        current_time = time.time()
        current_bucket = int(current_time / self.window_seconds)

        # Collect keys for requested windows
        keys = [
            f"{self.key_prefix}:{current_bucket - i}"
            for i in range(num_windows)
        ]

        # Use ZUNIONSTORE to merge windows
        temp_key = f"temp:percentile:{time.time()}"
        r.zunionstore(temp_key, keys)

        total = r.zcard(temp_key)
        if total == 0:
            r.delete(temp_key)
            return None

        rank = int((percentile / 100.0) * (total - 1))
        result = r.zrange(temp_key, rank, rank, withscores=True)

        r.delete(temp_key)

        return result[0][1] if result else None

    def get_window_stats(self, num_windows=1):
        """Get stats across windows."""
        current_time = time.time()
        current_bucket = int(current_time / self.window_seconds)

        keys = [
            f"{self.key_prefix}:{current_bucket - i}"
            for i in range(num_windows)
        ]

        temp_key = f"temp:stats:{time.time()}"
        r.zunionstore(temp_key, keys)

        total = r.zcard(temp_key)
        if total == 0:
            r.delete(temp_key)
            return None

        # Calculate percentiles
        percentile_ranks = {
            'p50': int(0.50 * (total - 1)),
            'p90': int(0.90 * (total - 1)),
            'p95': int(0.95 * (total - 1)),
            'p99': int(0.99 * (total - 1)),
        }

        pipe = r.pipeline()
        pipe.zrange(temp_key, 0, 0, withscores=True)  # min
        pipe.zrange(temp_key, -1, -1, withscores=True)  # max

        for rank in percentile_ranks.values():
            pipe.zrange(temp_key, rank, rank, withscores=True)

        results = pipe.execute()
        r.delete(temp_key)

        stats = {
            'count': total,
            'min': results[0][0][1] if results[0] else None,
            'max': results[1][0][1] if results[1] else None,
        }

        for i, (name, _) in enumerate(percentile_ranks.items()):
            if results[i + 2]:
                stats[name] = results[i + 2][0][1]

        return stats

# Usage
windowed = WindowedPercentileTracker('latency:api', window_seconds=60)

# Add data
for _ in range(5000):
    windowed.add_value(random.expovariate(1/50) + 10)

# Get stats for last 5 minutes (5 windows)
stats = windowed.get_window_stats(num_windows=5)
print(f"5-minute stats: {stats}")
```

## Approach 2: Histograms with Hash Maps

For high-throughput scenarios, pre-defined buckets are more efficient.

### Fixed-Bucket Histogram

```python
class Histogram:
    def __init__(self, key, buckets):
        """
        Initialize histogram with predefined bucket boundaries.
        buckets: list of upper bounds, e.g., [10, 25, 50, 100, 250, 500, 1000]
        """
        self.key = key
        self.buckets = sorted(buckets)
        self.bucket_labels = [str(b) for b in self.buckets] + ['inf']

    def observe(self, value):
        """Record an observation."""
        # Find the appropriate bucket
        bucket_label = 'inf'
        for i, bound in enumerate(self.buckets):
            if value <= bound:
                bucket_label = str(bound)
                break

        pipe = r.pipeline()
        pipe.hincrby(f"{self.key}:buckets", bucket_label, 1)
        pipe.hincrby(f"{self.key}:count", 'total', 1)
        pipe.hincrbyfloat(f"{self.key}:sum", 'total', value)
        pipe.execute()

    def get_histogram(self):
        """Get histogram data."""
        buckets = r.hgetall(f"{self.key}:buckets")
        count = int(r.hget(f"{self.key}:count", 'total') or 0)
        total_sum = float(r.hget(f"{self.key}:sum", 'total') or 0)

        # Build cumulative histogram
        cumulative = {}
        running_total = 0

        for label in self.bucket_labels:
            bucket_count = int(buckets.get(label, 0))
            running_total += bucket_count
            cumulative[label] = running_total

        return {
            'buckets': {k: int(v) for k, v in buckets.items()},
            'cumulative': cumulative,
            'count': count,
            'sum': total_sum,
            'mean': total_sum / count if count > 0 else 0
        }

    def estimate_percentile(self, percentile):
        """Estimate percentile from histogram buckets."""
        histogram = self.get_histogram()
        count = histogram['count']

        if count == 0:
            return None

        target = (percentile / 100.0) * count
        cumulative = histogram['cumulative']

        prev_bound = 0
        prev_count = 0

        for label in self.bucket_labels:
            current_count = cumulative[label]

            if current_count >= target:
                # Linear interpolation within bucket
                bound = float(label) if label != 'inf' else self.buckets[-1] * 2

                if current_count == prev_count:
                    return prev_bound

                # Interpolate
                fraction = (target - prev_count) / (current_count - prev_count)
                return prev_bound + fraction * (bound - prev_bound)

            prev_bound = float(label) if label != 'inf' else self.buckets[-1]
            prev_count = current_count

        return None

# Usage - Prometheus-style histogram buckets
latency_histogram = Histogram(
    'http_request_duration',
    buckets=[5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
)

# Record observations
for _ in range(10000):
    latency = random.expovariate(1/100) + 5
    latency_histogram.observe(latency)

# Get histogram
hist = latency_histogram.get_histogram()
print(f"Histogram: {hist}")

# Estimate percentiles
p50 = latency_histogram.estimate_percentile(50)
p95 = latency_histogram.estimate_percentile(95)
p99 = latency_histogram.estimate_percentile(99)
print(f"Estimated P50: {p50:.2f}, P95: {p95:.2f}, P99: {p99:.2f}")
```

### Time-Bucketed Histograms

```python
class TimeSeriesHistogram:
    def __init__(self, key_prefix, buckets, window_seconds=60):
        self.key_prefix = key_prefix
        self.buckets = sorted(buckets)
        self.bucket_labels = [str(b) for b in self.buckets] + ['inf']
        self.window_seconds = window_seconds

    def _get_time_bucket(self):
        return int(time.time() / self.window_seconds)

    def observe(self, value):
        """Record an observation in current time bucket."""
        time_bucket = self._get_time_bucket()
        key = f"{self.key_prefix}:{time_bucket}"

        # Find histogram bucket
        bucket_label = 'inf'
        for bound in self.buckets:
            if value <= bound:
                bucket_label = str(bound)
                break

        pipe = r.pipeline()
        pipe.hincrby(f"{key}:buckets", bucket_label, 1)
        pipe.hincrby(f"{key}:count", 'total', 1)
        pipe.hincrbyfloat(f"{key}:sum", 'total', value)
        pipe.expire(f"{key}:buckets", self.window_seconds * 10)
        pipe.expire(f"{key}:count", self.window_seconds * 10)
        pipe.expire(f"{key}:sum", self.window_seconds * 10)
        pipe.execute()

    def get_aggregated_histogram(self, num_windows=5):
        """Aggregate histograms across multiple time windows."""
        current_bucket = self._get_time_bucket()

        aggregated_buckets = {label: 0 for label in self.bucket_labels}
        total_count = 0
        total_sum = 0

        for i in range(num_windows):
            key = f"{self.key_prefix}:{current_bucket - i}"

            buckets = r.hgetall(f"{key}:buckets")
            count = r.hget(f"{key}:count", 'total')
            sum_val = r.hget(f"{key}:sum", 'total')

            for label, value in buckets.items():
                aggregated_buckets[label] = aggregated_buckets.get(label, 0) + int(value)

            total_count += int(count or 0)
            total_sum += float(sum_val or 0)

        return {
            'buckets': aggregated_buckets,
            'count': total_count,
            'sum': total_sum,
            'mean': total_sum / total_count if total_count > 0 else 0,
            'windows': num_windows,
            'window_seconds': self.window_seconds
        }

# Usage
ts_histogram = TimeSeriesHistogram(
    'api_latency',
    buckets=[10, 25, 50, 100, 250, 500, 1000],
    window_seconds=60
)

# Simulate traffic
for _ in range(5000):
    ts_histogram.observe(random.expovariate(1/80) + 10)

# Get 5-minute aggregation
agg = ts_histogram.get_aggregated_histogram(num_windows=5)
print(f"5-minute histogram: {agg}")
```

## Approach 3: T-Digest for Accurate Percentiles

T-Digest is an algorithm for accurate percentile estimation with bounded memory.

```python
class TDigest:
    """
    Simplified T-Digest implementation using Redis sorted sets.
    For production, consider using the Redis T-Digest module.
    """

    def __init__(self, key, compression=100):
        self.key = key
        self.compression = compression
        self.buffer_key = f"{key}:buffer"
        self.buffer_size = compression * 2

    def add(self, value, weight=1):
        """Add a value to the digest."""
        # Buffer values and periodically merge
        r.zadd(self.buffer_key, {f"{time.time()}:{value}": value})

        buffer_size = r.zcard(self.buffer_key)
        if buffer_size >= self.buffer_size:
            self._merge_buffer()

    def _merge_buffer(self):
        """Merge buffer into main digest using clustering."""
        # Get all buffer values
        buffer_values = r.zrange(self.buffer_key, 0, -1, withscores=True)

        if not buffer_values:
            return

        # Get existing centroids
        centroids = r.zrange(self.key, 0, -1, withscores=True)

        # Combine and cluster
        all_values = [(score, 1) for _, score in buffer_values]
        for member, score in centroids:
            parts = member.split(':')
            if len(parts) == 2:
                weight = float(parts[1])
                all_values.append((score, weight))

        # Sort by value
        all_values.sort(key=lambda x: x[0])

        # Cluster into centroids
        new_centroids = self._cluster(all_values)

        # Update Redis
        pipe = r.pipeline()
        pipe.delete(self.key)
        pipe.delete(self.buffer_key)

        for centroid, weight in new_centroids:
            member = f"{centroid}:{weight}"
            pipe.zadd(self.key, {member: centroid})

        pipe.execute()

    def _cluster(self, values):
        """Cluster values into centroids."""
        if not values:
            return []

        total_weight = sum(w for _, w in values)
        centroids = []

        current_centroid = values[0][0]
        current_weight = values[0][1]

        for value, weight in values[1:]:
            # Simple clustering - merge if close enough
            if current_weight < self.compression:
                # Weighted average
                new_weight = current_weight + weight
                current_centroid = (
                    current_centroid * current_weight + value * weight
                ) / new_weight
                current_weight = new_weight
            else:
                centroids.append((current_centroid, current_weight))
                current_centroid = value
                current_weight = weight

        centroids.append((current_centroid, current_weight))
        return centroids

    def quantile(self, q):
        """Get the value at quantile q (0-1)."""
        # Flush buffer first
        self._merge_buffer()

        centroids = r.zrange(self.key, 0, -1, withscores=True)

        if not centroids:
            return None

        # Calculate total weight
        total_weight = sum(
            float(member.split(':')[1])
            for member, _ in centroids
        )

        target = q * total_weight
        cumulative = 0

        for member, value in centroids:
            weight = float(member.split(':')[1])
            cumulative += weight

            if cumulative >= target:
                return value

        return centroids[-1][1]

    def percentile(self, p):
        """Get value at percentile p (0-100)."""
        return self.quantile(p / 100.0)

# Usage
tdigest = TDigest('latency:tdigest')

# Add values
for _ in range(10000):
    tdigest.add(random.expovariate(1/100) + 10)

# Get percentiles
p50 = tdigest.percentile(50)
p95 = tdigest.percentile(95)
p99 = tdigest.percentile(99)
print(f"T-Digest P50: {p50:.2f}, P95: {p95:.2f}, P99: {p99:.2f}")
```

## Approach 4: Using RedisBloom T-Digest

If you have RedisBloom module available, use the native T-Digest implementation:

```python
class RedisBloomTDigest:
    def __init__(self, key, compression=100):
        self.key = key
        self.compression = compression
        self._create()

    def _create(self):
        """Create T-Digest data structure."""
        try:
            r.execute_command('TDIGEST.CREATE', self.key, 'COMPRESSION', self.compression)
        except:
            pass  # Already exists

    def add(self, *values):
        """Add values to the T-Digest."""
        r.execute_command('TDIGEST.ADD', self.key, *values)

    def quantile(self, *quantiles):
        """Get values at specified quantiles (0-1)."""
        return r.execute_command('TDIGEST.QUANTILE', self.key, *quantiles)

    def cdf(self, *values):
        """Get the CDF value for given values."""
        return r.execute_command('TDIGEST.CDF', self.key, *values)

    def info(self):
        """Get T-Digest info."""
        return r.execute_command('TDIGEST.INFO', self.key)

    def merge(self, source_keys):
        """Merge multiple T-Digests."""
        r.execute_command('TDIGEST.MERGE', self.key, len(source_keys), *source_keys)

# Usage (requires RedisBloom module)
# bloom_tdigest = RedisBloomTDigest('latency:bloom')
# bloom_tdigest.add(100, 150, 200, 250, 300)
# p99 = bloom_tdigest.quantile(0.99)
```

## Production Example: API Latency Monitoring

```python
class APILatencyMonitor:
    def __init__(self, service_name):
        self.service_name = service_name
        self.histogram_buckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]

    def record_latency(self, endpoint, method, latency_ms, status_code):
        """Record API request latency."""
        timestamp = time.time()
        day = datetime.utcnow().strftime('%Y-%m-%d')
        hour = datetime.utcnow().strftime('%Y-%m-%d-%H')

        pipe = r.pipeline()

        # 1. Exact values in sorted set (for precise percentiles)
        exact_key = f"latency:exact:{self.service_name}:{endpoint}:{hour}"
        member = f"{timestamp}:{latency_ms}"
        pipe.zadd(exact_key, {member: latency_ms})
        pipe.expire(exact_key, 86400)  # 24-hour retention

        # 2. Histogram buckets (for aggregations)
        bucket_label = self._get_bucket_label(latency_ms)
        hist_key = f"latency:hist:{self.service_name}:{endpoint}:{hour}"
        pipe.hincrby(hist_key, bucket_label, 1)
        pipe.expire(hist_key, 86400)

        # 3. Running stats (count, sum for mean calculation)
        stats_key = f"latency:stats:{self.service_name}:{endpoint}:{hour}"
        pipe.hincrby(stats_key, 'count', 1)
        pipe.hincrbyfloat(stats_key, 'sum', latency_ms)
        pipe.expire(stats_key, 86400)

        # 4. Track by status code
        status_key = f"latency:status:{self.service_name}:{endpoint}:{status_code}:{hour}"
        pipe.hincrby(status_key, 'count', 1)
        pipe.expire(status_key, 86400)

        pipe.execute()

    def _get_bucket_label(self, value):
        for bucket in self.histogram_buckets:
            if value <= bucket:
                return str(bucket)
        return 'inf'

    def get_percentiles(self, endpoint, hours=1):
        """Get percentiles for the last N hours."""
        current_hour = datetime.utcnow()
        all_values = []

        for i in range(hours):
            hour = (current_hour - timedelta(hours=i)).strftime('%Y-%m-%d-%H')
            key = f"latency:exact:{self.service_name}:{endpoint}:{hour}"
            values = r.zrange(key, 0, -1, withscores=True)
            all_values.extend([score for _, score in values])

        if not all_values:
            return None

        all_values.sort()
        count = len(all_values)

        percentiles = {}
        for p in [50, 75, 90, 95, 99]:
            idx = int((p / 100.0) * (count - 1))
            percentiles[f'p{p}'] = all_values[idx]

        return {
            'count': count,
            'min': all_values[0],
            'max': all_values[-1],
            'mean': sum(all_values) / count,
            **percentiles
        }

    def get_histogram(self, endpoint, hours=1):
        """Get aggregated histogram for the last N hours."""
        current_hour = datetime.utcnow()
        aggregated = {str(b): 0 for b in self.histogram_buckets}
        aggregated['inf'] = 0

        for i in range(hours):
            hour = (current_hour - timedelta(hours=i)).strftime('%Y-%m-%d-%H')
            key = f"latency:hist:{self.service_name}:{endpoint}:{hour}"
            hist = r.hgetall(key)

            for bucket, count in hist.items():
                aggregated[bucket] = aggregated.get(bucket, 0) + int(count)

        return aggregated

# Usage
monitor = APILatencyMonitor('user-service')

# Record latencies
for _ in range(1000):
    latency = random.expovariate(1/80) + 10
    status = 200 if random.random() > 0.02 else 500
    monitor.record_latency('/api/users', 'GET', latency, status)

# Get stats
stats = monitor.get_percentiles('/api/users', hours=1)
print(f"Latency stats: {stats}")

histogram = monitor.get_histogram('/api/users', hours=1)
print(f"Histogram: {histogram}")
```

## Best Practices

### 1. Choose the Right Approach

| Scenario | Recommended Approach |
|----------|---------------------|
| Low cardinality, exact percentiles | Sorted Sets |
| High throughput, approximate | Histograms |
| Memory constrained, accurate | T-Digest |
| Multiple time windows | Time-bucketed any |

### 2. Set Appropriate Retention

```python
# Limit sorted set size
def add_with_limit(key, value, max_size=10000):
    pipe = r.pipeline()
    pipe.zadd(key, {f"{time.time()}:{value}": value})
    pipe.zremrangebyrank(key, 0, -max_size - 1)
    pipe.execute()
```

### 3. Use Lua Scripts for Atomicity

```lua
-- atomic_histogram_observe.lua
local hist_key = KEYS[1]
local stats_key = KEYS[2]
local value = tonumber(ARGV[1])
local buckets = cjson.decode(ARGV[2])

-- Find bucket
local bucket_label = 'inf'
for _, bound in ipairs(buckets) do
    if value <= bound then
        bucket_label = tostring(bound)
        break
    end
end

-- Update histogram
redis.call('HINCRBY', hist_key, bucket_label, 1)

-- Update stats
redis.call('HINCRBY', stats_key, 'count', 1)
redis.call('HINCRBYFLOAT', stats_key, 'sum', value)

return bucket_label
```

## Conclusion

Calculating percentiles and histograms in Redis requires choosing the right data structure and algorithm based on your needs:

- **Sorted Sets**: Best for exact percentiles with moderate data volume
- **Hash-based Histograms**: Optimal for high-throughput with predefined buckets
- **T-Digest**: Ideal for accurate percentiles with memory constraints
- **RedisBloom T-Digest**: Production-ready native implementation

For most monitoring use cases, combining histogram buckets (for aggregations) with sorted sets (for precise percentiles on recent data) provides the best balance of performance and accuracy. Remember to implement proper data retention to manage memory usage in production.
