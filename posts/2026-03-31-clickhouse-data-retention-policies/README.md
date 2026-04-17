# How to Implement Data Retention Policies in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Performance, Storage, SQL

Description: Learn how to implement automated data retention policies in ClickHouse using TTL expressions, partition drops, and tiered storage to manage data lifecycle.

## Introduction

Data retention policies define how long data is kept before it is deleted or archived. In operational analytics systems, retaining data indefinitely is neither practical nor legally permissible. ClickHouse offers three complementary mechanisms for enforcing retention:

1. **TTL (Time to Live)** - automatic deletion or column erasure triggered by a time expression.
2. **Partition management** - instant bulk deletion by dropping a partition.
3. **Tiered storage** - automatic migration of cold data to cheaper storage tiers before eventual deletion.

This guide walks through each mechanism with production-ready examples.

## TTL Expressions for Automatic Row Deletion

TTL is the most hands-off approach. You define a retention window in the table DDL and ClickHouse deletes rows during background merges.

```sql
-- Create a table where rows older than 90 days are deleted automatically
CREATE TABLE application_logs
(
    log_id      UUID DEFAULT generateUUIDv4(),
    service     LowCardinality(String),
    level       LowCardinality(String),
    message     String,
    created_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, service)
TTL created_at + INTERVAL 90 DAY DELETE;
```

ClickHouse evaluates TTL during merge operations. Rows whose `created_at + 90 DAY` is in the past are removed when a part is merged.

### Force TTL Evaluation

By default, TTL is only evaluated during background merges, which may be infrequent on quiet tables. Trigger it manually when needed:

```sql
OPTIMIZE TABLE application_logs FINAL;
```

### Column-Level TTL

You can erase specific columns - replacing them with default values - after a shorter window, while keeping the row itself for a longer period.

```sql
CREATE TABLE user_sessions
(
    session_id    String,
    user_id       String,
    email         String    TTL created_at + INTERVAL 30 DAY,
    ip_address    String    TTL created_at + INTERVAL 30 DAY,
    user_agent    String    TTL created_at + INTERVAL 30 DAY,
    event_count   UInt32,
    created_at    DateTime
)
ENGINE = MergeTree()
ORDER BY (created_at, session_id)
TTL created_at + INTERVAL 1 YEAR DELETE;
```

After 30 days, PII columns are set to empty strings. The aggregated `event_count` remains for 1 year.

## Partition-Based Deletion

Dropping a partition removes all data in that partition instantaneously without scanning or rewriting parts. This is the fastest deletion method and ideal for monthly or daily retention windows.

```sql
-- Create a table partitioned by month
CREATE TABLE metrics
(
    metric_name  LowCardinality(String),
    value        Float64,
    tags         Map(String, String),
    recorded_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (recorded_at, metric_name);

-- See which partitions exist
SELECT
    partition,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    sum(rows)                              AS rows,
    min(min_time)                          AS oldest_row,
    max(max_time)                          AS newest_row
FROM system.parts
WHERE table = 'metrics'
  AND active = 1
GROUP BY partition
ORDER BY partition;

-- Drop data older than 6 months (partition 202309 = September 2023)
ALTER TABLE metrics DROP PARTITION 202309;
```

### Automating Partition Drops

ClickHouse does not have a built-in scheduler, but you can automate partition drops from a cron job or an orchestration tool.

```bash
#!/bin/bash
# drop_old_partitions.sh - run monthly via cron

RETENTION_MONTHS=6
CUTOFF=$(date -d "-${RETENTION_MONTHS} months" +%Y%m)

clickhouse-client --query "
SELECT DISTINCT partition
FROM system.parts
WHERE database = 'analytics'
  AND table = 'metrics'
  AND active = 1
  AND partition < '${CUTOFF}'
" | while read partition; do
    echo "Dropping partition ${partition}"
    clickhouse-client --query "ALTER TABLE analytics.metrics DROP PARTITION ${partition}"
done
```

Add to crontab:

```bash
# Run on the 1st of every month at 02:00
0 2 1 * * /usr/local/bin/drop_old_partitions.sh >> /var/log/clickhouse_retention.log 2>&1
```

## Tiered Storage with TTL MOVE

Rather than deleting data immediately, you can move it to a cheaper storage tier first. This is useful when you want 30-day hot storage on NVMe, 1-year warm storage on HDD, and 3-year cold storage on S3.

```xml
<!-- /etc/clickhouse-server/config.d/tiered_storage.xml -->
<clickhouse>
    <storage_configuration>
        <disks>
            <nvme>
                <type>local</type>
                <path>/mnt/nvme/clickhouse/</path>
            </nvme>
            <hdd>
                <type>local</type>
                <path>/mnt/hdd/clickhouse/</path>
            </hdd>
            <s3_cold>
                <type>s3</type>
                <endpoint>https://s3.amazonaws.com/my-cold-bucket/ch/</endpoint>
                <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
                <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
            </s3_cold>
        </disks>

        <policies>
            <tiered>
                <volumes>
                    <hot>
                        <disk>nvme</disk>
                        <max_data_part_size_bytes>1073741824</max_data_part_size_bytes>
                    </hot>
                    <warm>
                        <disk>hdd</disk>
                    </warm>
                    <cold>
                        <disk>s3_cold</disk>
                    </cold>
                </volumes>
            </tiered>
        </policies>
    </storage_configuration>
</clickhouse>
```

```sql
-- Table with tiered TTL
CREATE TABLE events
(
    event_id    UUID DEFAULT generateUUIDv4(),
    service     LowCardinality(String),
    payload     String,
    event_time  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, service)
TTL
    event_time + INTERVAL 30 DAY  TO VOLUME 'warm',
    event_time + INTERVAL 1 YEAR  TO VOLUME 'cold',
    event_time + INTERVAL 3 YEAR  DELETE
SETTINGS storage_policy = 'tiered';
```

## Modifying TTL on Existing Tables

You can add, change, or remove TTL on a table without recreating it.

```sql
-- Add TTL to an existing table
ALTER TABLE application_logs
    MODIFY TTL created_at + INTERVAL 180 DAY DELETE;

-- Change TTL window from 180 to 365 days
ALTER TABLE application_logs
    MODIFY TTL created_at + INTERVAL 365 DAY DELETE;

-- Remove TTL entirely
ALTER TABLE application_logs REMOVE TTL;
```

## Monitoring Retention Activity

Use `system.parts` and `system.merges` to observe what ClickHouse is doing.

```sql
-- Check current data age distribution
SELECT
    toYYYYMM(min_time)  AS month,
    count()             AS part_count,
    sum(rows)           AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size
FROM system.parts
WHERE table = 'events'
  AND active = 1
GROUP BY month
ORDER BY month;

-- Check if any parts have a delete TTL that has already expired
SELECT
    table,
    count()  AS parts_with_expired_ttl
FROM system.parts
WHERE active = 1
  AND delete_ttl_info_max != toDateTime(0)
  AND delete_ttl_info_max < now()
GROUP BY table;

-- Watch active merges (including TTL-triggered merges)
SELECT
    table,
    elapsed,
    progress,
    result_part_name
FROM system.merges
WHERE table = 'events';
```

## Retention Policy Summary Table

| Use Case | Mechanism | Speed | Granularity |
|---|---|---|---|
| Row-level time-based deletion | TTL DELETE | Asynchronous | Per row |
| Column erasure after shorter window | Column TTL | Asynchronous | Per column |
| Bulk monthly deletion | DROP PARTITION | Instant | Per partition |
| Move to cheaper storage | TTL MOVE | Asynchronous | Per part |
| Three-tier hot/warm/cold | Storage policy + TTL MOVE | Asynchronous | Per part |

## Summary

ClickHouse gives you precise, configurable control over data lifecycle through TTL expressions, partition management, and tiered storage. For compliance-driven retention, TTL with `DELETE` handles automatic row removal. For bulk operational efficiency, partition drops provide instant large-scale deletion. For cost optimization, tiered storage moves data through hot, warm, and cold tiers before eventual deletion - all without application changes.
