# How to Monitor Kafka-to-ClickHouse Pipeline Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kafka, Pipeline, Monitoring, Health

Description: Monitor the health of your Kafka-to-ClickHouse pipeline by tracking consumer lag, insert throughput, error rates, and schema violations in real time.

---

A Kafka-to-ClickHouse pipeline has multiple potential failure points: Kafka connectivity, message parsing, schema validation, and ClickHouse insert performance. Comprehensive monitoring covers all layers so you can detect and diagnose issues quickly.

## Consumer State Monitoring

```sql
SELECT
    database,
    table,
    consumer_id,
    assignments.topic,
    assignments.partition_id,
    assignments.current_offset,
    num_messages_read,
    last_commit_time,
    now() - last_commit_time AS seconds_since_commit,
    length(exceptions.text) AS recent_exception_count,
    exceptions.text
FROM system.kafka_consumers;
```

Alert on:
- `seconds_since_commit > 60`: Consumer is not committing, likely stuck
- `recent_exception_count > 0`: Schema or format errors occurring (inspect `exceptions.text` for details)

## Insert Throughput Panel

Track rows per second entering ClickHouse from Kafka:

```sql
SELECT
    toStartOfMinute(event_time) AS minute,
    sum(written_rows) AS rows_per_minute,
    count() AS insert_queries,
    sum(written_rows) / 60.0 AS rows_per_second
FROM system.query_log
WHERE type = 'QueryFinish'
    AND query_kind = 'Insert'
    AND tables[1] LIKE '%kafka%'
    AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY minute
ORDER BY minute;
```

## End-to-End Latency

Measure the lag between when an event occurs and when it appears in ClickHouse:

```sql
SELECT
    quantile(0.50)(latency_seconds) AS p50_latency,
    quantile(0.95)(latency_seconds) AS p95_latency,
    quantile(0.99)(latency_seconds) AS p99_latency
FROM (
    SELECT
        dateDiff('second', event_time, now()) AS latency_seconds
    FROM events
    WHERE event_time >= now() - INTERVAL 5 MINUTE
);
```

## Error Rate Dashboard

```sql
SELECT
    toStartOfMinute(received_at) AS minute,
    count() AS dead_letters,
    error_type
FROM dead_letters
WHERE received_at >= now() - INTERVAL 1 HOUR
GROUP BY minute, error_type
ORDER BY minute, error_type;
```

## Kafka Connectivity Health

```sql
SELECT
    metric,
    value
FROM system.metrics
WHERE metric LIKE 'Kafka%';
```

Key metrics:
- `KafkaConsumersWithAssignment`: Number of active consumers with partition assignments
- `KafkaWrites`: Active write connections (for Kafka engine tables used as sinks)

## Pipeline Health Check Table

Create a synthetic health check that runs every minute:

```sql
CREATE TABLE pipeline_health_log (
    check_time DateTime DEFAULT now(),
    rows_last_minute UInt64,
    error_count UInt32,
    consumer_lag_seconds Float64,
    status LowCardinality(String)
) ENGINE = MergeTree
ORDER BY check_time
TTL check_time + INTERVAL 7 DAY;
```

Populate it from a scheduled script:

```bash
clickhouse-client --query "
INSERT INTO pipeline_health_log (rows_last_minute, error_count, status)
SELECT
    countIf(event_time >= now() - INTERVAL 1 MINUTE) AS rows_last_minute,
    (SELECT count() FROM dead_letters WHERE received_at >= now() - INTERVAL 1 MINUTE) AS error_count,
    multiIf(
        countIf(event_time >= now() - INTERVAL 1 MINUTE) = 0, 'no_data',
        (SELECT count() FROM dead_letters WHERE received_at >= now() - INTERVAL 1 MINUTE) > 100, 'high_errors',
        'healthy'
    ) AS status
FROM events
"
```

## Alerting Thresholds

```text
No data received for 5 minutes: CRITICAL
Consumer lag > 60 seconds: WARNING
Consumer lag > 300 seconds: CRITICAL
Dead letter rate > 1% of total: WARNING
Dead letter rate > 5% of total: CRITICAL
recent_exception_count increasing: WARNING
```

## Summary

Monitoring Kafka-to-ClickHouse pipeline health requires visibility across three layers: Kafka consumer state (from `system.kafka_consumers`), ClickHouse insert performance (from `system.query_log`), and application-layer metrics like error rates and end-to-end latency. Combine real-time metrics with a health check table and configure alerts at multiple severity levels to catch pipeline issues before they cause data gaps.
