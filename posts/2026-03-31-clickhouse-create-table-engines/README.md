# How to Create a Table in ClickHouse with Different Engines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Table, MergeTree, Table Engine

Description: Learn how to create ClickHouse tables and pick the right engine - MergeTree, ReplacingMergeTree, Log, Memory, and more - with practical examples.

---

ClickHouse tables are always backed by an engine that determines how data is stored, merged, indexed, and replicated. Choosing the wrong engine is one of the most common mistakes in new ClickHouse deployments. This post walks through `CREATE TABLE` syntax and the most important engines you will encounter in practice.

## Basic CREATE TABLE Syntax

```sql
CREATE TABLE [IF NOT EXISTS] [db.]table_name
(
    column1 DataType [DEFAULT expr] [CODEC(codec)],
    column2 DataType,
    ...
)
ENGINE = EngineName(engine_params)
[ORDER BY expr]
[PARTITION BY expr]
[PRIMARY KEY expr]
[SAMPLE BY expr]
[SETTINGS setting = value, ...];
```

Every table requires an `ENGINE` clause. For MergeTree-family engines, `ORDER BY` is also required.

## MergeTree - The Workhorse Engine

`MergeTree` is the standard engine for append-heavy analytical workloads. Data is written in parts and merged in the background.

```sql
CREATE TABLE events
(
    event_date  Date,
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    properties  String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, user_id, event_time)
SETTINGS index_granularity = 8192;
```

`ORDER BY` defines the sort key and the primary key index used for range scans. Partition by a time bucket to enable efficient partition pruning and drops.

## ReplacingMergeTree - Deduplication

`ReplacingMergeTree` removes duplicate rows with the same sort key during background merges. Pass an optional `ver` column to keep the row with the highest version.

```sql
CREATE TABLE user_profiles
(
    user_id     UInt64,
    email       String,
    updated_at  DateTime,
    version     UInt64
)
ENGINE = ReplacingMergeTree(version)
ORDER BY user_id;
```

Deduplication is eventual - always use `FINAL` or `argMax` patterns when querying if you need strongly deduplicated results at read time.

## SummingMergeTree - Pre-aggregation

`SummingMergeTree` sums numeric columns for rows that share the same sort key during merges, enabling lightweight pre-aggregation.

```sql
CREATE TABLE daily_page_views
(
    page_date   Date,
    page_path   String,
    views       UInt64,
    unique_users UInt64
)
ENGINE = SummingMergeTree((views, unique_users))
ORDER BY (page_date, page_path);
```

The tuple argument lists which columns to sum. Columns not listed are kept from one of the merged rows (not summed).

## AggregatingMergeTree - Incremental Aggregation

`AggregatingMergeTree` stores intermediate aggregation states (created with `-State` combiners) and merges them during background merges.

```sql
CREATE TABLE session_stats
(
    session_date  Date,
    country       LowCardinality(String),
    session_count AggregateFunction(count, UInt64),
    avg_duration  AggregateFunction(avg, Float64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (session_date, country);
```

Typically used as the target of a `MATERIALIZED VIEW` that transforms raw rows into aggregate states.

## CollapsingMergeTree - Log-based Updates

`CollapsingMergeTree` simulates updates by collapsing pairs of sign=1 (insert) and sign=-1 (delete) rows with the same sort key.

```sql
CREATE TABLE order_snapshots
(
    order_id    UInt64,
    status      String,
    amount      Decimal(18,2),
    updated_at  DateTime,
    sign        Int8
)
ENGINE = CollapsingMergeTree(sign)
ORDER BY order_id;
```

Insert a row with `sign = -1` to cancel the previous state and a row with `sign = 1` for the new state. Collapsing happens during background merges (or at query time with `FINAL`), so both rows remain visible until merged.

## ReplicatedMergeTree - High Availability

Prefixing `Replicated` to any MergeTree engine adds ZooKeeper/Keeper-based replication:

```sql
CREATE TABLE events_replicated
(
    event_date Date,
    event_time DateTime,
    user_id    UInt64,
    event_type String
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_type, user_id, event_time);
```

The ZooKeeper path and replica name are usually macro-expanded from `config.xml`.

## Log Engine Family - Simple Sequential Storage

`Log` engines are lightweight and write data sequentially. They have no background merges or primary key indexes.

```sql
-- Log: one file per column plus marks, supports multi-threaded reads
CREATE TABLE debug_log
(
    ts      DateTime,
    message String
)
ENGINE = Log;

-- TinyLog: one file per column, no marks - best for tiny tables
CREATE TABLE config_dump
(
    key   String,
    value String
)
ENGINE = TinyLog;

-- StripeLog: all columns stored in a single data file
CREATE TABLE import_staging
(
    id   UInt64,
    data String
)
ENGINE = StripeLog;
```

Use Log-family tables for staging, debugging, and tables with fewer than a million rows.

## Memory Engine - In-RAM Tables

`Memory` tables exist entirely in RAM and are lost on server restart. They are extremely fast and useful for caching reference data or building integration tests.

```sql
CREATE TABLE country_codes
(
    code String,
    name String
)
ENGINE = Memory;
```

## Null Engine - Discard Everything

`Null` engine accepts writes but discards all data immediately. It is useful as the source table for a `MATERIALIZED VIEW` when you only care about the transformed output.

```sql
CREATE TABLE raw_events_sink
(
    event_time DateTime,
    payload    String
)
ENGINE = Null;
```

## Buffer Engine - Write Buffering

`Buffer` accumulates writes in memory and flushes to another table when thresholds are reached:

```sql
CREATE TABLE events_buffer AS events
ENGINE = Buffer(
    default,        -- destination database
    events,         -- destination table
    16,             -- number of buckets
    10,             -- min flush seconds
    100,            -- max flush seconds
    10000,          -- min flush rows
    1000000,        -- max flush rows
    10000000,       -- min flush bytes
    100000000       -- max flush bytes
);
```

## Creating a Table Like Another Table

Copy the schema of an existing table without copying data:

```sql
CREATE TABLE events_backup AS events ENGINE = MergeTree()
ORDER BY (event_type, user_id, event_time);
```

Or copy both schema and data using `CREATE TABLE ... AS SELECT`:

```sql
CREATE TABLE events_archive
ENGINE = MergeTree()
ORDER BY (event_type, user_id, event_time)
AS SELECT * FROM events WHERE event_date < '2025-01-01';
```

## Summary

ClickHouse table engines cover a wide spectrum - from `MergeTree` for high-throughput analytics to `Memory` for ephemeral reference tables and `Null` for materialized view pipelines. Start with `MergeTree` for most workloads, reach for `ReplacingMergeTree` when you need upsert semantics, and add the `Replicated` prefix when you need high availability. Always define a thoughtful `ORDER BY` key because it drives both query performance and merge efficiency.
