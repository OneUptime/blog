# How to Implement Ingestion Rate Limiting for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Rate Limiting, Ingestion, Backpressure, Performance, Configuration

Description: Learn how to implement ingestion rate limiting in ClickHouse to prevent resource exhaustion and protect query performance during high-volume data loads.

---

Uncontrolled ingestion can degrade ClickHouse query performance, exhaust disk I/O bandwidth, and trigger merge storms. Rate limiting at the ingestion layer protects cluster stability while still allowing high throughput.

## Why Rate Limit Ingestion?

```text
- Too many small inserts cause excessive part creation
- Large bulk inserts compete with queries for CPU and disk I/O
- Unthrottled Kafka consumers can overwhelm ClickHouse
- Burst ingestion can trigger OOM errors during merges
```

## Server-Level Rate Limits

Set limits in `users.xml` or via SQL for specific users:

```sql
-- Create a dedicated ingestion user with limits
CREATE USER ingestion_user
    SETTINGS
        max_concurrent_queries_for_user = 4,
        max_rows_to_read = 1000000000,
        max_insert_threads = 4;
```

Or use profile settings:

```xml
<!-- In users.xml -->
<profiles>
  <ingestion>
    <max_concurrent_queries_for_user>4</max_concurrent_queries_for_user>
    <max_insert_block_size>100000</max_insert_block_size>
  </ingestion>
</profiles>
```

## Batch Size Control

Avoid sending many small inserts. ClickHouse creates one part per insert, so batching is the most effective rate limiting strategy:

```sql
-- Recommended: batch at least 100K rows per insert
INSERT INTO events SELECT * FROM events_staging LIMIT 100000;
```

Configure the async insert buffer:

```sql
SET async_insert = 1;
SET wait_for_async_insert = 0;
SET async_insert_max_data_size = 10485760;   -- 10MB
SET async_insert_busy_timeout_ms = 200;
```

## Kafka Consumer Rate Limiting

For Kafka-based ingestion, control the consumer poll rate:

```sql
CREATE TABLE kafka_events (
    event_id String,
    payload String
) ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'broker:9092',
    kafka_topic_list = 'events',
    kafka_group_name = 'ch-consumer',
    kafka_format = 'JSONEachRow',
    kafka_max_block_size = 65536,     -- rows per poll
    kafka_poll_timeout_ms = 500,
    kafka_num_consumers = 2;
```

## Pipeline-Level Throttling

Implement a token bucket or sleep-based throttle in your ingestion script:

```bash
#!/bin/bash
MAX_ROWS_PER_SEC=50000
BATCH_SIZE=10000

while IFS= read -r batch; do
    START=$(date +%s%N)
    echo "$batch" | clickhouse-client --query "INSERT INTO events FORMAT JSONEachRow"
    ELAPSED=$(( ($(date +%s%N) - START) / 1000000 ))
    EXPECTED=$(( BATCH_SIZE * 1000 / MAX_ROWS_PER_SEC ))
    SLEEP=$(( EXPECTED - ELAPSED ))
    if [ $SLEEP -gt 0 ]; then
        sleep "0.${SLEEP}"
    fi
done < batches.txt
```

## Monitoring Insert Pressure

Check current insert queue depth and merge performance:

```sql
SELECT
    query_kind,
    count()
FROM system.processes
GROUP BY query_kind;

SELECT
    database,
    table,
    sum(rows) AS total_rows,
    count() AS part_count
FROM system.parts
WHERE active
GROUP BY database, table
HAVING part_count > 100
ORDER BY part_count DESC;
```

## Summary

Rate limiting ClickHouse ingestion involves controlling insert batch sizes, configuring async inserts, throttling Kafka consumers, and using user-level concurrency limits. The most impactful change is always batching - sending fewer, larger inserts significantly reduces merge pressure and protects query performance.
