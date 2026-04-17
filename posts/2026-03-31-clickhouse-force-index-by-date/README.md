# How to Use force_index_by_date in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Performance, MergeTree, Query Optimization

Description: Learn how to use force_index_by_date in ClickHouse to enforce partition pruning on date-partitioned MergeTree tables and prevent expensive full-table scans.

---

ClickHouse MergeTree tables partitioned by date can skip entire partitions during a query if the WHERE clause includes a filter on the partition key. This is called partition pruning. The `force_index_by_date` setting makes this pruning mandatory: if a query does not include a filter that allows partition pruning, ClickHouse raises an error instead of performing a full scan across all partitions.

## What Partition Pruning Is

When a MergeTree table is partitioned by a date expression like `toYYYYMM(event_date)`, ClickHouse stores each month's data in a separate directory. A query like:

```sql
SELECT count() FROM events WHERE event_date >= '2024-01-01' AND event_date < '2024-02-01';
```

Only reads the `202401` partition. The remaining partitions are skipped without any I/O. This is partition pruning.

Without a date filter, ClickHouse scans all partitions:

```sql
-- This reads ALL partitions if force_index_by_date is not set
SELECT count() FROM events WHERE user_id = 12345;
```

## What force_index_by_date Does

When `force_index_by_date = 1`, ClickHouse requires the query to include a filter on the table's date column (or partition key) that allows at least some partitions to be pruned. If no such filter is present, the query is rejected with an error before any data is read.

This prevents accidental full-table scans on very large time-series tables.

## Enabling force_index_by_date

```sql
-- This query succeeds: event_date filter allows partition pruning
SELECT
    user_id,
    count() AS events
FROM events
WHERE event_date >= today() - 7
GROUP BY user_id
SETTINGS force_index_by_date = 1;

-- This query fails: no date filter, full scan would be required
SELECT user_id, count()
FROM events
WHERE user_id = 12345
SETTINGS force_index_by_date = 1;
-- Error: Index `event_date` is not used and setting 'force_index_by_date' is set.
```

## Setting force_index_by_date in User Profiles

For tables that are always queried with date filters, configure this as the default for the relevant users:

```xml
<clickhouse>
    <profiles>
        <dashboard>
            <force_index_by_date>1</force_index_by_date>
            <readonly>1</readonly>
        </dashboard>
        <analyst>
            <!-- Allow analysts to override on a per-query basis if needed -->
            <force_index_by_date>0</force_index_by_date>
        </analyst>
    </profiles>
</clickhouse>
```

## Correct Table Design for force_index_by_date

The setting works best when the table's partition key is a date-based column that also appears in the primary sort key:

```sql
CREATE TABLE events
(
    event_date  Date,
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    payload     String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_date)   -- Partition by month
ORDER BY (event_date, user_id, event_time);
```

With this schema, any filter on `event_date` both prunes partitions AND narrows the primary index search within the remaining partitions.

## What Counts as a Valid Date Filter

`force_index_by_date` checks whether the query's WHERE clause includes a condition that can be used to exclude at least one partition. The following conditions all satisfy it:

```sql
-- Direct date comparison
WHERE event_date = today()

-- Date range
WHERE event_date >= '2024-01-01' AND event_date < '2024-02-01'

-- Relative range
WHERE event_date >= today() - 30

-- Date IN list
WHERE event_date IN ('2024-01-15', '2024-01-16', '2024-01-17')

-- toYYYYMM filter when partition key is toYYYYMM(event_date)
WHERE toYYYYMM(event_date) = 202401
```

The following do NOT satisfy `force_index_by_date`:

```sql
-- No date filter at all
WHERE user_id = 12345

-- Filter on a non-partition column only
WHERE event_type = 'click'

-- A date filter that cannot be evaluated at partition pruning time
WHERE event_date = (SELECT max(event_date) FROM some_other_table)
```

## Combining with force_primary_key

A companion setting `force_primary_key` enforces that the query also uses the primary index (not just the partition key):

```sql
-- Require both partition pruning AND primary index usage
SELECT *
FROM events
WHERE event_date = today()
  AND user_id = 12345
SETTINGS
    force_index_by_date = 1,
    force_primary_key = 1;
```

Combining both settings provides strong guarantees that no query on this table will scan unbounded amounts of data.

## Diagnosing Why a Query Is Rejected

```sql
-- EXPLAIN with indexes = 1 shows partition pruning decisions
EXPLAIN indexes = 1
SELECT count()
FROM events
WHERE event_date >= today() - 7
SETTINGS force_index_by_date = 1;
```

Look for `Parts: X/Y` and `Granules: A/B` in the EXPLAIN output. If all parts are selected, the date filter is not being used for pruning and `force_index_by_date` would reject the query.

```sql
-- Check actual partition pruning in the query log
SELECT
    query_id,
    read_rows,
    ProfileEvents['SelectedParts'] AS parts_read,
    ProfileEvents['SelectedRanges'] AS ranges_read,
    left(query, 100) AS query_snippet
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY parts_read DESC
LIMIT 10;
```

## Using force_index_by_date in Materialized Views

Materialized views that read from large source tables benefit from this setting during backfills:

```sql
-- Backfill materialized view one month at a time with enforced date filter
INSERT INTO mv_events_summary
SELECT
    toYYYYMM(event_date) AS month,
    event_type,
    count() AS cnt
FROM events
WHERE event_date >= '2024-01-01' AND event_date < '2024-02-01'
GROUP BY month, event_type
SETTINGS force_index_by_date = 1;
```

## Practical Usage Pattern

A common pattern is to enable `force_index_by_date` in the dashboard profile to protect against accidental full scans from BI tool auto-generated queries:

```xml
<clickhouse>
    <profiles>
        <grafana>
            <force_index_by_date>1</force_index_by_date>
            <max_execution_time>30</max_execution_time>
            <max_memory_usage>4294967296</max_memory_usage>
            <readonly>1</readonly>
        </grafana>
    </profiles>
</clickhouse>
```

When a BI tool generates a query without a date filter (perhaps due to a missing dashboard variable), the query fails fast with a clear error rather than silently scanning petabytes of data.

## Conclusion

`force_index_by_date` is a safety mechanism that prevents full-table scans on date-partitioned MergeTree tables by requiring every query to include a date filter that enables partition pruning. Enable it in user profiles for dashboard users and BI tools where accidental full scans are a risk, pair it with `force_primary_key` for stricter index usage enforcement, and use `EXPLAIN PLAN` to verify that your date filters are actually pruning partitions before enabling the setting in production.
