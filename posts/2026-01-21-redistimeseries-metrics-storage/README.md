# How to Use RedisTimeSeries for Metrics Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Metrics, Time-Series, Monitoring, Observability

Description: A comprehensive guide to using RedisTimeSeries for metrics storage, covering data ingestion, downsampling, aggregations, alerting patterns, and production best practices.

---

RedisTimeSeries is a Redis module that provides native time-series data capabilities with automatic downsampling, aggregations, and efficient queries. It is ideal for storing metrics, IoT sensor data, financial data, and any time-ordered measurements.

## Why RedisTimeSeries?

RedisTimeSeries offers several advantages over storing time-series data in regular Redis structures:

- **Memory Efficient**: Optimized storage for timestamps and values
- **Built-in Aggregations**: AVG, SUM, MIN, MAX, COUNT, etc.
- **Automatic Downsampling**: Create retention rules for different granularities
- **Label-Based Queries**: Filter and group by metadata labels
- **High Ingestion Rate**: Handle millions of data points per second
- **Integration**: Works with Grafana, Prometheus, and other tools

## Installation

### Using Redis Stack

```bash
# Docker
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

# Verify module is loaded
redis-cli MODULE LIST
# Should include "timeseries"
```

### Using RedisTimeSeries Module

```bash
# Download and build
git clone https://github.com/RedisTimeSeries/RedisTimeSeries.git
cd RedisTimeSeries
make

# Load module
redis-server --loadmodule ./bin/redistimeseries.so
```

## Basic Operations

### Creating Time Series

```python
import redis
import time
from datetime import datetime, timedelta

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Create a time series with labels
r.ts().create(
    "metrics:cpu:server1",
    labels={
        "metric": "cpu",
        "host": "server1",
        "datacenter": "us-east-1",
        "env": "production"
    }
)

# Create with retention policy (keep data for 7 days)
r.ts().create(
    "metrics:memory:server1",
    retention_msecs=7 * 24 * 60 * 60 * 1000,  # 7 days in ms
    labels={
        "metric": "memory",
        "host": "server1",
        "datacenter": "us-east-1",
        "env": "production"
    }
)

# Create with duplicate policy
r.ts().create(
    "metrics:requests:server1",
    retention_msecs=86400000,  # 1 day
    duplicate_policy="sum",  # Options: block, first, last, min, max, sum
    labels={
        "metric": "requests",
        "host": "server1"
    }
)
```

### Adding Data Points

```python
# Add a single point with current timestamp
r.ts().add("metrics:cpu:server1", "*", 45.5)

# Add with specific timestamp (milliseconds)
timestamp = int(time.time() * 1000)
r.ts().add("metrics:cpu:server1", timestamp, 48.2)

# Add multiple points to the same series
data_points = [
    (timestamp - 10000, 42.0),
    (timestamp - 5000, 43.5),
    (timestamp, 45.0),
]
for ts, value in data_points:
    r.ts().add("metrics:cpu:server1", ts, value)

# Add to multiple series at once (MADD)
r.ts().madd([
    ("metrics:cpu:server1", timestamp, 45.5),
    ("metrics:cpu:server2", timestamp, 52.3),
    ("metrics:memory:server1", timestamp, 68.2),
    ("metrics:memory:server2", timestamp, 71.8),
])
```

### Bulk Ingestion

```python
def bulk_ingest(series_key, data_points, chunk_size=1000):
    """Efficiently ingest large amounts of data."""
    for i in range(0, len(data_points), chunk_size):
        chunk = data_points[i:i + chunk_size]
        pipe = r.pipeline()
        for timestamp, value in chunk:
            pipe.ts().add(series_key, timestamp, value)
        pipe.execute()

# Example: Ingest historical data
historical_data = [
    (int((datetime.now() - timedelta(hours=i)).timestamp() * 1000), 40 + i % 20)
    for i in range(10000)
]
bulk_ingest("metrics:cpu:server1", historical_data)
```

## Querying Data

### Basic Queries

```python
# Get the latest value
latest = r.ts().get("metrics:cpu:server1")
print(f"Latest: timestamp={latest[0]}, value={latest[1]}")

# Get range of data
now = int(time.time() * 1000)
one_hour_ago = now - 3600000

data = r.ts().range(
    "metrics:cpu:server1",
    one_hour_ago,
    now
)
print(f"Data points in last hour: {len(data)}")

# Get specific number of recent points
data = r.ts().range(
    "metrics:cpu:server1",
    "-",  # Earliest
    "+",  # Latest
    count=100  # Last 100 points
)

# Reverse range (newest first)
data = r.ts().revrange(
    "metrics:cpu:server1",
    one_hour_ago,
    now,
    count=10
)
```

### Aggregations

```python
# Get hourly averages
hourly_avg = r.ts().range(
    "metrics:cpu:server1",
    one_hour_ago,
    now,
    aggregation_type="avg",
    bucket_size_msec=3600000  # 1 hour buckets
)

# Available aggregation types:
# avg, sum, min, max, range, count, first, last
# std.p, std.s (standard deviation)
# var.p, var.s (variance)
# twa (time-weighted average)

# Get max value per 5-minute window
max_5min = r.ts().range(
    "metrics:cpu:server1",
    one_hour_ago,
    now,
    aggregation_type="max",
    bucket_size_msec=300000  # 5 minutes
)

# Get count of data points per minute
count_per_min = r.ts().range(
    "metrics:cpu:server1",
    one_hour_ago,
    now,
    aggregation_type="count",
    bucket_size_msec=60000  # 1 minute
)

# Filter by value range
filtered = r.ts().range(
    "metrics:cpu:server1",
    one_hour_ago,
    now,
    filter_by_value=[50, 100]  # Only values between 50 and 100
)
```

### Multi-Series Queries

```python
# Query multiple series by label filter
results = r.ts().mrange(
    one_hour_ago,
    now,
    filters=["metric=cpu"],  # All CPU metrics
    aggregation_type="avg",
    bucket_size_msec=300000
)

for key, labels, data in results:
    print(f"Series: {key}, Labels: {labels}")
    print(f"  Data points: {len(data)}")

# Query with multiple filters
results = r.ts().mrange(
    one_hour_ago,
    now,
    filters=[
        "metric=cpu",
        "datacenter=us-east-1",
        "env=production"
    ]
)

# Get latest from multiple series
latest_all = r.ts().mget(filters=["metric=cpu"])
for key, labels, (timestamp, value) in latest_all:
    print(f"{key}: {value}")

# With labels included
results = r.ts().mrange(
    one_hour_ago,
    now,
    filters=["metric=cpu"],
    with_labels=True
)
```

## Downsampling and Retention

### Creating Aggregation Rules

```python
# Create raw data series (short retention)
r.ts().create(
    "metrics:cpu:server1:raw",
    retention_msecs=86400000,  # 1 day
    labels={"metric": "cpu", "host": "server1", "granularity": "raw"}
)

# Create aggregated series for different granularities
r.ts().create(
    "metrics:cpu:server1:1min",
    retention_msecs=7 * 86400000,  # 7 days
    labels={"metric": "cpu", "host": "server1", "granularity": "1min"}
)

r.ts().create(
    "metrics:cpu:server1:1hour",
    retention_msecs=90 * 86400000,  # 90 days
    labels={"metric": "cpu", "host": "server1", "granularity": "1hour"}
)

r.ts().create(
    "metrics:cpu:server1:1day",
    retention_msecs=365 * 86400000,  # 1 year
    labels={"metric": "cpu", "host": "server1", "granularity": "1day"}
)

# Create compaction rules
# Raw -> 1-minute average
r.ts().createrule(
    "metrics:cpu:server1:raw",
    "metrics:cpu:server1:1min",
    aggregation_type="avg",
    bucket_size_msec=60000
)

# 1-minute -> 1-hour average
r.ts().createrule(
    "metrics:cpu:server1:1min",
    "metrics:cpu:server1:1hour",
    aggregation_type="avg",
    bucket_size_msec=3600000
)

# 1-hour -> 1-day average
r.ts().createrule(
    "metrics:cpu:server1:1hour",
    "metrics:cpu:server1:1day",
    aggregation_type="avg",
    bucket_size_msec=86400000
)
```

### Managing Rules

```python
# Get series info including rules
info = r.ts().info("metrics:cpu:server1:raw")
print(f"Retention: {info.retention_msecs}")
print(f"Rules: {info.rules}")

# Delete a rule
r.ts().deleterule(
    "metrics:cpu:server1:raw",
    "metrics:cpu:server1:1min"
)
```

## Practical Patterns

### System Metrics Collection

```python
import psutil
import threading
import time

class MetricsCollector:
    def __init__(self, redis_client, hostname, interval=10):
        self.r = redis_client
        self.hostname = hostname
        self.interval = interval
        self.running = False

        self._setup_series()

    def _setup_series(self):
        """Create time series for all metrics."""
        metrics = [
            ("cpu", "percent"),
            ("memory", "percent"),
            ("disk", "percent"),
            ("network_in", "bytes"),
            ("network_out", "bytes"),
        ]

        for metric, unit in metrics:
            key = f"metrics:{metric}:{self.hostname}"
            try:
                self.r.ts().create(
                    key,
                    retention_msecs=86400000,
                    duplicate_policy="last",
                    labels={
                        "metric": metric,
                        "host": self.hostname,
                        "unit": unit
                    }
                )
            except redis.ResponseError:
                pass  # Already exists

    def collect(self):
        """Collect current metrics."""
        timestamp = int(time.time() * 1000)

        metrics = [
            (f"metrics:cpu:{self.hostname}", psutil.cpu_percent()),
            (f"metrics:memory:{self.hostname}", psutil.virtual_memory().percent),
            (f"metrics:disk:{self.hostname}", psutil.disk_usage('/').percent),
        ]

        # Network I/O
        net = psutil.net_io_counters()
        metrics.extend([
            (f"metrics:network_in:{self.hostname}", net.bytes_recv),
            (f"metrics:network_out:{self.hostname}", net.bytes_sent),
        ])

        # Bulk add
        self.r.ts().madd([
            (key, timestamp, value) for key, value in metrics
        ])

    def start(self):
        """Start collection loop."""
        self.running = True

        def loop():
            while self.running:
                try:
                    self.collect()
                except Exception as e:
                    print(f"Collection error: {e}")
                time.sleep(self.interval)

        thread = threading.Thread(target=loop, daemon=True)
        thread.start()

    def stop(self):
        """Stop collection."""
        self.running = False


# Usage
collector = MetricsCollector(r, "server1", interval=10)
collector.start()
```

### Application Metrics

```python
class AppMetrics:
    def __init__(self, redis_client, app_name):
        self.r = redis_client
        self.app_name = app_name
        self._setup_series()

    def _setup_series(self):
        """Setup application metric series."""
        metrics = [
            "request_count",
            "request_latency",
            "error_count",
            "active_users"
        ]

        for metric in metrics:
            key = f"app:{self.app_name}:{metric}"
            try:
                self.r.ts().create(
                    key,
                    retention_msecs=86400000,
                    labels={"app": self.app_name, "metric": metric}
                )
            except:
                pass

    def record_request(self, latency_ms, endpoint, status_code):
        """Record an HTTP request."""
        timestamp = int(time.time() * 1000)

        # Increment request count
        self.r.ts().add(f"app:{self.app_name}:request_count", timestamp, 1)

        # Record latency
        self.r.ts().add(f"app:{self.app_name}:request_latency", timestamp, latency_ms)

        # Record error if applicable
        if status_code >= 400:
            self.r.ts().add(f"app:{self.app_name}:error_count", timestamp, 1)

    def record_active_users(self, count):
        """Record current active users."""
        timestamp = int(time.time() * 1000)
        self.r.ts().add(f"app:{self.app_name}:active_users", timestamp, count)

    def get_request_rate(self, minutes=5):
        """Get requests per minute over the last N minutes."""
        now = int(time.time() * 1000)
        start = now - (minutes * 60000)

        result = self.r.ts().range(
            f"app:{self.app_name}:request_count",
            start, now,
            aggregation_type="sum",
            bucket_size_msec=60000
        )

        return [(ts, val) for ts, val in result]

    def get_latency_percentiles(self, minutes=5):
        """Get latency statistics."""
        now = int(time.time() * 1000)
        start = now - (minutes * 60000)

        # Get raw latency data
        data = self.r.ts().range(
            f"app:{self.app_name}:request_latency",
            start, now
        )

        if not data:
            return {}

        values = sorted([v for _, v in data])
        n = len(values)

        return {
            "min": values[0],
            "max": values[-1],
            "avg": sum(values) / n,
            "p50": values[int(n * 0.5)],
            "p95": values[int(n * 0.95)],
            "p99": values[int(n * 0.99)],
        }

    def get_error_rate(self, minutes=5):
        """Calculate error rate percentage."""
        now = int(time.time() * 1000)
        start = now - (minutes * 60000)

        request_data = self.r.ts().range(
            f"app:{self.app_name}:request_count",
            start, now,
            aggregation_type="sum",
            bucket_size_msec=minutes * 60000
        )

        error_data = self.r.ts().range(
            f"app:{self.app_name}:error_count",
            start, now,
            aggregation_type="sum",
            bucket_size_msec=minutes * 60000
        )

        total_requests = request_data[0][1] if request_data else 0
        total_errors = error_data[0][1] if error_data else 0

        if total_requests == 0:
            return 0

        return (total_errors / total_requests) * 100


# Usage
metrics = AppMetrics(r, "my-api")

# Record requests (in your request handler)
metrics.record_request(latency_ms=45, endpoint="/api/users", status_code=200)
metrics.record_request(latency_ms=120, endpoint="/api/orders", status_code=500)

# Get statistics
print(f"Request rate: {metrics.get_request_rate(5)}")
print(f"Latency percentiles: {metrics.get_latency_percentiles(5)}")
print(f"Error rate: {metrics.get_error_rate(5):.2f}%")
```

### Alerting Patterns

```python
class MetricAlerter:
    def __init__(self, redis_client):
        self.r = redis_client
        self.alert_channel = "alerts:metrics"

    def check_threshold(self, series_key, threshold, operator="gt",
                       window_minutes=5):
        """Check if metric crosses threshold."""
        now = int(time.time() * 1000)
        start = now - (window_minutes * 60000)

        # Get average over window
        data = self.r.ts().range(
            series_key,
            start, now,
            aggregation_type="avg",
            bucket_size_msec=window_minutes * 60000
        )

        if not data:
            return False

        value = data[-1][1]

        if operator == "gt":
            triggered = value > threshold
        elif operator == "lt":
            triggered = value < threshold
        elif operator == "gte":
            triggered = value >= threshold
        elif operator == "lte":
            triggered = value <= threshold
        else:
            triggered = False

        if triggered:
            alert = {
                "series": series_key,
                "value": value,
                "threshold": threshold,
                "operator": operator,
                "timestamp": now
            }
            self.r.publish(self.alert_channel, json.dumps(alert))

        return triggered

    def check_rate_of_change(self, series_key, max_change_percent,
                            window_minutes=5):
        """Alert on rapid changes."""
        now = int(time.time() * 1000)
        start = now - (window_minutes * 60000)

        data = self.r.ts().range(series_key, start, now)

        if len(data) < 2:
            return False

        first_value = data[0][1]
        last_value = data[-1][1]

        if first_value == 0:
            return False

        change_percent = abs((last_value - first_value) / first_value) * 100

        if change_percent > max_change_percent:
            alert = {
                "series": series_key,
                "type": "rate_of_change",
                "change_percent": change_percent,
                "from_value": first_value,
                "to_value": last_value,
                "timestamp": now
            }
            self.r.publish(self.alert_channel, json.dumps(alert))
            return True

        return False


# Usage
alerter = MetricAlerter(r)

# Check CPU threshold
if alerter.check_threshold("metrics:cpu:server1", 80, "gt", 5):
    print("CPU alert triggered!")

# Check for rapid changes
if alerter.check_rate_of_change("metrics:requests:server1", 50, 5):
    print("Traffic spike detected!")
```

## Grafana Integration

RedisTimeSeries works with Grafana using the Redis Data Source plugin:

```bash
# Install Redis Data Source for Grafana
grafana-cli plugins install redis-datasource
```

Example Grafana query:

```
TS.MRANGE - + AGGREGATION avg 60000 FILTER metric=cpu
```

## Conclusion

RedisTimeSeries provides a powerful solution for time-series data storage with:

- **Efficient Storage**: Optimized for timestamps and values
- **Automatic Downsampling**: Built-in compaction rules
- **Flexible Queries**: Aggregations, filters, and multi-series queries
- **Label-Based Organization**: Easy filtering and grouping
- **High Performance**: Millions of ingestions per second

Key takeaways:

- Use **labels** for organizing and querying metrics
- Set up **downsampling rules** for long-term storage
- Use **MRANGE** for querying multiple series at once
- Implement **retention policies** to manage storage
- Integrate with **Grafana** for visualization

## Related Resources

- [RedisTimeSeries Documentation](https://redis.io/docs/stack/timeseries/)
- [RedisTimeSeries Commands](https://redis.io/commands/?group=timeseries)
- [Grafana Redis Data Source](https://grafana.com/grafana/plugins/redis-datasource/)
