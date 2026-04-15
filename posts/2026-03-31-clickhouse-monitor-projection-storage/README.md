# How to Monitor Projection Storage Overhead in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, Storage, Monitoring, MergeTree

Description: Learn how to monitor the disk usage and storage overhead of ClickHouse projections to manage costs and avoid unexpected disk growth.

---

## Why Monitor Projection Storage?

Every projection stores a copy of part (or aggregated data from) each MergeTree part on disk. Without monitoring, projections can silently consume significant storage - sometimes doubling or tripling table size. Understanding projection storage overhead is essential before adding projections in production.

## Checking Projection Storage per Table

```sql
SELECT
    database,
    table,
    name                                   AS projection_name,
    formatReadableSize(sum(bytes_on_disk)) AS size_on_disk,
    sum(rows)                              AS total_rows,
    count()                                AS part_count
FROM system.projection_parts
GROUP BY database, table, name
ORDER BY sum(bytes_on_disk) DESC;
```

## Comparing Projection Size to Base Table

```sql
SELECT
    p.table,
    formatReadableSize(t.total_bytes)      AS base_table_size,
    formatReadableSize(sum(p.bytes_on_disk)) AS projection_size,
    round(sum(p.bytes_on_disk) / t.total_bytes, 2) AS overhead_ratio
FROM system.projection_parts AS p
JOIN (
    SELECT table, sum(bytes_on_disk) AS total_bytes
    FROM system.parts
    WHERE active = 1
    GROUP BY table
) AS t ON p.table = t.table
WHERE p.database = currentDatabase()
GROUP BY p.table, t.total_bytes
ORDER BY overhead_ratio DESC;
```

## Listing All Projections and Their Part Counts

```sql
SELECT
    database,
    table,
    name,
    count() AS active_parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size
FROM system.projection_parts
WHERE active = 1
GROUP BY database, table, name
ORDER BY sum(bytes_on_disk) DESC;
```

## Monitoring Projection Materialization Progress

After running `MATERIALIZE PROJECTION`, track progress:

```sql
SELECT
    database,
    table,
    command,
    parts_to_do,
    is_done,
    latest_fail_reason
FROM system.mutations
WHERE command LIKE '%MATERIALIZE PROJECTION%'
  AND is_done = 0;
```

## Setting Up Alerts for Projection Storage Growth

Export projection storage metrics via the ClickHouse Prometheus endpoint or query periodically and push to your monitoring system:

```sql
SELECT
    table,
    name                              AS projection,
    sum(bytes_on_disk)               AS bytes
FROM system.projection_parts
WHERE database = 'production'
  AND active = 1
GROUP BY table, name;
```

Alert when `bytes` for any projection exceeds your defined threshold (e.g., 50% of the base table size).

## Identifying Underused Projections

Correlate projection storage cost with query usage from `system.query_log`:

```sql
SELECT
    pp.table,
    pp.name,
    formatReadableSize(sum(pp.bytes_on_disk)) AS projection_size,
    countIf(notEmpty(ql.projections)) AS queries_using_projection
FROM system.projection_parts AS pp
LEFT JOIN system.query_log AS ql
    ON has(ql.projections, pp.name)
    AND ql.event_date = today()
WHERE pp.database = currentDatabase()
  AND pp.active = 1
GROUP BY pp.table, pp.name
ORDER BY projection_size DESC;
```

Drop projections that consume significant storage but are rarely used.

## Summary

Monitor ClickHouse projection storage using `system.projection_parts` to track per-projection disk usage and compare it against base table size. Use the overhead ratio to identify projections that are too costly relative to their query acceleration benefit, and set up periodic alerts to catch unexpected storage growth before it impacts production capacity.
