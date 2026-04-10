# RedisTimeSeries vs InfluxDB: Time Series Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, InfluxDB, Time Series, Monitoring

Description: Compare RedisTimeSeries and InfluxDB for storing metrics and events: ingestion speed, query language, retention policies, and ideal use cases.

---

Time series databases are designed for storing and querying data points indexed by time - think metrics, IoT sensor readings, and application telemetry. RedisTimeSeries (a Redis module) and InfluxDB are two popular options with very different profiles.

## RedisTimeSeries Basics

RedisTimeSeries adds a time series data type to Redis. Data lives in memory, making reads and writes extremely fast.

```bash
# Create a time series with a 7-day retention
redis-cli TS.CREATE sensor:temperature RETENTION 604800000 LABELS region us-east type temperature

# Add data points
redis-cli TS.ADD sensor:temperature 1711900000000 22.5
redis-cli TS.ADD sensor:temperature * 23.1

# Query a range
redis-cli TS.RANGE sensor:temperature 1711800000000 1711900000000

# Create a destination key for downsampled data
redis-cli TS.CREATE sensor:temperature:1h RETENTION 2592000000 LABELS region us-east type temperature

# Downsample with aggregation
redis-cli TS.CREATERULE sensor:temperature sensor:temperature:1h \
  AGGREGATION avg 3600000
```

## InfluxDB Basics

InfluxDB uses its own Flux or InfluxQL query language and stores data on disk, designed to handle large volumes of time series data.

```python
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

client = InfluxDBClient(url="http://localhost:8086", token="my-token", org="myorg")
write_api = client.write_api(write_options=SYNCHRONOUS)

# Write a data point
point = Point("temperature").tag("region", "us-east").field("value", 22.5)
write_api.write(bucket="sensors", record=point)

# Query with Flux
query = '''
from(bucket:"sensors")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> mean()
'''
result = client.query_api().query(query)
```

## Performance Comparison

| Factor | RedisTimeSeries | InfluxDB |
|---|---|---|
| Write throughput | 1M+ points/sec | 100K-500K points/sec |
| Read latency | Sub-millisecond | 1-50ms |
| Storage | In-memory (limited) | On-disk (terabytes) |
| Compression | Limited | High (TSM engine) |
| Query language | TS.RANGE + aggregations | Flux / InfluxQL |
| Downsampling | Compaction rules | Tasks / continuous queries |
| Cardinality | Lower (Redis key per series) | Higher cardinality support |

## Retention and Downsampling

Both systems support data retention and downsampling, but with different approaches:

```bash
# RedisTimeSeries: retention in milliseconds per key
redis-cli TS.ALTER sensor:cpu RETENTION 86400000

# Create a destination key for hourly averages
redis-cli TS.CREATE sensor:cpu:1h RETENTION 2592000000

# Create a compaction rule for hourly averages
redis-cli TS.CREATERULE sensor:cpu sensor:cpu:1h AGGREGATION avg 3600000
```

```text
# InfluxDB: retention policy via Flux task
option task = {name: "downsample_hourly", every: 1h}

from(bucket: "sensors")
  |> range(start: -task.every)
  |> aggregateWindow(every: 1h, fn: mean)
  |> to(bucket: "sensors_1h")
```

## Multi-Series Queries

InfluxDB has a significant advantage for querying across many series simultaneously:

```python
# InfluxDB: query all regions at once
query = '''
from(bucket:"sensors")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "temperature")
  |> group(columns: ["region"])
  |> mean()
'''
```

RedisTimeSeries requires querying by label and using `TS.MRANGE` for multi-key queries:

```bash
redis-cli TS.MRANGE - + FILTER type=temperature GROUPBY region REDUCE avg
```

## When to Choose RedisTimeSeries

- You need sub-millisecond ingestion and retrieval
- Metrics are part of a larger Redis-based system
- Dataset fits in available RAM
- You want simple setup without a separate database

## When to Choose InfluxDB

- Dataset spans months or years of data that exceeds RAM
- You need rich query capabilities with Flux
- High cardinality (many unique tag combinations)
- Built-in dashboards and alerting via Grafana integration

## Summary

RedisTimeSeries delivers unmatched speed for hot metrics that fit in memory, making it ideal for real-time dashboards and short-retention workloads. InfluxDB is the better fit for long-term storage of large time series datasets with complex query needs. Many production systems use RedisTimeSeries for the last hour of data and InfluxDB or another system for historical archives.
