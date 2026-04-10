# Redis vs InfluxDB for Time-Series Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, InfluxDB, Time-Series, Comparison, Monitoring, Metric

Description: Compare Redis and InfluxDB for time-series storage - covering query languages, retention policies, downsampling, and which tool fits metrics vs event data.

---

Both Redis and InfluxDB can store time-series data, but InfluxDB was purpose-built for it. Understanding where Redis's versatility ends and InfluxDB's specialization begins helps you choose the right storage layer for metrics, IoT data, and application telemetry.

## Redis for Time-Series Data

Redis with the RedisTimeSeries module (part of Redis Stack) supports time-series operations natively:

```bash
# Create a metric with 24h retention
TS.CREATE metrics:cpu:server1 \
  RETENTION 86400000 \
  LABELS host server1 metric cpu_usage

# Create a compaction destination and a rule for 1-minute averages
TS.CREATE metrics:cpu:server1:avg \
  RETENTION 1800000 \
  LABELS host server1 metric cpu_usage
TS.CREATERULE metrics:cpu:server1 metrics:cpu:server1:avg AGGREGATION avg 60000

# Add samples (auto-timestamp with *)
TS.ADD metrics:cpu:server1 * 73.5
TS.ADD metrics:cpu:server1 * 78.2
TS.ADD metrics:cpu:server1 * 71.8

# Query with aggregation
TS.RANGE metrics:cpu:server1 - + AGGREGATION avg 60000
```

In Python:

```python
from redis import Redis
r = Redis()

r.ts().add("temperature", "*", 23.7, labels={"sensor": "room1"})
results = r.ts().range("temperature", "-", "+", aggregation_type="avg", bucket_size_msec=60000)
```

## InfluxDB for Time-Series Data

InfluxDB uses a line protocol for writes and Flux or InfluxQL for queries:

```bash
# Write using line protocol
curl -s -XPOST "http://localhost:8086/api/v2/write?org=myorg&bucket=metrics&precision=s" \
  -H "Authorization: Token mytoken" \
  --data-binary "cpu,host=server1 usage_percent=73.5 $(date +%s)"
```

Flux query for CPU averages over the last hour:

```text
from(bucket: "metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "cpu" and r["host"] == "server1")
  |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
  |> yield(name: "mean")
```

In Python:

```python
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

with InfluxDBClient(url="http://localhost:8086", token="mytoken", org="myorg") as client:
    write_api = client.write_api(write_options=SYNCHRONOUS)
    point = Point("cpu").tag("host", "server1").field("usage_percent", 73.5)
    write_api.write(bucket="metrics", record=point)

    query_api = client.query_api()
    tables = query_api.query('from(bucket:"metrics") |> range(start: -1h)')
    for table in tables:
        for record in table.records:
            print(record.get_value())
```

## Feature Comparison

| Feature | Redis (RedisTimeSeries) | InfluxDB |
|---------|------------------------|----------|
| Purpose-built for TSDB | No (module) | Yes |
| Query language | TS commands / client APIs | Flux, InfluxQL |
| Automatic downsampling | Manual rules | Tasks (Flux-based) |
| Retention policies | Per-series | Per-bucket |
| Storage | RAM-bounded | Disk (TSM engine) |
| Compression | Limited | High (TSM compression) |
| Cardinality limit | RAM-bounded | Can be an issue at high cardinality |
| Grafana integration | Via plugin (Redis Data Source) | Native data source |
| Alerting | External | Built-in |
| Ops complexity | Low | Medium |

## When to Use Redis

- Your time-series data is also interleaved with cache operations (e.g., latest value as a cached string).
- Short-retention metrics (hours to days) where RAM cost is acceptable.
- You want to avoid running a separate time-series daemon.

## When to Use InfluxDB

- Long-term metrics storage with efficient disk compression.
- You need Flux tasks for continuous downsampling and alerting.
- You are building a monitoring stack and want native Grafana integration.
- High-volume IoT ingestion with hundreds of thousands of data points per second.

## Summary

Redis with RedisTimeSeries is practical for short-retention, low-cardinality metrics embedded within an existing Redis stack. InfluxDB is the specialized choice for production monitoring where long-term retention, built-in alerting, and efficient disk storage matter. For application metrics pipelines feeding Grafana, InfluxDB's native integration and Flux language make it the cleaner fit.
