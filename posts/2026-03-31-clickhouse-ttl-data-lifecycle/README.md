# How to Configure TTL for Data Lifecycle in ClickHouse MergeTree

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MergeTree, TTL, Data Lifecycle, Database, Storage, SQL

Description: Learn how to configure TTL rules in ClickHouse MergeTree tables to automatically expire, move, or aggregate rows and columns based on time, reducing storage costs and simplifying data retention.

---

TTL (Time To Live) in ClickHouse MergeTree tables lets you define rules that automatically expire rows, archive data to cheaper storage, or aggregate old data into summary records. TTL rules run in the background without manual intervention, making data lifecycle management declarative and automatic.

## Types of TTL in ClickHouse

ClickHouse supports four types of TTL rules:

| Type | What it does |
|---|---|
| Row TTL | Deletes entire rows after a specified time |
| Column TTL | Resets a specific column to its default value after a time |
| Move to disk/volume | Moves parts to a different storage tier |
| Aggregation TTL | Aggregates and replaces rows with a summary after a time |

## Basic Row TTL: Auto-Delete Old Rows

```sql
CREATE TABLE access_logs
(
    ts          DateTime,
    client_ip   IPv4,
    path        String,
    status_code UInt16,
    bytes_sent  UInt32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, client_ip)
TTL ts + INTERVAL 90 DAY;
```

Rows older than 90 days are deleted during background merges. ClickHouse does not delete them immediately on every merge - it uses the `merge_with_ttl_timeout` setting to schedule TTL-aware merges.

## Adding TTL to an Existing Table

```sql
ALTER TABLE access_logs
MODIFY TTL ts + INTERVAL 90 DAY;
```

Remove TTL from a table:

```sql
ALTER TABLE access_logs
REMOVE TTL;
```

## Multiple Row TTL Rules (WHERE Conditions)

Since ClickHouse 20.8, you can have TTL rules with conditions:

```sql
CREATE TABLE events
(
    ts         DateTime,
    user_id    UInt64,
    event_type LowCardinality(String),
    is_test    UInt8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id)
TTL
    ts + INTERVAL 1 DAY DELETE WHERE is_test = 1,  -- delete test events after 1 day
    ts + INTERVAL 365 DAY DELETE;                   -- delete all events after 1 year
```

ClickHouse evaluates all applicable DELETE rules and removes a row when any matching rule's TTL expression has expired.

## Column-Level TTL: Nullify Old Column Values

Column TTL resets a column to its default value without deleting the entire row. Useful for wiping PII fields while retaining aggregate-level data:

```sql
CREATE TABLE user_events
(
    ts          DateTime,
    user_id     UInt64,
    event       String,
    ip_address  IPv4  TTL ts + INTERVAL 30 DAY,    -- wipe IP after 30 days
    user_agent  String TTL ts + INTERVAL 30 DAY    -- wipe user agent after 30 days
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id);
```

After the TTL expires, `ip_address` and `user_agent` are reset to `0.0.0.0` and `''` respectively.

## Storage Tiering: Move to Cheaper Disk

ClickHouse can automatically move old parts to a configured secondary storage volume (e.g., HDD, S3):

First, configure storage volumes in `config.xml`:

```xml
<storage_configuration>
    <disks>
        <hot_ssd>
            <path>/var/lib/clickhouse/data/hot/</path>
        </hot_ssd>
        <warm_hdd>
            <path>/mnt/hdd/clickhouse/</path>
        </warm_hdd>
        <cold_s3>
            <type>s3</type>
            <endpoint>https://my-bucket.s3.amazonaws.com/clickhouse/</endpoint>
            <access_key_id>ACCESS_KEY</access_key_id>
            <secret_access_key>SECRET_KEY</secret_access_key>
        </cold_s3>
    </disks>
    <policies>
        <tiered>
            <volumes>
                <hot>
                    <disk>hot_ssd</disk>
                </hot>
                <warm>
                    <disk>warm_hdd</disk>
                </warm>
                <cold>
                    <disk>cold_s3</disk>
                </cold>
            </volumes>
        </tiered>
    </policies>
</storage_configuration>
```

Then define TTL moves in the table:

```sql
CREATE TABLE metrics
(
    ts      DateTime,
    host    String,
    metric  String,
    value   Float64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, host, metric)
TTL
    ts + INTERVAL 7 DAY  TO VOLUME 'hot',
    ts + INTERVAL 30 DAY TO VOLUME 'warm',
    ts + INTERVAL 90 DAY TO VOLUME 'cold',
    ts + INTERVAL 365 DAY;  -- delete after 1 year
SETTINGS storage_policy = 'tiered';
```

This creates a full hot-warm-cold lifecycle automatically.

## Aggregation TTL: Replace Old Rows with Summaries

Aggregation TTL keeps a compact summary of old data instead of deleting it. This is useful for retaining long-term trends while reducing storage:

```sql
CREATE TABLE page_views
(
    ts           DateTime,
    page         String,
    views        UInt64,
    unique_users UInt64
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, page)
TTL ts + INTERVAL 30 DAY
    GROUP BY toStartOfDay(ts), page
    SET
        ts     = min(ts),
        views  = sum(views),
        unique_users = max(unique_users);
```

After 30 days, rows are collapsed to one row per `(day, page)` with aggregated values. Individual event rows are replaced by daily summaries.

## Forcing TTL Execution

TTL is applied during background merges. Force an immediate TTL pass:

```sql
-- Force TTL on all parts (use with caution in production)
ALTER TABLE access_logs
MATERIALIZE TTL;
```

Or trigger a merge for a specific partition:

```sql
OPTIMIZE TABLE access_logs PARTITION '202501' FINAL;
```

## Controlling TTL Merge Frequency

```sql
-- How often TTL merges are triggered (seconds, default: 14400 = 4 hours)
ALTER TABLE access_logs
MODIFY SETTING merge_with_ttl_timeout = 3600;  -- check every hour
```

In server config:

```xml
<merge_tree>
    <merge_with_ttl_timeout>86400</merge_with_ttl_timeout>
</merge_tree>
```

## Viewing Defined TTL Rules

```sql
SELECT
    database,
    table,
    engine_full
FROM system.tables
WHERE database = 'default' AND table = 'access_logs';
```

Or use `SHOW CREATE TABLE`:

```sql
SHOW CREATE TABLE access_logs;
```

The TTL definition appears in the `CREATE TABLE` output.

## Monitoring TTL Progress

```sql
-- Partitions and their minimum timestamps (helps verify TTL is working)
SELECT
    partition,
    min_time,
    max_time,
    rows,
    formatReadableSize(data_compressed_bytes) AS size
FROM system.parts
WHERE active AND database = 'default' AND table = 'access_logs'
ORDER BY partition;
```

## Practical Example: GDPR-Compliant Log Table

```sql
CREATE TABLE user_activity
(
    ts          DateTime,
    user_id     UInt64,
    action      LowCardinality(String),
    ip          IPv4   TTL ts + INTERVAL 30 DAY,    -- wipe IP for GDPR
    device_id   String TTL ts + INTERVAL 90 DAY,    -- wipe device ID after 90 days
    session_id  String TTL ts + INTERVAL 7 DAY      -- wipe session IDs quickly
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id, action)
TTL ts + INTERVAL 2 YEAR;  -- delete all rows after 2 years
```

## Summary

TTL in ClickHouse MergeTree provides a declarative, automatic approach to data lifecycle management. Key points:

- Use row TTL to delete entire rows after a retention period.
- Use column TTL to wipe specific fields (e.g., PII) while retaining the row.
- Use storage move TTL to implement hot-warm-cold tiering across disk volumes or S3.
- Use aggregation TTL to replace old detailed rows with compact summaries.
- Trigger TTL manually with `MATERIALIZE TTL` or `OPTIMIZE TABLE ... FINAL`.
- Tune `merge_with_ttl_timeout` to control how aggressively TTL merges run.
