# How to Configure TTL to Move Data to Cold Storage in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TTL, Storage, Database, Configuration, Performance

Description: Learn how to use ClickHouse TTL expressions to automatically move aging data from fast local disks to cold storage volumes or delete it entirely.

---

ClickHouse TTL (Time To Live) is a table feature that runs background operations on data parts once a time expression evaluates to true. TTL can delete rows, delete parts, recompress data, or move parts to a different storage volume. Using TTL to move data to cold storage is one of the most effective ways to control storage costs in ClickHouse without any application-level changes.

## How TTL Works in ClickHouse

TTL expressions are evaluated per part. When all rows in a part satisfy the TTL condition, ClickHouse applies the defined action. TTL is evaluated:

- During background merges
- When you run `OPTIMIZE TABLE ... FINAL`
- When you run `ALTER TABLE ... MATERIALIZE TTL`

ClickHouse does not evaluate TTL row by row. Parts that contain a mix of expired and non-expired rows are not affected until a merge combines them into a part where all rows are expired.

## Basic Setup: Two Storage Tiers

Define a storage policy with hot and cold volumes:

```xml
<clickhouse>
  <storage_configuration>
    <disks>
      <ssd>
        <path>/mnt/ssd/clickhouse/</path>
      </ssd>
      <hdd>
        <path>/mnt/hdd/clickhouse/</path>
      </hdd>
    </disks>

    <policies>
      <tiered>
        <volumes>
          <hot>
            <disk>ssd</disk>
          </hot>
          <cold>
            <disk>hdd</disk>
          </cold>
        </volumes>
      </tiered>
    </policies>
  </storage_configuration>
</clickhouse>
```

## Creating a Table with TTL Move

```sql
CREATE TABLE server_metrics
(
    server_id UInt32,
    metric    LowCardinality(String),
    value     Float64,
    ts        DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, server_id)
TTL ts + INTERVAL 30 DAY TO VOLUME 'cold'
SETTINGS storage_policy = 'tiered';
```

Data older than 30 days is moved from the `hot` volume to the `cold` volume.

## Adding TTL Deletion After Cold Storage

Chain multiple TTL clauses: move to cold after 30 days, delete after 365 days:

```sql
CREATE TABLE server_metrics
(
    server_id UInt32,
    metric    LowCardinality(String),
    value     Float64,
    ts        DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, server_id)
TTL
    ts + INTERVAL 30 DAY TO VOLUME 'cold',
    ts + INTERVAL 365 DAY DELETE
SETTINGS storage_policy = 'tiered';
```

TTL clauses are applied progressively as data ages. Each clause takes effect when its time condition is met, so data is first moved to cold storage and later deleted when the deletion threshold is reached.

## Adding TTL to an Existing Table

```sql
ALTER TABLE server_metrics
    MODIFY TTL
        ts + INTERVAL 30 DAY TO VOLUME 'cold',
        ts + INTERVAL 365 DAY DELETE;
```

## Moving to a Specific Disk Instead of a Volume

You can target a specific disk rather than a named volume:

```sql
CREATE TABLE server_metrics
(
    server_id UInt32,
    metric    LowCardinality(String),
    value     Float64,
    ts        DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, server_id)
TTL ts + INTERVAL 14 DAY TO DISK 'hdd'
SETTINGS storage_policy = 'tiered';
```

## Using TTL with S3 Cold Storage

Configure an S3 disk as the cold tier in the policy (see the S3 disk guide for full XML), then reference the S3 volume in the TTL:

```sql
CREATE TABLE logs
(
    log_id  UInt64,
    level   LowCardinality(String),
    message String,
    ts      DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (ts, log_id)
TTL
    ts + INTERVAL 7 DAY TO VOLUME 'cold_s3',
    ts + INTERVAL 90 DAY DELETE
SETTINGS storage_policy = 'local_to_s3';
```

## Forcing Immediate TTL Evaluation

By default, TTL processing is lazy. To apply TTL moves immediately without waiting for a background merge:

```sql
-- Trigger a merge and apply TTL
OPTIMIZE TABLE server_metrics FINAL;

-- Or apply TTL without a full merge
ALTER TABLE server_metrics MATERIALIZE TTL;
```

`MATERIALIZE TTL` is non-blocking but may take time on large tables.

## Verifying TTL Configuration

```sql
-- Check TTL expression on the table
SELECT name, engine_full
FROM system.tables
WHERE name = 'server_metrics'
  AND database = currentDatabase();
```

Check current part locations:

```sql
SELECT
    name         AS part,
    disk_name,
    modification_time,
    min_time,
    max_time,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE active = 1
  AND table = 'server_metrics'
  AND database = currentDatabase()
ORDER BY min_time;
```

## Monitoring TTL Background Jobs

```sql
SELECT
    database,
    table,
    elapsed,
    progress,
    num_parts,
    result_part_name
FROM system.merges
WHERE is_mutation = 0
ORDER BY elapsed DESC;
```

## Column-Level TTL for Selective Data Expiry

TTL can also act at the column level - replacing a column's value with its default when the row ages, rather than deleting the whole row:

```sql
CREATE TABLE user_events
(
    user_id    UInt64,
    event_type String,
    raw_data   String TTL ts + INTERVAL 7 DAY,
    ts         DateTime
)
ENGINE = MergeTree()
ORDER BY (ts, user_id);
```

After 7 days, `raw_data` is replaced with an empty string. The row itself is retained.

## Summary

ClickHouse TTL expressions give you fine-grained control over data lifecycle. Use `TO VOLUME` or `TO DISK` clauses to move aging data automatically to cold storage, and chain a `DELETE` clause to purge fully expired data. Pair TTL with a multi-volume storage policy for a fully automated hot-to-cold tiering pipeline that requires no application changes.
