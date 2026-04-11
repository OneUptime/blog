# How to Use RedisTimeSeries in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, RedisTimeSeries, Time Series, Metric

Description: Learn how to use RedisTimeSeries in Python to store, query, and aggregate time-series data for metrics, monitoring, and IoT applications.

---

## What Is RedisTimeSeries?

RedisTimeSeries is a Redis module that provides native time-series data storage with:

- Fast ingestion of timestamped data points
- Automatic downsampling and compaction rules
- Range queries with aggregations (avg, min, max, sum, count)
- Retention policies for automatic data expiry
- Label-based filtering

Use cases: application metrics, IoT sensor data, financial tick data, monitoring dashboards.

## Setup

Run Redis Stack which includes RedisTimeSeries:

```bash
docker run -p 6379:6379 redis/redis-stack:latest
```

Install the Python client:

```bash
pip install redis
```

## Creating a Time Series

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Create a time series for CPU metrics
r.ts().create(
    'metrics:cpu:server1',
    retention_msecs=7 * 24 * 60 * 60 * 1000,  # 7 days retention
    labels={'host': 'server1', 'metric': 'cpu', 'unit': 'percent'}
)

# Create with duplicate policy
r.ts().create(
    'metrics:memory:server1',
    retention_msecs=86400000,  # 1 day
    duplicate_policy='last',   # On duplicate timestamp, keep last value
    labels={'host': 'server1', 'metric': 'memory'}
)

print("Time series created")
```

## Adding Data Points

```python
from redis import Redis
import time

r = Redis(host='localhost', port=6379, decode_responses=True)

# Add a single data point (timestamp in milliseconds)
ts_ms = int(time.time() * 1000)
r.ts().add('metrics:cpu:server1', ts_ms, 45.5)

# Add with auto-timestamp (use * for current time)
r.ts().add('metrics:cpu:server1', '*', 47.2)

# Batch add multiple samples
samples = [
    ('metrics:cpu:server1', int(time.time() * 1000) - 60000, 42.1),
    ('metrics:cpu:server1', int(time.time() * 1000) - 30000, 44.8),
    ('metrics:cpu:server1', int(time.time() * 1000), 46.3),
]
r.ts().madd(samples)
print("Data points added")
```

## Querying Data

```python
from redis import Redis
import time

r = Redis(host='localhost', port=6379, decode_responses=True)

# Get the latest value
latest = r.ts().get('metrics:cpu:server1')
print(f"Latest: timestamp={latest[0]}, value={latest[1]}")

# Get a range of data points
now_ms = int(time.time() * 1000)
one_hour_ago = now_ms - 3600 * 1000

points = r.ts().range(
    'metrics:cpu:server1',
    from_time=one_hour_ago,
    to_time=now_ms
)
print(f"Found {len(points)} data points in the last hour")
for ts, value in points:
    print(f"  {ts}: {value}")
```

## Aggregating Data

```python
from redis import Redis
import time

r = Redis(host='localhost', port=6379, decode_responses=True)

now_ms = int(time.time() * 1000)
one_hour_ago = now_ms - 3600 * 1000

# Average CPU over 5-minute buckets
aggregated = r.ts().range(
    'metrics:cpu:server1',
    from_time=one_hour_ago,
    to_time=now_ms,
    aggregation_type='avg',
    bucket_size_msec=5 * 60 * 1000  # 5 minutes
)
print("CPU averages by 5-minute bucket:")
for ts, avg_value in aggregated:
    print(f"  {ts}: {avg_value:.2f}%")

# Min/max range
min_vals = r.ts().range(
    'metrics:cpu:server1',
    from_time=one_hour_ago,
    to_time=now_ms,
    aggregation_type='min',
    bucket_size_msec=60 * 1000  # 1-minute buckets
)
```

## Setting Up Compaction Rules

Compaction rules automatically downsample data for long-term storage:

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Create source series (raw, 1-hour retention)
r.ts().create(
    'metrics:requests:raw',
    retention_msecs=3600 * 1000,  # 1 hour of raw data
    labels={'type': 'requests', 'resolution': 'raw'}
)

# Create destination series for 1-minute averages (7-day retention)
r.ts().create(
    'metrics:requests:1min',
    retention_msecs=7 * 24 * 3600 * 1000,
    labels={'type': 'requests', 'resolution': '1min'}
)

# Create compaction rule: average raw data into 1-minute buckets
r.ts().createrule(
    source_key='metrics:requests:raw',
    dest_key='metrics:requests:1min',
    aggregation_type='avg',
    bucket_size_msec=60 * 1000
)
print("Compaction rule created")
```

## Querying Multiple Series with Labels

```python
from redis import Redis

r = Redis(host='localhost', port=6379, decode_responses=True)

# Get latest values from all series with label host=server1
results = r.ts().mget(
    filters=['host=server1'],
    with_labels=True
)

for item in results:
    for series_key, values in item.items():
        labels, timestamp, value = values[0], values[1], values[2]
        print(f"Key: {series_key}")
        print(f"Labels: {labels}")
        if timestamp is not None:
            print(f"Latest: timestamp={timestamp}, value={value}")
```

## Practical Metrics Collection Example

```bash
pip install psutil
```

```python
from redis import Redis
import psutil
import time

r = Redis(host='localhost', port=6379, decode_responses=True)

def setup_metrics():
    for metric in ['cpu', 'memory', 'disk']:
        try:
            r.ts().create(
                f'system:{metric}',
                retention_msecs=24 * 3600 * 1000,
                labels={'host': 'local', 'metric': metric}
            )
        except Exception:
            pass  # Already exists

def collect_metrics():
    ts_ms = int(time.time() * 1000)
    r.ts().madd([
        ('system:cpu', ts_ms, psutil.cpu_percent()),
        ('system:memory', ts_ms, psutil.virtual_memory().percent),
        ('system:disk', ts_ms, psutil.disk_usage('/').percent),
    ])

setup_metrics()
print("Collecting metrics every 10 seconds...")
for _ in range(6):
    collect_metrics()
    time.sleep(10)
```

## Summary

RedisTimeSeries in Python provides efficient ingestion and querying of time-stamped metrics using the `r.ts()` interface in redis-py. Create series with retention policies and labels, add data points with `add()` or bulk-insert with `madd()`, and query ranges with aggregations like avg, min, max, and sum over time buckets. Compaction rules enable automatic downsampling for cost-effective long-term storage of high-frequency metrics.
