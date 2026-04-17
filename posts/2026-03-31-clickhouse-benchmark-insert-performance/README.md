# How to Benchmark INSERT Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, INSERT Performance, Benchmark, Ingest, Throughput

Description: Learn how to benchmark INSERT performance in ClickHouse measuring rows per second, MB per second, and the effect of batch sizes on ingest throughput.

---

## Why Benchmark INSERT Performance?

INSERT throughput determines how fast you can load data from ETL pipelines, Kafka consumers, or application events. The key factors are batch size, number of threads, and storage type (NVMe vs HDD).

## Creating a Test Table

```sql
CREATE TABLE insert_bench
(
    ts DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    amount Float64,
    region LowCardinality(String)
)
ENGINE = MergeTree()
ORDER BY (event_type, ts);
```

## Generating Test Data

```bash
clickhouse-client --query "
INSERT INTO insert_bench
SELECT
    now() - rand() % 86400 AS ts,
    rand() % 1000000 AS user_id,
    ['click', 'view', 'purchase'][rand() % 3 + 1] AS event_type,
    round(rand() % 1000, 2) AS amount,
    ['US', 'EU', 'APAC'][rand() % 3 + 1] AS region
FROM numbers(1000000)
"
```

## Measuring Single-Batch Insert Time

```bash
time clickhouse-client --query "
INSERT INTO insert_bench
SELECT
    now() AS ts,
    number AS user_id,
    'click' AS event_type,
    rand() % 100 AS amount,
    'US' AS region
FROM numbers(5000000)
"
```

## Testing Different Batch Sizes

```bash
#!/bin/bash
for BATCH in 1000 10000 100000 1000000; do
    clickhouse-client --query "TRUNCATE TABLE insert_bench"
    START=$(date +%s%3N)
    clickhouse-client --query "
    INSERT INTO insert_bench
    SELECT now(), number, 'click', rand() % 100, 'US'
    FROM numbers($BATCH)
    "
    END=$(date +%s%3N)
    ELAPSED=$((END - START))
    RPS=$((BATCH * 1000 / ELAPSED))
    echo "Batch $BATCH: ${ELAPSED}ms, ~${RPS} rows/sec"
done
```

## Measuring INSERT from CSV

```bash
time clickhouse-client \
    --query "INSERT INTO insert_bench FORMAT CSV" \
    < large_data.csv
```

## Concurrent INSERT Benchmark

Test parallel ingest from multiple threads:

```bash
#!/bin/bash
for THREAD in $(seq 1 4); do
    clickhouse-client --query "
    INSERT INTO insert_bench
    SELECT now(), rand() % 1000000, 'click', rand() % 100, 'US'
    FROM numbers(1000000)
    " &
done
wait
echo "All inserts complete"
```

## Monitoring INSERT Performance from system.events

```bash
clickhouse-client --query "
SELECT
    event,
    value
FROM system.events
WHERE event IN (
    'InsertQuery',
    'InsertedRows',
    'InsertedBytes',
    'MergedRows',
    'MergedUncompressedBytes'
)
"
```

## Key Benchmarking Metrics

```text
- Rows per second: rows / elapsed_time
- MB/s: data_size / elapsed_time
- Parts created: check system.parts AFTER insert
- Merge overhead: watch system.merges during test
```

## Summary

ClickHouse INSERT performance is best measured with `numbers()` for controlled row generation and timed shell commands. Test batch sizes from 1K to 1M rows to find the optimal sweet spot, and use `system.events` counters to track inserted rows and bytes alongside merge activity.
