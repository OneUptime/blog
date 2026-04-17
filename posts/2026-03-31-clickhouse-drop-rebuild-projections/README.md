# How to Drop and Rebuild Projections in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, MergeTree, Maintenance, DDL

Description: Learn how to safely drop and rebuild projections in ClickHouse when you need to modify projection definitions or recover from a failed materialization.

---

## When to Drop and Rebuild

You need to drop and rebuild a projection when:
- You want to change the projection's sort order or column list
- The projection definition needs to reference a new column added to the table
- A materialization mutation failed or produced corrupt parts
- Storage cleanup is needed and the projection is no longer useful

## Dropping a Projection

```sql
ALTER TABLE http_logs DROP PROJECTION hourly_status_summary;
```

This removes the projection definition and deletes all projection data from existing parts asynchronously via a background mutation.

Monitor the drop progress:

```sql
SELECT
    command,
    parts_to_do,
    is_done,
    latest_fail_reason
FROM system.mutations
WHERE table = 'http_logs'
  AND command LIKE '%DROP PROJECTION%'
ORDER BY create_time DESC
LIMIT 5;
```

## Verifying the Projection Is Gone

```sql
SELECT name FROM system.projections
WHERE database = currentDatabase()
  AND table = 'http_logs';
```

The projection name should no longer appear.

## Rebuilding the Projection

After the drop completes, add the updated projection definition:

```sql
ALTER TABLE http_logs
    ADD PROJECTION hourly_status_summary (
        SELECT
            service,
            status_code,
            toStartOfHour(timestamp) AS hour,
            count()                   AS request_count,
            avg(response_time_ms)     AS avg_latency
        GROUP BY service, status_code, hour
    );
```

Trigger materialization to backfill all existing parts:

```sql
ALTER TABLE http_logs MATERIALIZE PROJECTION hourly_status_summary;
```

## Monitoring Materialization Progress

```sql
SELECT
    command,
    parts_to_do,
    is_done,
    create_time
FROM system.mutations
WHERE table = 'http_logs'
  AND command LIKE '%MATERIALIZE PROJECTION%'
ORDER BY create_time DESC
LIMIT 1;
```

## Handling Failed Materializations

If a mutation fails, check the reason:

```sql
SELECT latest_fail_reason
FROM system.mutations
WHERE table = 'http_logs'
  AND command LIKE '%MATERIALIZE PROJECTION%'
  AND is_done = 0;
```

Common causes include memory limits and disk space. Adjust settings if needed:

```sql
ALTER TABLE http_logs
    MATERIALIZE PROJECTION hourly_status_summary
    SETTINGS max_memory_usage = 4294967296;
```

## Dropping All Projections on a Table

If you need a full cleanup:

```sql
SELECT
    concat('ALTER TABLE http_logs DROP PROJECTION ', name, ';') AS drop_cmd
FROM system.projections
WHERE database = currentDatabase()
  AND table = 'http_logs';
```

Copy and execute the generated commands.

## Summary

Dropping and rebuilding projections in ClickHouse is a straightforward DDL operation, but it involves background mutations that can take significant time on large tables. Always monitor mutation progress via `system.mutations` and confirm completion before relying on the rebuilt projection in production queries.
