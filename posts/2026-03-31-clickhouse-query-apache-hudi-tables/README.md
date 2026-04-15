# How to Query Apache Hudi Tables from ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Apache Hudi, Data Lake, S3, Parquet, Integration

Description: Query Apache Hudi tables stored on S3 from ClickHouse using the Hudi table function and engine for federated data lake analytics.

---

Apache Hudi (Hadoop Upserts Deletes and Incrementals) is an open-source data lake format that supports upserts and incremental queries. ClickHouse can read Hudi tables via the `Hudi` table engine and table function.

## Overview

Hudi tables store data in Parquet files with metadata in a `.hoodie` directory. ClickHouse reads the latest snapshot of a Hudi table (Copy-on-Write tables are fully supported).

## Reading a Hudi Table

Use the `hudi` table function:

```sql
SELECT *
FROM hudi('s3://my-bucket/hudi-tables/events/', 'ACCESS_KEY', 'SECRET_KEY')
LIMIT 100;
```

## Create a Hudi-Backed Table

```sql
CREATE TABLE events_hudi
ENGINE = Hudi('s3://my-bucket/hudi-tables/events/', 'ACCESS_KEY', 'SECRET_KEY');
```

Query it:

```sql
SELECT
    event_type,
    count() AS event_count,
    uniq(user_id) AS unique_users
FROM events_hudi
WHERE toDate(parseDateTimeBestEffort(_hoodie_commit_time)) >= '2025-01-01'
GROUP BY event_type
ORDER BY event_count DESC;
```

## Hudi Table Types

ClickHouse supports **Copy-on-Write (CoW)** Hudi tables, where data is rewritten in full on every update. CoW tables provide full read support for snapshot queries.

**Merge-on-Read (MoR)** tables are not fully supported. ClickHouse can only read the base (compacted) Parquet files from MoR tables, but it does not merge the delta log files. To read MoR data reliably, ensure compaction has run recently so the latest data is in the base files:

```bash
# Run Hudi compaction
spark-submit --class org.apache.hudi.utilities.HoodieCompactor \
  hudi-utilities-bundle.jar \
  --base-path s3://my-bucket/hudi-tables/events/ \
  --table-name events \
  --instant-time 20250101000000
```

## Inspect Hudi Metadata Fields

Hudi adds metadata columns to every record:

```sql
SELECT
    _hoodie_commit_time,
    _hoodie_commit_seqno,
    _hoodie_record_key,
    _hoodie_partition_path,
    event_type,
    user_id
FROM events_hudi
LIMIT 5;
```

## Incremental Queries

While ClickHouse does not natively support Hudi's incremental query mode, you can approximate it using the commit time metadata:

```sql
SELECT *
FROM events_hudi
WHERE _hoodie_commit_time > '20250101000000'
LIMIT 1000;
```

## Copy Hudi Data into ClickHouse

For analytical workloads, import Hudi data into native ClickHouse storage:

```sql
CREATE TABLE events_local (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32
) ENGINE = MergeTree()
ORDER BY (event_type, event_time);

INSERT INTO events_local
SELECT
    parseDateTimeBestEffort(_hoodie_commit_time) AS event_time,
    event_type,
    user_id
FROM hudi('s3://my-bucket/hudi-tables/events/', 'ACCESS_KEY', 'SECRET_KEY');
```

## Summary

ClickHouse supports Apache Hudi tables via the `Hudi` engine and table function. Copy-on-Write Hudi tables are fully supported for snapshot reads. Merge-on-Read tables are only partially supported (base files only, without delta log merging). For heavy analytical workloads, import Hudi data into native MergeTree tables to avoid the overhead of reading from S3 on every query.
