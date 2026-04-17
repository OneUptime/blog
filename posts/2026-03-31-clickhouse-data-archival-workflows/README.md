# How to Implement Data Archival Workflows in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Archival, TTL, Storage Tier, Cold Storage

Description: Learn how to implement automated data archival workflows in ClickHouse using TTL rules, storage tiers, and external table engines.

---

## Why Archival Matters in ClickHouse

ClickHouse excels at hot analytics over recent data. Older data is queried less frequently but must be retained for compliance or historical analysis. Archival workflows move old data to cheaper, slower storage - reducing costs while keeping data accessible.

## Strategy 1: TTL-Based Move to Cold Storage Volume

Configure a storage policy with hot and cold volumes, then use TTL to migrate data automatically:

```sql
-- In storage_configuration.xml:
-- hot: fast NVMe SSDs
-- cold: cheap HDDs or object storage
```

Create the table with a tiered TTL:

```sql
CREATE TABLE http_logs (
    timestamp   DateTime,
    service     String,
    status_code UInt16,
    response_ms Float64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, service)
TTL
    timestamp + INTERVAL 30  DAY TO VOLUME 'warm',
    timestamp + INTERVAL 90  DAY TO VOLUME 'cold',
    timestamp + INTERVAL 365 DAY DELETE
SETTINGS storage_policy = 'tiered';
```

## Strategy 2: Archiving to an S3-Backed Table

Use the S3 table engine as the archive destination:

```sql
-- Create an S3-backed archive table.
-- Note: wildcards in the URL are read-only, so for writes use a
-- concrete path or the {_partition_id} substitution with PARTITION BY.
CREATE TABLE http_logs_archive (
    timestamp   DateTime,
    service     String,
    status_code UInt16,
    response_ms Float64
) ENGINE = S3('https://s3.amazonaws.com/my-archive-bucket/http_logs/{_partition_id}.parquet', 'Parquet')
PARTITION BY toYYYYMM(timestamp);
```

Move old data:

```sql
INSERT INTO http_logs_archive
SELECT * FROM http_logs
WHERE timestamp < now() - INTERVAL 90 DAY;

-- Delete from hot table after archival
ALTER TABLE http_logs DELETE
WHERE timestamp < now() - INTERVAL 90 DAY;
```

## Strategy 3: Partition-Based Archival

For monthly partitioned tables, detach and archive entire partitions:

```sql
-- Copy a partition to the archive table (source remains intact)
ALTER TABLE http_logs_archive ATTACH PARTITION '202301' FROM http_logs;

-- Or move it outright (removed from source)
ALTER TABLE http_logs MOVE PARTITION '202301' TO TABLE http_logs_archive;

-- If you want to free the source without keeping data in ClickHouse,
-- drop the partition after copying
ALTER TABLE http_logs DROP PARTITION '202301';
```

## Automating Archival with Scheduled Jobs

ClickHouse does not have a generic cron-style job DDL, but refreshable materialized views can run a SELECT on a schedule and append results to a target table:

```sql
CREATE MATERIALIZED VIEW archive_old_data
REFRESH EVERY 1 DAY OFFSET 2 HOUR
APPEND
TO http_logs_archive
AS
    SELECT * FROM http_logs
    WHERE toDate(timestamp) = toDate(now() - INTERVAL 91 DAY);
```

Alternatively, trigger archival from an external scheduler (cron, Airflow, etc.) via clickhouse-client.

## Verifying Archival Completeness

Compare row counts before and after:

```sql
-- Count rows in hot table for target date range
SELECT count() FROM http_logs WHERE toYYYYMM(timestamp) = 202301;

-- Count rows in archive
SELECT count() FROM http_logs_archive WHERE toYYYYMM(timestamp) = 202301;
```

## Summary

ClickHouse data archival workflows range from automatic TTL-based volume migration for transparent tiering, to explicit partition-level moves for bulk operations, to S3-backed archive tables for cost-effective long-term retention. Choose the strategy based on your query access patterns and retention requirements, and always verify row counts after archival to confirm data integrity.
