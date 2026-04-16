# How to Ingest Data from Telegraf into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Telegraf, Metrics Ingestion, TOML, Analytics

Description: Learn how to configure Telegraf to send system and application metrics to ClickHouse using the outputs.http plugin with JSON line format.

---

Telegraf collects metrics from hundreds of sources and can forward them to ClickHouse using its HTTP output. This pipeline is ideal for infrastructure metrics, IoT data, and application instrumentation.

## Target Table

```sql
CREATE TABLE telegraf_metrics (
    timestamp DateTime,
    name LowCardinality(String),
    host LowCardinality(String),
    tags String,     -- JSON map
    fields String    -- JSON map
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (name, host, timestamp)
TTL timestamp + INTERVAL 30 DAY;
```

## Telegraf Configuration

```toml
# /etc/telegraf/telegraf.conf

[[inputs.cpu]]
  percpu = false
  totalcpu = true

[[inputs.mem]]

[[inputs.disk]]
  ignore_fs = ["tmpfs", "devtmpfs"]

[[outputs.http]]
  url = "http://clickhouse:8123/?query=INSERT+INTO+telegraf_metrics+FORMAT+JSONEachRow&async_insert=1"
  method = "POST"
  data_format = "json"
  json_timestamp_units = "1s"
  [outputs.http.headers]
    Content-Type = "application/json"
    X-ClickHouse-User = "default"
    X-ClickHouse-Key = "${CLICKHOUSE_PASSWORD}"
```

## Flat Metric Schema

For a flat schema that maps one metric per row:

```sql
CREATE TABLE metrics_flat (
    timestamp DateTime,
    metric_name LowCardinality(String),
    host LowCardinality(String),
    value Float64
) ENGINE = MergeTree()
ORDER BY (metric_name, host, timestamp);
```

Configure Telegraf to use the `influx` serializer and a custom mapping processor.

## Verifying Data

```sql
SELECT name, host, count() AS points, max(timestamp) AS latest
FROM telegraf_metrics
GROUP BY name, host
ORDER BY latest DESC
LIMIT 10;
```

## Querying CPU Over Time

```sql
SELECT
    timestamp,
    JSONExtractFloat(fields, 'usage_idle') AS idle,
    100 - JSONExtractFloat(fields, 'usage_idle') AS usage
FROM telegraf_metrics
WHERE name = 'cpu' AND host = 'web01'
ORDER BY timestamp DESC
LIMIT 60;
```

## Summary

Telegraf forwards metrics to ClickHouse via the `outputs.http` plugin. Use `async_insert=1` in the URL to batch small writes. Store tags and fields as JSON strings for flexibility, or normalize to a flat schema for simpler queries.
