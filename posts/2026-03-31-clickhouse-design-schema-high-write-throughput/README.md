# How to Design a ClickHouse Schema for High Write Throughput

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Schema Design, Write Throughput, MergeTree, Performance

Description: Design a ClickHouse schema optimized for high write throughput using async inserts, partition strategies, and appropriate MergeTree configurations.

---

ClickHouse is capable of ingesting millions of rows per second, but achieving that throughput requires intentional schema and configuration design. The key principle is: minimize the number of parts created per unit time while maximizing batch size.

## Choose the Right Engine

For high write throughput, use `MergeTree` or `ReplicatedMergeTree`:

```sql
CREATE TABLE events (
    event_date      Date,
    event_time      DateTime,
    user_id         UInt64,
    event_type      LowCardinality(String),
    properties      String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id, event_type);
```

## Design the Partition Key for Write Distribution

Partition by month or week to distribute writes:

```sql
-- Monthly partitions (good for moderate throughput)
PARTITION BY toYYYYMM(event_date)

-- Weekly partitions (better for very high throughput)
PARTITION BY toMonday(event_date)
```

Avoid partitioning by day unless you have very large daily volumes (100M+ rows/day). Too many small partitions slow down merges.

## Use LowCardinality for String Columns

```sql
event_type   LowCardinality(String),  -- 4x less storage and faster reads/writes
status       LowCardinality(String),
region       LowCardinality(String)
```

## Configure Async Inserts

Async inserts buffer small writes and flush as batches:

```xml
<profiles>
  <ingestion>
    <async_insert>1</async_insert>
    <async_insert_max_data_size>104857600</async_insert_max_data_size>
    <async_insert_busy_timeout_ms>500</async_insert_busy_timeout_ms>
    <async_insert_stale_timeout_ms>5000</async_insert_stale_timeout_ms>
  </ingestion>
</profiles>
```

## Tune MergeTree Merge Settings

```xml
<merge_tree>
  <max_parts_in_total>10000</max_parts_in_total>
  <parts_to_delay_insert>300</parts_to_delay_insert>
  <parts_to_throw_insert>600</parts_to_throw_insert>
  <max_delay_to_insert>1</max_delay_to_insert>
</merge_tree>
```

## Use Minimal Columns

Include only necessary columns in the primary schema. Store extra metadata as JSON or Map:

```sql
CREATE TABLE events (
    event_date  Date,
    event_time  DateTime64(3),
    user_id     UInt64,
    event_type  LowCardinality(String),
    -- Store flexible attributes as Map
    attrs       Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id);
```

## Benchmark Insert Performance

```bash
# Generate test data and measure throughput
clickhouse-benchmark --concurrency 10 --iterations 100 \
  --query "INSERT INTO events SELECT today(), now(), rand(), 'click', map('k','v') FROM numbers(10000)"
```

## Summary

High write throughput in ClickHouse requires large batch sizes (10,000+ rows per insert), async inserts for small-batch producers, monthly or weekly partitioning to control part counts, `LowCardinality` strings, and tuned `parts_to_delay_insert` and `parts_to_throw_insert` thresholds. Background merge capacity must keep up with the ingestion rate to prevent part accumulation.
