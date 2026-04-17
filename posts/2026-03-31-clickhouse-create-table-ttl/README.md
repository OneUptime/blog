# How to Create Tables with TTL Expressions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, TTL, Data Retention, MergeTree

Description: Learn how to define TTL expressions in ClickHouse MergeTree tables to automatically delete rows or move data to cold storage on a schedule.

---

Time-To-Live (TTL) expressions in ClickHouse automate data lifecycle management. You can instruct the engine to delete old rows, move them to a cheaper storage tier, or recompress them - all without application-level intervention. TTL is supported on MergeTree family tables.

## TTL Syntax Overview

TTL can be applied at two levels:

- **Column-level TTL** - expires individual column values, replacing them with the default value for the data type.
- **Table-level TTL** - expires entire rows (DELETE) or moves/recompresses them (TO DISK, TO VOLUME, RECOMPRESS).

```sql
-- Column-level TTL
column_name data_type TTL expr

-- Table-level TTL (one or more rules)
TTL expr [DELETE | TO DISK 'disk_name' | TO VOLUME 'volume_name' | RECOMPRESS CODEC(codec)]
         [WHERE condition]
         [GROUP BY key [SET col = agg_expr [,...]]]
```

## Column-Level TTL

Column TTL clears a column's value when the TTL expression evaluates to a past timestamp:

```sql
CREATE TABLE user_sessions
(
    session_id   UUID          DEFAULT generateUUIDv4(),
    user_id      UInt64,
    created_at   DateTime      DEFAULT now(),
    -- Clear PII fields after 90 days
    ip_address   IPv4          TTL created_at + INTERVAL 90 DAY,
    user_agent   String        TTL created_at + INTERVAL 90 DAY,
    -- Keep session counts indefinitely
    page_views   UInt32
)
ENGINE = MergeTree()
ORDER BY (created_at, user_id);
```

When TTL fires, `ip_address` resets to `0.0.0.0` and `user_agent` resets to `''`.

## Table-Level TTL - DELETE

The most common pattern: delete rows older than a retention window.

```sql
CREATE TABLE application_logs
(
    timestamp  DateTime  DEFAULT now(),
    level      LowCardinality(String),
    service    LowCardinality(String),
    message    String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, service)
-- Delete rows older than 30 days
TTL timestamp + INTERVAL 30 DAY DELETE;
```

## Table-Level TTL - TO DISK and TO VOLUME

Move cold data to a slower, cheaper storage tier:

```sql
CREATE TABLE metrics
(
    ts       DateTime,
    metric   LowCardinality(String),
    value    Float64
)
ENGINE = MergeTree()
ORDER BY (ts, metric)
SETTINGS storage_policy = 'hot_to_cold'
-- Keep hot data for 7 days on SSD, then move to HDD
TTL ts + INTERVAL 7 DAY TO DISK 'hdd',
    ts + INTERVAL 90 DAY TO VOLUME 'archive',
    ts + INTERVAL 365 DAY DELETE;
```

The storage policy must be defined in the server configuration:

```xml
<!-- config.d/storage.xml -->
<clickhouse>
    <storage_configuration>
        <disks>
            <ssd>  <path>/var/lib/clickhouse/</path> </ssd>
            <hdd>  <path>/mnt/hdd/clickhouse/</path> </hdd>
        </disks>
        <policies>
            <hot_to_cold>
                <volumes>
                    <hot>   <disk>ssd</disk> </hot>
                    <cold>  <disk>hdd</disk> </cold>
                    <archive>
                        <disk>s3_disk</disk>
                    </archive>
                </volumes>
            </hot_to_cold>
        </policies>
    </storage_configuration>
</clickhouse>
```

## Table-Level TTL - RECOMPRESS

Recompress old data with a heavier codec to save space:

```sql
CREATE TABLE events
(
    created_at DateTime,
    user_id    UInt64,
    payload    String
)
ENGINE = MergeTree()
ORDER BY created_at
-- Recent data: fast LZ4 codec; old data: slow but smaller ZSTD
TTL created_at + INTERVAL 7 DAY
    RECOMPRESS CODEC(ZSTD(3)),
    created_at + INTERVAL 365 DAY DELETE;
```

## TTL with WHERE Condition (Conditional Deletion)

```sql
CREATE TABLE event_stream
(
    created_at DateTime,
    type       LowCardinality(String),
    user_id    UInt64,
    payload    String
)
ENGINE = MergeTree()
ORDER BY created_at
-- Delete debug events after 7 days, keep audit events indefinitely
TTL created_at + INTERVAL 7 DAY DELETE WHERE type = 'debug';
```

## TTL with GROUP BY Aggregation (Row Collapsing)

Collapse old rows into aggregated summaries during TTL processing:

```sql
CREATE TABLE hourly_requests
(
    ts        DateTime,
    service   LowCardinality(String),
    requests  UInt64
)
ENGINE = MergeTree()
ORDER BY (ts, service)
-- After 30 days, collapse to daily granularity
TTL toStartOfDay(ts) + INTERVAL 30 DAY
    GROUP BY toStartOfDay(ts), service
    SET ts = toStartOfDay(ts),
        requests = sum(requests);
```

## Adding TTL to an Existing Table

```sql
-- Add table-level TTL
ALTER TABLE application_logs
    MODIFY TTL timestamp + INTERVAL 60 DAY;

-- Remove TTL
ALTER TABLE application_logs
    REMOVE TTL;
```

## Triggering TTL Manually

TTL is applied lazily during background merges. Force immediate execution:

```sql
OPTIMIZE TABLE application_logs FINAL;
```

## Checking TTL Definitions

```sql
SELECT
    database,
    name,
    engine,
    create_table_query
FROM system.tables
WHERE create_table_query LIKE '%TTL%'
  AND database = 'default';
```

## Summary

ClickHouse TTL expressions automate data lifecycle at the column or table level. Table-level TTL supports `DELETE`, `TO DISK`, `TO VOLUME`, `RECOMPRESS`, and `GROUP BY` aggregation modes, and can be conditioned with `WHERE`. TTL fires during background merges and can be forced with `OPTIMIZE TABLE FINAL`. This makes TTL the primary tool for automated data retention and tiered storage in ClickHouse.
