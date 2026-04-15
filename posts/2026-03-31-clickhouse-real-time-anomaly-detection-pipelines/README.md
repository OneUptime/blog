# How to Build Real-Time Anomaly Detection Pipelines with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Anomaly Detection, Real-Time Analytics, Statistics, Monitoring

Description: Build a statistical anomaly detection pipeline in ClickHouse using rolling averages and standard deviations to flag outliers in streaming data.

---

Anomaly detection pipelines compare incoming measurements against a baseline. ClickHouse can compute that baseline in real time using window functions and materialized views, eliminating the need for a separate ML serving layer for simple statistical anomalies.

## Metrics Table

```sql
CREATE TABLE metrics
(
    host        LowCardinality(String),
    metric_name LowCardinality(String),
    value       Float64,
    ts          DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (host, metric_name, ts);
```

## Rolling Baseline View

```sql
CREATE MATERIALIZED VIEW metric_baseline_mv
ENGINE = AggregatingMergeTree()
ORDER BY (host, metric_name, hour)
AS
SELECT
    host,
    metric_name,
    toStartOfHour(ts) AS hour,
    avgState(value)   AS avg_state,
    varSampState(value) AS var_state
FROM metrics
GROUP BY host, metric_name, hour;
```

## Anomaly Detection Query

Flag values that deviate more than 3 standard deviations from the hourly mean:

```sql
WITH baseline AS (
    SELECT
        host,
        metric_name,
        avgMerge(avg_state) AS mean,
        sqrt(varSampMerge(var_state)) AS stddev
    FROM metric_baseline_mv
    WHERE hour >= now() - INTERVAL 24 HOUR
    GROUP BY host, metric_name
)
SELECT
    m.host,
    m.metric_name,
    m.value,
    b.mean,
    b.stddev,
    abs(m.value - b.mean) / nullIf(b.stddev, 0) AS z_score,
    m.ts
FROM metrics AS m
JOIN baseline AS b
    ON m.host = b.host AND m.metric_name = b.metric_name
WHERE m.ts >= now() - INTERVAL 5 MINUTE
  AND z_score > 3
ORDER BY z_score DESC;
```

## Streaming Input from Kafka

```sql
CREATE TABLE metrics_kafka
(
    host        String,
    metric_name String,
    value       Float64,
    ts          DateTime
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'broker:9092',
    kafka_topic_list  = 'metrics',
    kafka_group_name  = 'ch-anomaly',
    kafka_format      = 'JSONEachRow';

CREATE MATERIALIZED VIEW metrics_kafka_mv TO metrics AS
SELECT host, metric_name, value, ts FROM metrics_kafka;
```

## Alerting

Schedule the anomaly detection query to run every minute in [OneUptime](https://oneuptime.com). When the result set is non-empty, page the on-call engineer with the host, metric, and z-score details.

## Summary

ClickHouse's aggregation functions and AggregatingMergeTree materialized views let you maintain rolling statistical baselines with no external infrastructure. A simple z-score query against those baselines delivers real-time anomaly detection at scale.
