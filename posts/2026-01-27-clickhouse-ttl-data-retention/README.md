# How to Implement ClickHouse TTL for Data Retention

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TTL, Data Retention, Time Series, Analytics, Database, Storage Management

Description: Learn how to use ClickHouse TTL (Time To Live) for automatic data retention, tiered storage, and data lifecycle management with practical examples.

---

> TTL in ClickHouse is not just about deleting old data - it is a complete data lifecycle management system that can move, aggregate, and expire data automatically.

ClickHouse's TTL feature lets you define rules for automatic data management. Instead of running manual cleanup jobs or writing cron scripts, you declare your retention policies directly in the table schema. ClickHouse handles the rest.

This guide covers everything from basic deletion policies to advanced tiered storage and data rollup strategies.

---

## What is TTL in ClickHouse?

TTL (Time To Live) is a declarative way to manage data lifecycle in ClickHouse. You can use TTL to:

- **Delete rows** after a certain age
- **Delete columns** after a certain age (keep rows, remove specific fields)
- **Move data** between storage volumes (hot to cold storage)
- **Aggregate data** into summary tables before deletion (rollup)

TTL rules are evaluated during merge operations. When ClickHouse merges data parts, it checks TTL conditions and applies the specified actions.

---

## Column-Level TTL for Deletion

Column-level TTL removes specific columns from rows while keeping the rest of the data. This is useful when you need the core data but can discard certain fields after a period.

```sql
-- Create table with column-level TTL
-- The 'details' column will be cleared after 30 days
CREATE TABLE events
(
    event_id UUID,
    event_time DateTime,
    event_type String,
    user_id UInt64,
    -- This column will be set to default value after 30 days
    details String TTL event_time + INTERVAL 30 DAY
)
ENGINE = MergeTree()
ORDER BY (event_type, event_time);

-- Insert sample data
INSERT INTO events VALUES
    (generateUUIDv4(), now(), 'click', 12345, '{"page": "/home", "button": "signup"}'),
    (generateUUIDv4(), now() - INTERVAL 60 DAY, 'click', 12345, '{"page": "/pricing"}');

-- After TTL merge, old rows keep their structure but 'details' becomes empty string
```

When the TTL expires, the column value is replaced with its default value (empty string for String, 0 for numbers, etc.).

---

## Row-Level TTL for Deletion

Row-level TTL deletes entire rows when the condition is met. This is the most common use case for retention policies.

```sql
-- Create table with row-level TTL
-- Rows older than 90 days will be deleted
CREATE TABLE metrics
(
    metric_name String,
    timestamp DateTime,
    value Float64,
    tags Map(String, String)
)
ENGINE = MergeTree()
ORDER BY (metric_name, timestamp)
-- Delete entire rows after 90 days
TTL timestamp + INTERVAL 90 DAY;

-- You can also use expressions and multiple conditions
CREATE TABLE logs
(
    log_level String,
    timestamp DateTime,
    message String,
    service String
)
ENGINE = MergeTree()
ORDER BY (service, timestamp)
-- Different retention based on log level
TTL timestamp + INTERVAL 7 DAY WHERE log_level = 'DEBUG',
    timestamp + INTERVAL 30 DAY WHERE log_level = 'INFO',
    timestamp + INTERVAL 365 DAY WHERE log_level IN ('WARN', 'ERROR');
```

Multiple TTL rules are evaluated in order. The first matching rule is applied.

---

## TTL for Data Movement (Tiered Storage)

ClickHouse supports tiered storage where data moves from fast storage to slower, cheaper storage as it ages. This requires configuring storage policies first.

### Step 1: Configure Storage Policy

Edit your ClickHouse config (usually `/etc/clickhouse-server/config.d/storage.xml`):

```xml
<clickhouse>
    <storage_configuration>
        <disks>
            <!-- Fast NVMe storage for recent data -->
            <hot>
                <path>/var/lib/clickhouse/hot/</path>
            </hot>
            <!-- Slower HDD or network storage for older data -->
            <cold>
                <path>/var/lib/clickhouse/cold/</path>
            </cold>
            <!-- Object storage for archive -->
            <archive>
                <type>s3</type>
                <endpoint>https://s3.amazonaws.com/my-bucket/clickhouse/</endpoint>
                <access_key_id>YOUR_KEY</access_key_id>
                <secret_access_key>YOUR_SECRET</secret_access_key>
            </archive>
        </disks>
        <policies>
            <tiered>
                <volumes>
                    <hot>
                        <disk>hot</disk>
                    </hot>
                    <cold>
                        <disk>cold</disk>
                    </cold>
                    <archive>
                        <disk>archive</disk>
                    </archive>
                </volumes>
            </tiered>
        </policies>
    </storage_configuration>
</clickhouse>
```

### Step 2: Create Table with Movement TTL

```sql
-- Create table with tiered storage TTL
CREATE TABLE telemetry
(
    device_id String,
    timestamp DateTime,
    temperature Float32,
    humidity Float32,
    raw_payload String
)
ENGINE = MergeTree()
ORDER BY (device_id, timestamp)
-- Data lifecycle: hot -> cold -> archive -> delete
TTL timestamp + INTERVAL 7 DAY TO VOLUME 'cold',
    timestamp + INTERVAL 30 DAY TO VOLUME 'archive',
    timestamp + INTERVAL 365 DAY DELETE
SETTINGS storage_policy = 'tiered';

-- Check current data distribution across volumes
SELECT
    disk_name,
    partition,
    sum(rows) as rows,
    formatReadableSize(sum(bytes_on_disk)) as size
FROM system.parts
WHERE table = 'telemetry' AND active
GROUP BY disk_name, partition
ORDER BY partition;
```

---

## TTL for Data Aggregation (Rollup)

Before deleting detailed data, you can aggregate it into summary tables. This preserves historical trends while reducing storage.

### Step 1: Create Summary Table

```sql
-- Detailed metrics table with short retention
CREATE TABLE metrics_detailed
(
    metric_name String,
    timestamp DateTime,
    value Float64,
    host String,
    datacenter String
)
ENGINE = MergeTree()
ORDER BY (metric_name, host, timestamp)
TTL timestamp + INTERVAL 7 DAY;

-- Hourly rollup table with longer retention
CREATE TABLE metrics_hourly
(
    metric_name String,
    hour DateTime,
    avg_value Float64,
    min_value Float64,
    max_value Float64,
    count UInt64,
    datacenter String
)
ENGINE = SummingMergeTree()
ORDER BY (metric_name, datacenter, hour)
TTL hour + INTERVAL 365 DAY;
```

### Step 2: Create Materialized View for Automatic Rollup

```sql
-- Automatically aggregate data into hourly summaries
CREATE MATERIALIZED VIEW metrics_hourly_mv TO metrics_hourly AS
SELECT
    metric_name,
    toStartOfHour(timestamp) as hour,
    avg(value) as avg_value,
    min(value) as min_value,
    max(value) as max_value,
    count() as count,
    datacenter
FROM metrics_detailed
GROUP BY metric_name, hour, datacenter;

-- Insert detailed data - it flows to both tables automatically
INSERT INTO metrics_detailed VALUES
    ('cpu_usage', now(), 45.2, 'host-1', 'us-east'),
    ('cpu_usage', now(), 62.8, 'host-2', 'us-east'),
    ('cpu_usage', now(), 38.1, 'host-3', 'us-west');

-- Query recent detailed data
SELECT * FROM metrics_detailed WHERE timestamp > now() - INTERVAL 1 HOUR;

-- Query historical aggregated data
SELECT * FROM metrics_hourly WHERE hour > now() - INTERVAL 30 DAY;
```

### Alternative: Use TTL with GROUP BY (ClickHouse 22.1+)

```sql
-- Single table with automatic rollup on TTL expiration
CREATE TABLE metrics_with_rollup
(
    metric_name String,
    timestamp DateTime,
    value Float64,
    count UInt64 DEFAULT 1,
    host String,
    datacenter String
)
ENGINE = SummingMergeTree()
ORDER BY (metric_name, datacenter, toStartOfHour(timestamp))
-- After 7 days, aggregate into hourly buckets
TTL timestamp + INTERVAL 7 DAY
    GROUP BY metric_name, datacenter, toStartOfHour(timestamp)
    SET value = sum(value),
        count = sum(count),
        timestamp = toStartOfHour(any(timestamp));
```

---

## Configuring TTL Merge Behavior

TTL operations happen during merges. You can control this behavior with several settings.

```sql
-- Force immediate TTL processing (useful for testing)
OPTIMIZE TABLE metrics FINAL;

-- System settings for TTL merge behavior
-- In users.xml or via SET commands

-- How often to check for TTL merges (default: 14400 seconds = 4 hours)
SET merge_with_ttl_timeout = 3600;

-- Minimum age of part before TTL merge (default: 0)
SET min_age_to_force_merge_seconds = 86400;

-- Priority of TTL delete vs TTL move merges
-- Higher value = higher priority for TTL operations
SET merge_selector_algorithm_version = 2;

-- Per-table settings
ALTER TABLE metrics MODIFY SETTING
    merge_with_ttl_timeout = 3600,
    ttl_only_drop_parts = 1;  -- Drop entire parts instead of rewriting
```

### Understanding ttl_only_drop_parts

When `ttl_only_drop_parts = 1`, ClickHouse drops entire data parts where ALL rows have expired TTL. This is faster than rewriting parts but may delay deletion if parts contain mixed-age data.

```sql
-- Check part boundaries to understand TTL behavior
SELECT
    partition,
    name as part_name,
    min_time,
    max_time,
    rows,
    modification_time
FROM system.parts
WHERE table = 'metrics' AND active
ORDER BY min_time;
```

---

## Monitoring TTL Operations

Track TTL operations using system tables and queries.

```sql
-- Check TTL settings for a table
SELECT
    name,
    engine,
    partition_key,
    sorting_key,
    primary_key
FROM system.tables
WHERE name = 'metrics';

-- View detailed TTL expressions
SHOW CREATE TABLE metrics;

-- Monitor TTL merge activity
SELECT
    event_time,
    table,
    elapsed,
    progress,
    merge_type,
    rows_read,
    rows_written
FROM system.merges
WHERE merge_type LIKE '%TTL%';

-- Check parts that are candidates for TTL
SELECT
    partition,
    name,
    rows,
    delete_ttl_info_min,
    delete_ttl_info_max,
    move_ttl_info.expression,
    move_ttl_info.min,
    move_ttl_info.max
FROM system.parts
WHERE table = 'telemetry' AND active;

-- Track storage usage by volume over time
SELECT
    disk_name,
    sum(rows) as total_rows,
    formatReadableSize(sum(bytes_on_disk)) as total_size,
    count() as parts_count
FROM system.parts
WHERE active
GROUP BY disk_name;
```

---

## Modifying TTL on Existing Tables

You can add, modify, or remove TTL rules on existing tables.

```sql
-- Add TTL to existing table
ALTER TABLE metrics
MODIFY TTL timestamp + INTERVAL 90 DAY;

-- Add column-level TTL
ALTER TABLE events
MODIFY COLUMN details String TTL event_time + INTERVAL 30 DAY;

-- Change existing TTL
ALTER TABLE metrics
MODIFY TTL timestamp + INTERVAL 60 DAY;  -- Changed from 90 to 60 days

-- Add tiered storage TTL
ALTER TABLE telemetry
MODIFY TTL
    timestamp + INTERVAL 7 DAY TO VOLUME 'cold',
    timestamp + INTERVAL 30 DAY TO VOLUME 'archive',
    timestamp + INTERVAL 365 DAY DELETE;

-- Remove all TTL rules
ALTER TABLE metrics
REMOVE TTL;

-- Force TTL evaluation after modification
OPTIMIZE TABLE metrics FINAL;

-- Or trigger non-final optimization (less resource intensive)
OPTIMIZE TABLE metrics;
```

Note: After modifying TTL, the changes apply to new merges. Use `OPTIMIZE TABLE` to apply immediately.

---

## Best Practices for Retention Policies

### 1. Align TTL with Partition Key

```sql
-- Good: TTL column matches partition granularity
CREATE TABLE good_example
(
    timestamp DateTime,
    data String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)  -- Monthly partitions
ORDER BY timestamp
TTL timestamp + INTERVAL 90 DAY;  -- ~3 months retention

-- This allows dropping entire partitions, which is faster
```

### 2. Use ttl_only_drop_parts for Large Tables

```sql
-- For tables with billions of rows, dropping parts is much faster
ALTER TABLE large_table MODIFY SETTING ttl_only_drop_parts = 1;
```

### 3. Test TTL Rules Before Production

```sql
-- Create test table with same schema
CREATE TABLE metrics_test AS metrics;

-- Insert test data with varied timestamps
INSERT INTO metrics_test
SELECT * FROM metrics WHERE rand() % 1000 = 0;  -- Sample

-- Add TTL and verify behavior
ALTER TABLE metrics_test MODIFY TTL timestamp + INTERVAL 1 MINUTE;
OPTIMIZE TABLE metrics_test FINAL;

-- Check results
SELECT count(), min(timestamp), max(timestamp) FROM metrics_test;
```

### 4. Monitor Storage Before and After

```sql
-- Create a monitoring query to run periodically
SELECT
    database,
    table,
    sum(rows) as rows,
    formatReadableSize(sum(bytes_on_disk)) as disk_size,
    formatReadableSize(sum(data_compressed_bytes)) as compressed_size,
    min(min_time) as oldest_data,
    max(max_time) as newest_data
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC;
```

### 5. Combine with ReplicatedMergeTree for Production

```sql
-- TTL works identically with replicated tables
CREATE TABLE metrics_replicated ON CLUSTER '{cluster}'
(
    metric_name String,
    timestamp DateTime,
    value Float64
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/metrics', '{replica}')
ORDER BY (metric_name, timestamp)
TTL timestamp + INTERVAL 90 DAY;
```

### 6. Document Your Retention Policies

Keep a reference of all TTL rules in your infrastructure documentation:

| Table | Retention | Tier Strategy | Rollup |
|-------|-----------|---------------|--------|
| logs | 30 days | hot 7d -> cold 30d | None |
| metrics_detailed | 7 days | hot only | -> metrics_hourly |
| metrics_hourly | 365 days | hot 30d -> archive | None |
| telemetry | 365 days | hot 7d -> cold 30d -> archive 365d | None |

---

## Summary

ClickHouse TTL provides a powerful, declarative approach to data lifecycle management:

- **Column TTL**: Clear specific fields while keeping row structure
- **Row TTL**: Delete rows based on age or conditions
- **Movement TTL**: Automatically tier data across storage volumes
- **Aggregation TTL**: Roll up detailed data before deletion
- **Conditional TTL**: Apply different rules based on data characteristics

Key points to remember:

1. TTL operations happen during merges, not immediately
2. Use `OPTIMIZE TABLE` to force TTL evaluation
3. Align TTL with partition keys for efficient deletion
4. Monitor storage usage to validate retention policies
5. Test TTL rules in non-production environments first

With proper TTL configuration, you can maintain query performance on recent data while automatically managing storage costs and compliance requirements.

---

Need help monitoring your ClickHouse clusters and data pipelines? [OneUptime](https://oneuptime.com) provides comprehensive observability for your database infrastructure, including query performance tracking, storage monitoring, and alerting.
