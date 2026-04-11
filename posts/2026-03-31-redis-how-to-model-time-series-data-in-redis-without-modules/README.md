# How to Model Time-Series Data in Redis Without Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Time Series, Data Modeling, Sorted Set, Stream

Description: Learn how to model time-series data in Redis using native sorted sets and streams, without requiring the RedisTimeSeries module.

---

## Why Model Time Series in Redis

Redis is well-suited for time-series data that requires fast writes, recent lookups, and windowed queries. Use cases include metrics, event logs, sensor readings, and user activity tracking. Without the RedisTimeSeries module, you can use sorted sets or Redis Streams to store and query time-ordered data.

## Approach 1: Sorted Sets with Unix Timestamps as Scores

Sorted sets store members ordered by a numeric score. Using a Unix timestamp as the score gives you a natural time-ordered structure.

```bash
# Store metric: CPU usage at various timestamps
ZADD metrics:cpu 1711900000 "72.5"
ZADD metrics:cpu 1711900060 "74.1"
ZADD metrics:cpu 1711900120 "70.8"
ZADD metrics:cpu 1711900180 "68.3"
```

Query patterns:

```bash
# Get all readings in a time window (last hour)
ZRANGEBYSCORE metrics:cpu 1711896400 1711900000 WITHSCORES

# Get the most recent 10 readings
ZREVRANGE metrics:cpu 0 9 WITHSCORES

# Count readings in the last 5 minutes
ZCOUNT metrics:cpu 1711899700 1711900000

# Remove readings older than 1 day (retain only recent data)
ZREMRANGEBYSCORE metrics:cpu -inf 1711813600
```

## Handling Duplicate Timestamps

Sorted sets deduplicate members by value. If multiple readings occur at the same second, encode additional context in the member:

```python
import redis
import time
import json
import uuid

r = redis.Redis(host='localhost', port=6379)

def record_metric(metric_name: str, value: float):
    ts = time.time()
    # Encode value + unique ID to avoid deduplication
    member = json.dumps({"v": value, "id": str(uuid.uuid4())[:8]})
    r.zadd(f"metrics:{metric_name}", {member: ts})

def query_range(metric_name: str, start_ts: float, end_ts: float):
    raw = r.zrangebyscore(f"metrics:{metric_name}", start_ts, end_ts, withscores=True)
    return [(json.loads(member)['v'], score) for member, score in raw]

record_metric("cpu", 72.5)
record_metric("cpu", 74.1)
results = query_range("cpu", time.time() - 3600, time.time())
```

## Approach 2: Redis Streams

Redis Streams (XADD/XREAD) are purpose-built for append-only event logs with auto-generated timestamps. They are more memory-efficient than sorted sets for high-cardinality time series.

```bash
# Append a reading with auto-generated timestamp
XADD metrics:temperature * sensor_id 42 value 23.5 unit celsius

# Append with explicit timestamp (milliseconds)
XADD metrics:temperature 1711900000000-0 sensor_id 42 value 23.5 unit celsius
```

Read the stream:

```bash
# Read all entries from the beginning
XRANGE metrics:temperature - +

# Read entries in a time window
XRANGE metrics:temperature 1711896400000 1711900000000

# Read the last 100 entries
XREVRANGE metrics:temperature + - COUNT 100

# Get stream length
XLEN metrics:temperature
```

## Capping Stream Size

Use MAXLEN to prevent unbounded growth:

```bash
# Keep only the last 10000 entries
XADD metrics:temperature MAXLEN ~ 10000 * sensor_id 42 value 23.5
```

Or trim explicitly:

```bash
XTRIM metrics:temperature MAXLEN ~ 10000
```

## Bucketed Aggregation with Hashes

For pre-computed aggregations (hourly averages, daily totals), store them in hashes:

```python
import redis
import time
from datetime import datetime, timezone

r = redis.Redis(host='localhost', port=6379)

def record_with_aggregation(metric: str, value: float):
    now = time.time()
    ts = int(now)
    hour_bucket = datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y%m%d%H")
    day_bucket = datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y%m%d")

    pipe = r.pipeline()
    # Raw time series
    pipe.zadd(f"metrics:{metric}:raw", {str(ts): ts})
    # Hourly aggregation
    pipe.hincrbyfloat(f"metrics:{metric}:hourly:{hour_bucket}", "sum", value)
    pipe.hincrby(f"metrics:{metric}:hourly:{hour_bucket}", "count", 1)
    # Daily aggregation
    pipe.hincrbyfloat(f"metrics:{metric}:daily:{day_bucket}", "sum", value)
    pipe.hincrby(f"metrics:{metric}:daily:{day_bucket}", "count", 1)
    pipe.execute()

def get_hourly_average(metric: str, hour_bucket: str) -> float:
    data = r.hgetall(f"metrics:{metric}:hourly:{hour_bucket}")
    if not data:
        return 0.0
    return float(data[b'sum']) / int(data[b'count'])

record_with_aggregation("cpu", 72.5)
avg = get_hourly_average("cpu", "2024032415")
```

## Sliding Window Metrics

Track metrics within a rolling time window:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

def add_event(key: str, window_seconds: int = 3600):
    now = time.time()
    pipe = r.pipeline()
    pipe.zadd(key, {str(now): now})
    # Remove events outside the window
    pipe.zremrangebyscore(key, 0, now - window_seconds)
    pipe.execute()

def count_events(key: str, window_seconds: int = 3600) -> int:
    now = time.time()
    return r.zcount(key, now - window_seconds, now)

# Track page views with 1-hour sliding window
add_event("pageviews:homepage")
count = count_events("pageviews:homepage")
print(f"Views in last hour: {count}")
```

## Retention and Cleanup

Schedule regular cleanup using sorted set score-based removal:

```bash
# Remove data older than 7 days (run via cron or scheduled job)
ZREMRANGEBYSCORE metrics:cpu -inf $(date -d '7 days ago' +%s)
```

Python cleanup:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

def cleanup_old_data(key: str, retention_seconds: int = 604800):
    cutoff = time.time() - retention_seconds
    removed = r.zremrangebyscore(key, 0, cutoff)
    print(f"Removed {removed} old entries from {key}")
```

## Sorted Set vs. Streams Comparison

| Feature | Sorted Set | Redis Streams |
|---------|-----------|---------------|
| Auto timestamp | No | Yes (millisecond precision) |
| Deduplication | By member | No |
| Consumer groups | No | Yes |
| Memory efficiency | Good | Better for high volume |
| Range queries | ZRANGEBYSCORE | XRANGE |
| MAXLEN trimming | ZREMRANGEBYSCORE | MAXLEN option |

## Summary

Redis supports time-series modeling through two native structures: sorted sets with Unix timestamps as scores, and Redis Streams for append-only event logs. Sorted sets excel for simple metric tracking and range queries; streams are better for high-volume event logs with consumer group support. Combine raw series storage with pre-computed hash aggregations for hourly and daily buckets to enable efficient analytics without expensive range scans.
