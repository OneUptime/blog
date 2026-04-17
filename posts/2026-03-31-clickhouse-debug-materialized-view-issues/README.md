# How to Debug Materialized View Issues in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Debugging, Troubleshooting

Description: Learn how to debug ClickHouse materialized view issues including data staleness, broken triggers, and errors in view queries.

---

## Common Materialized View Problems

- Data not appearing in the target table after inserts
- Materialized view throwing errors silently
- Incorrect aggregations or missing rows
- View causing slowdowns on the source table inserts
- View not updating after schema changes

## How Materialized Views Work

ClickHouse materialized views are insert triggers. When data is inserted into the source table, ClickHouse runs the view's SELECT query against the inserted block and writes the result to the target table. This happens synchronously during the insert.

## Step 1: Check if the View Exists and Is Valid

```sql
SELECT
    database,
    name,
    engine,
    create_table_query
FROM system.tables
WHERE engine = 'MaterializedView'
  AND database = 'default';
```

## Step 2: Check for View Errors in the Log

```bash
grep -i "materialized\|VIEW\|mv_" /var/log/clickhouse-server/clickhouse-server.err.log | tail -30
```

Materialized view errors often appear here with a message like:

```text
MaterializedView(default.mv_hourly_stats): Code: 60. Table default.hourly_stats does not exist.
```

## Step 3: Verify the Target Table Exists

```sql
SHOW TABLES LIKE '%hourly%';
SELECT count() FROM hourly_stats;
```

If the target table was dropped, the view silently stops writing.

## Step 4: Test the View Query Manually

Run the SELECT portion of the view on recent data:

```sql
-- If your view is: SELECT event_type, count() FROM events GROUP BY event_type
-- Test it manually:
SELECT event_type, count()
FROM events
WHERE toDate(created_at) = today()
GROUP BY event_type;
```

If this query fails or returns unexpected results, the view has the same problem.

## Step 5: Check allow_materialized_view_with_bad_select

ClickHouse allows creating a materialized view whose SELECT references a missing table or column by default, via the `allow_materialized_view_with_bad_select` setting. This means a view can be created successfully but fail silently at insert time. Disable it to catch errors at creation:

```sql
SET allow_materialized_view_with_bad_select = 0;
```

Then perform a test insert and watch for errors in the server log:

```sql
INSERT INTO events VALUES (now(), 'login', 'user-1');
```

## Step 6: Inspect the View Definition

```sql
SHOW CREATE TABLE mv_hourly_stats;
```

Verify the `TO` clause points to the correct target table and the SELECT matches the target schema.

## Step 7: Check if View Is Detached

```sql
SELECT * FROM system.detached_tables WHERE table = 'mv_hourly_stats';
```

If the view was manually detached (e.g., with `DETACH TABLE`), it will stop receiving inserts until reattached with `ATTACH TABLE`. Insert-time errors from an attached view do not cause automatic detachment; whether they block the source insert is controlled by the `materialized_views_ignore_errors` setting.

## Step 8: Re-populate After a Fix

If you fixed the view but historical data is missing:

```sql
INSERT INTO target_table
SELECT <view_query>
FROM source_table
WHERE toDate(created_at) BETWEEN '2026-01-01' AND today();
```

## Handling Schema Changes

After adding a column to the source table, update the view:

```sql
DROP TABLE mv_hourly_stats;

CREATE MATERIALIZED VIEW mv_hourly_stats TO hourly_stats AS
SELECT
    toStartOfHour(created_at) AS hour,
    event_type,
    new_column,  -- add new column
    count() AS event_count
FROM events
GROUP BY hour, event_type, new_column;
```

## Summary

Debug ClickHouse materialized view issues by checking `system.tables` for the view definition, searching error logs for view errors, and testing the SELECT query manually. Common causes are missing target tables, schema mismatches, and errors in the view's SELECT query that silently drop writes. After fixing the view, manually backfill missing historical data.
