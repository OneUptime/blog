# How to Set Up ClickHouse Alerts for Part Count Growth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Alert, Part Count, MergeTree, Monitoring

Description: Set up part count growth alerts in ClickHouse to prevent 'too many parts' errors that throttle inserts and degrade query performance in MergeTree tables.

---

ClickHouse's MergeTree family stores data in immutable "parts" that background merges gradually consolidate. When inserts arrive faster than merges can keep up, part count grows until ClickHouse throttles inserts with the "too many parts" error. Alerting on part count growth catches this condition early.

## Understanding Part Count Thresholds

ClickHouse applies progressive throttling as part count grows:

- Below `parts_to_delay_insert` (default 1000): inserts proceed normally
- At `parts_to_delay_insert`: ClickHouse adds artificial delay to inserts
- At `parts_to_throw_insert` (default 3000): inserts throw an exception

These thresholds are per partition per table. A table with 100 partitions can have up to 3000 parts per partition before throwing.

## Querying Current Part Counts

```sql
SELECT
    database,
    table,
    partition,
    count() AS part_count,
    sum(rows) AS rows,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active = 1
GROUP BY database, table, partition
HAVING part_count > 50
ORDER BY part_count DESC
LIMIT 30;
```

## Table-Level Part Summary

```sql
SELECT
    database,
    table,
    count() AS total_active_parts,
    count(DISTINCT partition) AS partition_count,
    max(part_count_per_partition) AS max_parts_per_partition
FROM (
    SELECT
        database,
        table,
        partition,
        count() AS part_count_per_partition
    FROM system.parts
    WHERE active = 1
    GROUP BY database, table, partition
)
GROUP BY database, table
ORDER BY max_parts_per_partition DESC;
```

## Setting Up a Part Count Alert

Create a monitoring table and populate it regularly:

```sql
CREATE TABLE part_count_alerts (
    check_time DateTime DEFAULT now(),
    database String,
    table String,
    max_parts_per_partition UInt32,
    total_parts UInt32,
    severity LowCardinality(String)
) ENGINE = MergeTree
ORDER BY (check_time, database, table)
TTL check_time + INTERVAL 7 DAY;
```

```bash
clickhouse-client --query "
INSERT INTO part_count_alerts (database, table, max_parts_per_partition, total_parts, severity)
SELECT
    database,
    table,
    max(part_count) AS max_parts_per_partition,
    sum(part_count) AS total_parts,
    multiIf(
        max(part_count) > 200, 'critical',
        max(part_count) > 100, 'warning',
        'ok'
    ) AS severity
FROM (
    SELECT database, table, partition, count() AS part_count
    FROM system.parts WHERE active = 1
    GROUP BY database, table, partition
)
GROUP BY database, table
HAVING severity != 'ok'
"
```

## Prometheus Alert Rules

```yaml
groups:
  - name: clickhouse_parts
    rules:
      - alert: ClickHousePartCountWarning
        expr: ClickHousePartsActive > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High part count {{ $value }} on {{ $labels.table }}"

      - alert: ClickHousePartCountCritical
        expr: ClickHousePartsActive > 2500
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical part count {{ $value }} - insert throttling risk"
```

## Responding to Part Count Alerts

When part count is growing toward limits:

```sql
-- Manually trigger a merge to reduce part count
OPTIMIZE TABLE mydb.events PARTITION '2026-03-01';

-- Check current merge activity
SELECT database, table, progress, elapsed FROM system.merges ORDER BY elapsed DESC;

-- Check the current background pool size (server-level setting, configured in config.xml)
SELECT value FROM system.server_settings WHERE name = 'background_pool_size';
```

Consider increasing `max_bytes_to_merge_at_max_space_in_pool` to allow merging of larger parts and reduce part count faster.

## Preventing Part Count Growth

The root cause is usually too-frequent small inserts. Instead of one INSERT per row, batch inserts:

```sql
-- Bad: creates one part per insert
INSERT INTO events VALUES (now(), 'user1', 'click');

-- Good: batch many rows in one insert
INSERT INTO events SELECT * FROM incoming_events_staging;
```

Aim for batches of at least 10,000 rows to create parts large enough to merge efficiently.

## Summary

Part count alerts prevent "too many parts" errors from throttling your insert pipeline. Alert at 100 parts per partition for warning and 200 for critical, respond with manual OPTIMIZE commands, and address the root cause by increasing insert batch sizes to reduce part creation frequency.
