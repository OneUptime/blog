# How to Fix 'Limit for rows exceeded' in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Optimization, Troubleshooting, Performance

Description: Learn why ClickHouse throws 'Limit for rows exceeded' errors and how to fix them by adjusting query limits or optimizing your queries.

---

## Understanding the Error

ClickHouse enforces row limits to protect servers from runaway queries. When a query exceeds the configured `max_rows_to_read` or `max_result_rows` threshold, you will see an error like:

```text
Code: 158. DB::Exception: Limit for rows to read exceeded: 1073741824 rows read. Maximum: 1000000000.
```

This is a safety mechanism - not a bug. ClickHouse is preventing a query from consuming excessive resources.

## Common Causes

- Scanning a large table without appropriate WHERE filters
- Missing or inefficient partition pruning
- Forgetting to add a LIMIT clause to exploratory queries
- Misconfigured `max_rows_to_read` setting at the user or query level

## Diagnosing the Problem

Check which setting is triggering the limit:

```sql
-- See current limits for your session
SELECT name, value
FROM system.settings
WHERE name IN (
    'max_rows_to_read',
    'max_result_rows',
    'max_bytes_to_read',
    'read_overflow_mode'
);
```

Check how many rows the table has:

```sql
SELECT
    table,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS size_on_disk
FROM system.parts
WHERE active = 1
  AND database = 'your_database'
  AND table = 'your_table'
GROUP BY table;
```

## Fix 1 - Add a LIMIT Clause

The simplest fix for exploratory queries is to add a `LIMIT`:

```sql
-- Before: potentially reads billions of rows
SELECT user_id, event_type, timestamp
FROM events
WHERE date >= '2024-01-01';

-- After: bounded read
SELECT user_id, event_type, timestamp
FROM events
WHERE date >= '2024-01-01'
LIMIT 1000;
```

## Fix 2 - Increase the Row Limit

If your query legitimately needs to read more rows, increase the limit for that query:

```sql
SELECT count(), user_id
FROM events
WHERE date >= '2024-01-01'
GROUP BY user_id
SETTINGS max_rows_to_read = 5000000000;
```

Or set it in `users.xml` / `users.d/` for a specific user profile:

```xml
<profiles>
  <analyst>
    <max_rows_to_read>5000000000</max_rows_to_read>
    <read_overflow_mode>break</read_overflow_mode>
  </analyst>
</profiles>
```

## Fix 3 - Change the Overflow Mode

Instead of throwing an error, instruct ClickHouse to return partial results:

```sql
SELECT count()
FROM events
WHERE date >= '2024-01-01'
SETTINGS
    max_rows_to_read = 1000000000,
    read_overflow_mode = 'break';
```

Valid values for `read_overflow_mode` are `throw` (default) and `break`. The `any` mode exists but is only meaningful for `group_by_overflow_mode`.

## Fix 4 - Improve Partition Pruning

Ensure your WHERE clause uses the partition key so ClickHouse skips irrelevant data parts:

```sql
-- Table partitioned by toYYYYMM(timestamp)
-- Both queries benefit from partition pruning because
-- toYYYYMM is a monotonic function, so ClickHouse can
-- translate a timestamp range into a partition range:
SELECT count()
FROM events
WHERE toYYYYMM(timestamp) = 202401;

SELECT count()
FROM events
WHERE timestamp >= '2024-01-01'
  AND timestamp <  '2024-02-01';

-- What does NOT prune partitions: a predicate on a column
-- that is not part of the partition key, or wrapping the
-- partition column in a non-monotonic function.
SELECT count()
FROM events
WHERE user_id = 42;
```

## Fix 5 - Use Sampling for Approximate Results

For aggregate analytics, sampling can dramatically reduce rows read:

```sql
SELECT
    countIf(event_type = 'click') * 100 AS estimated_clicks
FROM events SAMPLE 0.01
WHERE date >= '2024-01-01';
```

## Fix 6 - Profile-Level Configuration

For permanent changes, configure limits per user role:

```bash
# Edit /etc/clickhouse-server/users.d/limits.xml
cat > /etc/clickhouse-server/users.d/limits.xml << 'EOF'
<clickhouse>
  <profiles>
    <default>
      <max_rows_to_read>2000000000</max_rows_to_read>
      <read_overflow_mode>throw</read_overflow_mode>
    </default>
    <etl_user>
      <max_rows_to_read>0</max_rows_to_read>
    </etl_user>
  </profiles>
</clickhouse>
EOF
```

Setting `max_rows_to_read` to `0` disables the limit entirely for that profile.

## Verifying the Fix

After applying changes, test your query:

```sql
-- Check the query reads an acceptable number of rows
SELECT count()
FROM events
WHERE date >= '2024-01-01'
SETTINGS
    max_rows_to_read = 2000000000,
    log_queries = 1;

-- Then review the query log
SELECT
    query,
    read_rows,
    read_bytes,
    result_rows
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%events%'
ORDER BY event_time DESC
LIMIT 5;
```

## Summary

The "Limit for rows exceeded" error in ClickHouse is a safety guard against expensive full-table scans. Fix it by adding LIMIT clauses, improving WHERE filters with partition keys, adjusting `max_rows_to_read` at the query or profile level, or switching the overflow mode to `break` for partial results. Always prefer optimizing the query before raising limits.
