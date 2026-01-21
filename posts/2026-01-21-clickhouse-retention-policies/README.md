# How to Set Up Automatic Data Retention Policies in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Retention, TTL, Automatic Cleanup, Data Lifecycle

Description: A comprehensive guide to setting up automatic data retention policies in ClickHouse using TTL expressions and partition management for efficient data lifecycle management.

---

Automatic data retention policies ensure old data is cleaned up without manual intervention, maintaining storage efficiency and compliance requirements.

## TTL-Based Retention

### Basic TTL for Deletion

```sql
-- Create table with retention policy
CREATE TABLE logs (
    timestamp DateTime,
    level String,
    message String
) ENGINE = MergeTree()
ORDER BY timestamp
TTL timestamp + INTERVAL 90 DAY;  -- Delete after 90 days

-- Add TTL to existing table
ALTER TABLE events
MODIFY TTL timestamp + INTERVAL 30 DAY;
```

### Column-Level TTL

```sql
-- Delete specific columns earlier
CREATE TABLE user_events (
    timestamp DateTime,
    user_id UInt64,
    event_type String,
    ip_address String TTL timestamp + INTERVAL 7 DAY,  -- Remove PII sooner
    user_agent String TTL timestamp + INTERVAL 7 DAY,
    event_data String
) ENGINE = MergeTree()
ORDER BY (user_id, timestamp)
TTL timestamp + INTERVAL 365 DAY;  -- Delete full row after 1 year
```

### Conditional TTL

```sql
-- Different retention for different data
CREATE TABLE events (
    timestamp DateTime,
    event_type String,
    priority UInt8,
    data String
) ENGINE = MergeTree()
ORDER BY timestamp
TTL
    timestamp + INTERVAL 7 DAY WHERE priority = 0,   -- Debug logs: 7 days
    timestamp + INTERVAL 30 DAY WHERE priority = 1,  -- Info: 30 days
    timestamp + INTERVAL 90 DAY WHERE priority = 2,  -- Warning: 90 days
    timestamp + INTERVAL 365 DAY;                    -- Default: 1 year
```

## Partition-Based Retention

### Automated Partition Drops

```sql
-- Create procedure for partition cleanup
-- Run via external scheduler (cron, Airflow)

-- Drop partitions older than retention period
ALTER TABLE events DROP PARTITION
WHERE toYYYYMM(partition_value) < toYYYYMM(now() - INTERVAL 90 DAY);

-- Script for automated cleanup
-- cleanup.sql
SELECT
    partition,
    concat('ALTER TABLE events DROP PARTITION ''', partition, ''';') AS drop_command
FROM system.parts
WHERE table = 'events'
  AND partition < toString(toYYYYMM(now() - INTERVAL 90 DAY))
GROUP BY partition;
```

## Monitoring Retention

```sql
-- Check TTL status
SELECT
    table,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    min(min_date) AS oldest_data,
    max(max_date) AS newest_data
FROM system.parts
WHERE active
GROUP BY table;

-- Pending TTL cleanup
SELECT
    database,
    table,
    result_part_name,
    result_part_path
FROM system.part_log
WHERE event_type = 'MergeParts'
  AND event_time >= now() - INTERVAL 1 HOUR;
```

## Retention Policy Documentation

```sql
-- Create metadata table for retention policies
CREATE TABLE retention_policies (
    table_name String,
    column_name Nullable(String),
    retention_days UInt32,
    policy_type Enum8('delete'=1, 'move'=2, 'archive'=3),
    description String,
    updated_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY table_name;

INSERT INTO retention_policies VALUES
    ('events', NULL, 365, 'delete', 'Full row deletion after 1 year', now()),
    ('events', 'ip_address', 7, 'delete', 'PII removal after 7 days', now()),
    ('logs', NULL, 90, 'move', 'Move to cold storage after 90 days', now());
```

## Conclusion

Automatic retention policies in ClickHouse provide:

1. **TTL expressions** for time-based deletion
2. **Column-level TTL** for selective data removal
3. **Conditional TTL** for priority-based retention
4. **Partition management** for large-scale cleanup
5. **Policy documentation** for compliance

Configure retention policies based on your compliance requirements and storage constraints.
