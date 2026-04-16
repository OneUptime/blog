# How to Use Hudi Table Engine in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hudi, Storage, Table Engine, S3, Data Lake

Description: Learn how to use the Hudi table engine in ClickHouse to query Apache Hudi tables on S3, enabling fast analytics without copying data out of your data lakehouse.

---

## Introduction

ClickHouse includes a native `Hudi` table engine for reading Apache Hudi tables stored on S3-compatible object storage. Apache Hudi (Hadoop Upserts Deletes and Incrementals) provides record-level upserts, incremental queries, and ACID compliance on top of Parquet or ORC files.

## Architecture Overview

```mermaid
graph LR
    A[Hudi Table on S3] -->|Hudi Engine| B[ClickHouse]
    B --> C[SQL Queries / Analytics]
    A --> D[.hoodie/ metadata]
    A --> E[base files .parquet]
    A --> F[log files .avro]
```

## Prerequisites

- ClickHouse 23.3 or later
- Apache Hudi table written with Copy-on-Write (CoW) format (the ClickHouse Hudi engine is read-only and supports CoW tables)
- S3 bucket with appropriate IAM permissions

## Creating a Hudi Table in ClickHouse

```sql
CREATE TABLE hudi_events
ENGINE = Hudi(
    's3://my-data-lake/hudi/events/',
    'AKIAIOSFODNN7EXAMPLE',
    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
);
```

ClickHouse reads the `.hoodie/` metadata directory to identify the latest snapshot and determine which base Parquet files constitute the current table state.

## Using Named Collections

Define credentials once in `config.xml`:

```xml
<clickhouse>
  <named_collections>
    <lake_s3>
      <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
      <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
      <region>us-east-1</region>
    </lake_s3>
  </named_collections>
</clickhouse>
```

Then reference it in DDL:

```sql
CREATE TABLE hudi_events
ENGINE = Hudi(
    lake_s3,
    url = 's3://my-data-lake/hudi/events/'
);
```

## Basic Queries

```sql
-- Count events in a time window
SELECT
    event_type,
    count() AS cnt
FROM hudi_events
WHERE event_ts >= '2024-01-01 00:00:00'
  AND event_ts <  '2024-02-01 00:00:00'
GROUP BY event_type
ORDER BY cnt DESC;
```

```sql
-- Inspect schema
DESCRIBE TABLE hudi_events;
```

## Copy-on-Write vs Merge-on-Read

The ClickHouse Hudi engine is designed to read Copy-on-Write (CoW) Hudi tables:

| Table Type | ClickHouse behavior |
|---|---|
| Copy-on-Write (CoW) | Reads base Parquet files directly; always consistent |
| Merge-on-Read (MoR) | Not supported by the Hudi engine; compact to a CoW snapshot first |

For MoR-only pipelines, consider compacting the Hudi table in Spark so that the latest data is available as base Parquet files before querying from ClickHouse.

## Joining Hudi Tables with ClickHouse Native Tables

```sql
SELECT
    h.user_id,
    h.event_type,
    u.email
FROM hudi_events AS h
JOIN users AS u ON h.user_id = u.id
WHERE h.event_ts >= today() - INTERVAL 7 DAY;
```

Here `users` is a native MergeTree table in ClickHouse.

## Checking Active Files

```sql
-- The Hudi engine exposes no virtual columns by default,
-- but you can verify data freshness via query_log
SELECT
    query,
    event_time,
    read_rows,
    read_bytes
FROM system.query_log
WHERE tables LIKE '%hudi_events%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Performance Tips

- CoW tables always provide the best read performance from ClickHouse.
- Partition Hudi tables by a date field (e.g., `hoodie.datasource.write.partitionpath.field=event_date`) to allow partition pruning in ClickHouse queries.
- Keep ClickHouse in the same AWS region as your S3 bucket.
- The Hudi engine is read-only; all writes must go through the Hudi writer (Spark, Flink, etc.).

```sql
-- Leverage partition pruning
SELECT user_id, event_type
FROM hudi_events
WHERE event_date = '2024-06-15';
```

## Summary

The Hudi table engine in ClickHouse provides a zero-copy path to query Apache Hudi tables stored on S3. ClickHouse reads the `.hoodie/` metadata to identify live Parquet files and serves SQL queries directly. The engine is read-only and targets Copy-on-Write tables; for MoR pipelines, compact to a CoW snapshot first. This integration lets you run fast analytical queries on your Hudi lakehouse without additional ETL.
