# Redis vs Cassandra for Time-Series Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cassandra, Time-Series, Comparison, NoSQL, Analytics

Description: Compare Redis and Cassandra for time-series data storage - covering data modeling, write throughput, retention, and query capabilities for metrics and events.

---

Time-series data - metrics, sensor readings, application events - flows in continuously and needs to be queried by time range. Both Redis and Cassandra can handle this, but their architectures lead to very different trade-offs in storage cost, write throughput, and query flexibility.

## Redis for Time-Series Data

Redis has two options for time-series:

**Sorted Sets** (built-in, no module required):

```bash
# Store metric as (timestamp, value) in sorted set
ZADD cpu:server1 1700000000 "73.5"
ZADD cpu:server1 1700000060 "75.1"
ZADD cpu:server1 1700000120 "74.8"

# Query last 5 minutes
ZRANGEBYSCORE cpu:server1 1699999800 1700000100
```

**RedisTimeSeries module** (available in Redis Stack):

```bash
# Create a time series with 7-day retention
TS.CREATE cpu:server1 RETENTION 604800000 LABELS server server1 metric cpu

# Add samples
TS.ADD cpu:server1 * 73.5

# Query range with aggregation
TS.RANGE cpu:server1 1700000000 1700003600 AGGREGATION avg 60000
```

In Python:

```python
from redis.commands.timeseries import TimeSeries

ts = client.ts()
ts.create("temperature:sensor42", retention_msecs=86400000)
ts.add("temperature:sensor42", "*", 23.7)
result = ts.range("temperature:sensor42", "-", "+")
```

## Cassandra for Time-Series Data

Cassandra's partition-clustering model is well suited to time-series data. A common pattern is to partition by device and time bucket:

```sql
CREATE TABLE metrics (
    device_id  TEXT,
    bucket     DATE,
    ts         TIMESTAMP,
    value      DOUBLE,
    PRIMARY KEY ((device_id, bucket), ts)
) WITH CLUSTERING ORDER BY (ts ASC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy',
                    'compaction_window_size': 1,
                    'compaction_window_unit': 'DAYS'};
```

```python
from cassandra.cluster import Cluster
from datetime import datetime, date

cluster = Cluster(["127.0.0.1"])
session = cluster.connect("metrics")

insert = session.prepare(
    "INSERT INTO metrics (device_id, bucket, ts, value) VALUES (?, ?, ?, ?)"
)

session.execute(insert, ("sensor-42", date.today(), datetime.utcnow(), 23.7))

rows = session.execute(
    "SELECT ts, value FROM metrics WHERE device_id = ? AND bucket = ?",
    ("sensor-42", date.today()),
)
for row in rows:
    print(row.ts, row.value)
```

## Comparison

| Feature | Redis (RedisTimeSeries) | Cassandra |
|---------|------------------------|-----------|
| Write throughput | ~100K writes/sec | Millions/sec (distributed) |
| Storage | RAM-bounded | Disk-unlimited |
| Query flexibility | Range + aggregation | CQL (range queries) |
| Downsampling | Built-in compaction rules | Manual/UDFs |
| Retention policies | Per-series TTL | TTL on rows or partitions |
| Scale | Vertical + cluster | Horizontal (linear scale) |
| Ops complexity | Low | High |

## When to Use Redis

- Dataset fits in memory with short retention windows (days to weeks).
- You need built-in downsampling without extra tooling (RedisTimeSeries).
- You want low operational complexity and already run Redis.

## When to Use Cassandra

- Long-term retention at petabyte scale (months or years of data).
- Write throughput in the millions of events per second.
- You need flexible CQL queries beyond simple range scans.

## Summary

Redis with RedisTimeSeries is the right choice for real-time dashboards and short-retention metrics where the dataset fits in memory. Cassandra is the better foundation for long-term, high-volume time-series storage that exceeds RAM capacity. For many applications, using both together - Redis as a hot cache and Cassandra as the durable long-term store - is the most practical architecture.
