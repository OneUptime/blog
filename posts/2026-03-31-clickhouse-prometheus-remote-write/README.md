# How to Use ClickHouse as a Prometheus Remote Write Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Prometheus, Remote Write, Metric, Observability

Description: Use ClickHouse as a Prometheus remote write backend for long-term metrics storage with SQL querying and significantly lower storage costs than Thanos or Cortex.

---

## Why Use ClickHouse for Prometheus Metrics

Prometheus local storage is limited to weeks of data. Long-term storage options like Thanos or Cortex are operationally complex. ClickHouse offers a simpler alternative: Prometheus writes metrics via remote write, and ClickHouse stores them with excellent compression and SQL accessibility.

## Setting Up the Remote Write Adapter

Community adapters like [`prom2click`](https://github.com/mindis/prom2click) bridge Prometheus and ClickHouse. ClickHouse versions 24.8+ also include an experimental native Prometheus remote write integration via the TimeSeries table engine (requires `SET allow_experimental_time_series_table = 1`).

For `prom2click`, build the binary and run it with:

```bash
prom2click \
  --ch.dsn="tcp://ch.internal:9000?database=prometheus&username=prom_writer&password=secret" \
  --ch.db="prometheus" \
  --ch.table="samples" \
  --web.address=":9201"
```

## Prometheus Configuration

Add the remote write endpoint to `prometheus.yml`:

```text
remote_write:
  - url: http://prometheus-ch-adapter:9201/write
    remote_timeout: 30s
    queue_config:
      capacity: 10000
      max_samples_per_send: 5000
      batch_send_deadline: 5s

remote_read:
  - url: http://prometheus-ch-adapter:9201/read
    read_recent: true
```

## ClickHouse Schema for Prometheus Metrics

The adapter creates a table like this:

```sql
CREATE TABLE prometheus.samples (
    date            Date DEFAULT toDate(timestamp),
    name            LowCardinality(String),
    tags            Array(String),
    val             Float64,
    timestamp       DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (name, tags, timestamp)
TTL date + INTERVAL 365 DAY DELETE;
```

## Querying Metrics with SQL

ClickHouse unlocks SQL queries that PromQL cannot express. Correlate metrics across different services:

```sql
SELECT
    toStartOfMinute(timestamp) AS minute,
    name,
    avg(val) AS avg_value
FROM prometheus.samples
WHERE name IN ('http_request_duration_seconds_p99', 'db_query_duration_seconds_p99')
  AND timestamp >= now() - INTERVAL 6 HOUR
GROUP BY minute, name
ORDER BY minute;
```

## Joining Metrics with Business Data

One of ClickHouse's unique advantages is the ability to join metrics with business tables:

```sql
SELECT
    s.timestamp,
    s.val AS error_rate,
    d.deployment_version,
    d.deployed_by
FROM prometheus.samples s
JOIN deployments d ON d.deployed_at <= s.timestamp
  AND (d.next_deploy_at > s.timestamp OR d.next_deploy_at IS NULL)
WHERE s.name = 'http_5xx_rate'
  AND s.timestamp >= now() - INTERVAL 7 DAY
ORDER BY s.timestamp;
```

## Retention Configuration

Set different TTLs for different metric types using table-level TTL or tiered storage:

```sql
ALTER TABLE prometheus.samples
    MODIFY TTL date + INTERVAL 30 DAY
        TO DISK 'cold_s3',
        date + INTERVAL 365 DAY DELETE;
```

## Summary

Using ClickHouse as a Prometheus remote write backend provides long-term metrics storage with SQL flexibility, excellent compression, and the unique ability to join observability data with business metrics - at a fraction of the operational complexity of Thanos or Cortex.
