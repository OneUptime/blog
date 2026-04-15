# How to Use optimize_read_in_order in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Performance, Query Optimization, MergeTree

Description: Learn how optimize_read_in_order eliminates sort operations in ClickHouse queries by exploiting MergeTree's physical sort order, reducing memory usage and speeding up ORDER BY queries.

---

ClickHouse MergeTree tables store data in sorted order defined by the `ORDER BY` clause of the table. When a query includes an `ORDER BY` that matches the table's sort key, ClickHouse can read data in the already-sorted physical order instead of reading all data and then sorting it. The `optimize_read_in_order` setting enables this optimization.

## Why This Optimization Matters

Without `optimize_read_in_order`, a query like:

```sql
SELECT user_id, event_time, event_type
FROM events
WHERE event_date = today()
ORDER BY user_id, event_time
LIMIT 100;
```

Would:
1. Read all matching granules for `event_date = today()`.
2. Load them all into memory.
3. Sort the entire result set by `(user_id, event_time)`.
4. Return the top 100 rows.

With `optimize_read_in_order` enabled and the table having `ORDER BY (user_id, event_time)`, ClickHouse:
1. Reads granules in sorted order.
2. Stops as soon as it has 100 rows (because data is already in order).
3. Returns immediately - no sort step needed.

For queries with small `LIMIT` values against large tables, this can reduce execution time from seconds to milliseconds.

## Enabling the Optimization

`optimize_read_in_order` is enabled by default (value = 1). Verify its state:

```sql
SELECT name, value, description
FROM system.settings
WHERE name = 'optimize_read_in_order';
```

To explicitly enable or disable per query:

```sql
-- Explicitly enabled (the default)
SELECT user_id, event_time, event_type
FROM events
ORDER BY user_id, event_time
LIMIT 100
SETTINGS optimize_read_in_order = 1;

-- Disable to force a full sort (useful for benchmarking)
SELECT user_id, event_time, event_type
FROM events
ORDER BY user_id, event_time
LIMIT 100
SETTINGS optimize_read_in_order = 0;
```

## Table Setup That Benefits Most

The optimization applies when the `ORDER BY` in the query is a prefix of the table's sort key.

```sql
-- Table sort key: (user_id, event_time, event_type)
CREATE TABLE events
(
    event_date  Date,
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    payload     String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (user_id, event_time, event_type);

-- This query benefits: ORDER BY matches the prefix of the sort key
SELECT user_id, event_time
FROM events
WHERE event_date = today()
ORDER BY user_id, event_time
LIMIT 50;

-- This also benefits: ordering by just the first key column
SELECT user_id, count() AS events
FROM events
WHERE event_date BETWEEN today() - 7 AND today()
GROUP BY user_id
ORDER BY user_id
LIMIT 100;

-- This does NOT benefit: ordering by a non-prefix column
SELECT user_id, event_time
FROM events
ORDER BY event_type, user_id  -- event_type is not first in the sort key
LIMIT 50;
```

## Verifying the Optimization Is Active

Use `EXPLAIN` to confirm ClickHouse is using read-in-order:

```sql
EXPLAIN PIPELINE
SELECT user_id, event_time, event_type
FROM events
WHERE event_date = today()
ORDER BY user_id, event_time
LIMIT 100
SETTINGS optimize_read_in_order = 1;
```

Look for `MergeTreeInOrder` in the pipeline output. With `optimize_read_in_order` active you will see `MergeTreeInOrder` (instead of `MergeTreeThread`) feeding into `MergingSortedTransform`, with no `PartialSortingTransform` or `MergeSortingTransform` steps. When the optimization is not active, the pipeline shows `MergeTreeThread` followed by `PartialSortingTransform` and `MergeSortingTransform` to perform the full sort.

```sql
-- Alternative: check with EXPLAIN PLAN
EXPLAIN PLAN
SELECT user_id, event_time
FROM events
ORDER BY user_id, event_time
LIMIT 100;
```

In the `EXPLAIN PLAN` output, look for `ReadType: InOrder` which confirms that ClickHouse is reading data in the table's sort order.

## Interaction with LIMIT

The benefit of `optimize_read_in_order` is most pronounced with a `LIMIT` clause. Without a limit, ClickHouse must read all matching rows regardless, and the optimization only saves the sort step:

```sql
-- Big win: stops reading after first 1000 rows in sorted order
SELECT user_id, event_time
FROM events
WHERE event_date = today()
ORDER BY user_id, event_time
LIMIT 1000;

-- Smaller win: must still read all rows, but saves the sort step
SELECT user_id, event_time
FROM events
WHERE event_date = today()
ORDER BY user_id, event_time;
```

## Interaction with Aggregation

`optimize_read_in_order` also applies to queries that use `GROUP BY` when the grouping key is a prefix of the sort key, via the `optimize_aggregation_in_order` companion setting:

```sql
-- Sum events per user_id, reading in user_id order without a sort step
SELECT
    user_id,
    count() AS total_events,
    max(event_time) AS last_event_time
FROM events
WHERE event_date >= today() - 30
GROUP BY user_id
ORDER BY user_id
SETTINGS
    optimize_read_in_order = 1,
    optimize_aggregation_in_order = 1;
```

With `optimize_aggregation_in_order`, ClickHouse accumulates aggregates group by group as it streams data in sorted order, avoiding the need to hold the entire group-by hash table in memory.

## optimize_read_in_order with ReplicatedMergeTree

The optimization works identically with ReplicatedMergeTree, SummingMergeTree, AggregatingMergeTree, and other MergeTree variants, as long as the query `ORDER BY` matches the table's sort key prefix.

## Measuring the Impact

```sql
-- Compare query time with and without the optimization
-- Run with optimization
SELECT user_id, event_time
FROM events
WHERE event_date = today()
ORDER BY user_id, event_time
LIMIT 10000
SETTINGS optimize_read_in_order = 1, log_comment = 'with_optimization';

-- Run without optimization
SELECT user_id, event_time
FROM events
WHERE event_date = today()
ORDER BY user_id, event_time
LIMIT 10000
SETTINGS optimize_read_in_order = 0, log_comment = 'without_optimization';

-- Compare in query log
SELECT
    log_comment,
    query_duration_ms,
    read_rows,
    formatReadableSize(memory_usage) AS mem
FROM system.query_log
WHERE log_comment IN ('with_optimization', 'without_optimization')
  AND type = 'QueryFinish'
ORDER BY event_time DESC;
```

## When the Optimization Does Not Apply

- The `ORDER BY` in the query is not a prefix of the table's sort key.
- The query reads from a Distributed table (optimization applies on each shard but the coordinator still merges streams).
- The table was created without an `ORDER BY` (no sort key).
- The `LIMIT` is very large or absent and the data is spread across many disjoint parts.

## Conclusion

`optimize_read_in_order` is one of the most impactful free optimizations in ClickHouse, and it is enabled by default. To benefit from it, design your table `ORDER BY` key to match the most common query ordering patterns, and always include `LIMIT` in queries that only need top-N results. Use `EXPLAIN PIPELINE` to confirm the optimization is active and compare query times in `system.query_log` to quantify the improvement.
