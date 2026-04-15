# How to Use Projections for Query Acceleration in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, MergeTree, Performance, Query, Optimization

Description: Learn how to use ClickHouse projections to maintain alternative sort orders and pre-aggregations within a single table for transparent query acceleration.

---

Projections in ClickHouse are pre-materialized representations of a table stored within the same MergeTree parts. A projection can re-sort the data by a different key or pre-aggregate rows. When a query matches a projection, ClickHouse transparently reads from the projection instead of the main table, without any query rewriting.

## What Projections Solve

A MergeTree table has one `ORDER BY` key. Queries that filter on different column combinations cannot fully benefit from the primary index. The traditional solution is to maintain multiple tables with different sort keys, but this duplicates data and complicates the write path.

Projections solve this by embedding alternative representations inside the same table and automatic selection at query time.

## Types of Projections

| Type | Description |
|------|-------------|
| Normal projection | Re-sorts a subset of columns by a different ORDER BY key |
| Aggregate projection | Pre-computes aggregate results (like a materialized view) |

## Creating a Normal Projection

A normal projection re-sorts the data for a different query access pattern:

```sql
CREATE TABLE http_logs
(
    domain   String,
    status   UInt16,
    method   String,
    url      String,
    bytes    UInt64,
    ts       DateTime,

    PROJECTION proj_by_status
    (
        SELECT domain, status, method, bytes, ts
        ORDER BY (status, ts)
    )
)
ENGINE = MergeTree()
ORDER BY (domain, ts);
```

The main table is sorted by `(domain, ts)`. The `proj_by_status` projection stores the same rows sorted by `(status, ts)`.

## Creating an Aggregate Projection

Aggregate projections pre-compute summaries:

```sql
CREATE TABLE http_logs_with_agg
(
    domain   String,
    status   UInt16,
    method   String,
    bytes    UInt64,
    ts       DateTime,

    PROJECTION proj_daily_bytes
    (
        SELECT
            domain,
            toDate(ts) AS date,
            sum(bytes)  AS total_bytes,
            count()     AS request_count
        GROUP BY domain, date
    )
)
ENGINE = MergeTree()
ORDER BY (domain, ts);
```

## Adding a Projection to an Existing Table

```sql
ALTER TABLE http_logs
    ADD PROJECTION proj_by_status
    (
        SELECT domain, status, method, bytes, ts
        ORDER BY (status, ts)
    );
```

After adding, materialize the projection on existing data:

```sql
ALTER TABLE http_logs
    MATERIALIZE PROJECTION proj_by_status;
```

Check materialization progress:

```sql
SELECT *
FROM system.mutations
WHERE table = 'http_logs'
  AND database = currentDatabase()
  AND is_done = 0;
```

## How ClickHouse Selects a Projection

ClickHouse's query analyzer automatically evaluates whether a projection can answer a query. It selects the projection that reads the fewest granules. No query rewriting is required.

```sql
-- Uses proj_by_status (status is first column)
SELECT count(), sum(bytes)
FROM http_logs
WHERE status = 500
  AND ts > now() - INTERVAL 1 DAY;

-- Uses main table (domain is first column)
SELECT count()
FROM http_logs
WHERE domain = 'example.com'
  AND ts > now() - INTERVAL 7 DAY;
```

## Verifying Projection Usage with EXPLAIN

```sql
EXPLAIN indexes = 1
SELECT count()
FROM http_logs
WHERE status = 500
  AND ts > now() - INTERVAL 1 DAY;
```

Output when projection is used:

```text
ReadFromMergeTree (http_logs)
  ReadFromMergeTree (proj_by_status)
    Indexes:
      PrimaryKey
        Keys: status, ts
        Granules: 15/2000
```

If the main table is shown without a projection reference, the projection was not selected.

## Aggregate Projection Query

```sql
-- This query uses the aggregate projection
SELECT
    domain,
    sum(bytes) AS total_bytes,
    count() AS request_count
FROM http_logs_with_agg
WHERE toDate(ts) = today()
GROUP BY domain
ORDER BY total_bytes DESC
LIMIT 20;
```

ClickHouse recognizes that this query matches the aggregate projection's structure and reads from the pre-computed summaries instead of scanning all rows.

## Forcing a Specific Projection

For testing or debugging, force ClickHouse to use a projection. If no applicable projection exists, the query will return an error:

```sql
SELECT count()
FROM http_logs
WHERE status = 500
SETTINGS optimize_use_projections = 1, force_optimize_projection = 1;
```

Disable projection selection to compare performance:

```sql
SELECT count()
FROM http_logs
WHERE status = 500
SETTINGS optimize_use_projections = 0;
```

## Dropping a Projection

```sql
ALTER TABLE http_logs
    DROP PROJECTION proj_by_status;
```

## Storage Overhead

Projections consume additional disk space because data is duplicated in the alternative sort order. Check projection sizes:

```sql
SELECT
    table,
    name AS projection,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed_size
FROM system.projection_parts
WHERE table = 'http_logs'
  AND database = currentDatabase()
GROUP BY table, name;
```

## When to Use Projections vs Skip Indexes

| Scenario | Use |
|----------|-----|
| Different sort order needed for queries | Normal projection |
| Pre-aggregated query results | Aggregate projection |
| Range or equality filter on non-key column | Skip index |
| Ad-hoc filtering on various columns | Skip index |
| Frequent GROUP BY on date + dimension | Aggregate projection |

## Projection Limitations

- Projections cannot use `LIMIT`, `OFFSET`, or subqueries
- Aggregate projections only work with queries that match the aggregation structure
- ClickHouse selects at most one projection per query
- Projections add write overhead (data written twice to disk)

## Summary

Projections are ClickHouse's most powerful tool for transparent query acceleration. Use normal projections to maintain alternative sort orders without separate tables. Use aggregate projections to pre-compute frequently queried summaries. ClickHouse selects them automatically at query time. Validate selection with `EXPLAIN indexes = 1` and monitor storage overhead with `system.projection_parts`.
