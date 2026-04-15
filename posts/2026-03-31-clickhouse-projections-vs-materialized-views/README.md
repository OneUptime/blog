# How to Compare Projections vs Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, Materialized View, Query Optimization, Architecture

Description: Learn the key differences between projections and materialized views in ClickHouse to choose the right approach for your query acceleration needs.

---

## Two Approaches to Pre-Computation

ClickHouse provides two primary mechanisms for pre-computing query results: projections and materialized views. Both improve query performance, but they have different semantics, limitations, and maintenance characteristics.

## Key Differences at a Glance

| Feature | Projection | Materialized View |
|---|---|---|
| Storage location | Inside base table parts | Separate table |
| Update mechanism | Atomic with every INSERT | Triggered synchronously by INSERT |
| Consistency | Always consistent with base | Consistent for new inserts; pre-existing data not backfilled |
| Joins across tables | Not supported | Supported |
| Explicit query routing | Automatic (planner decides) | Must query MV table directly |
| TTL/lifecycle | Inherited from base table | Independent TTL |
| DROP TABLE behavior | Removed with base table | Survives DROP of source table |

## Projections: Best for Transparent Acceleration

Projections work transparently - you keep querying the base table and ClickHouse automatically uses the projection when it helps:

```sql
-- Query the base table; ClickHouse uses the projection automatically
SELECT status_code, count()
FROM http_logs
GROUP BY status_code;
```

Add a projection:

```sql
ALTER TABLE http_logs
    ADD PROJECTION status_summary (
        SELECT status_code, count() AS cnt GROUP BY status_code
    );
ALTER TABLE http_logs MATERIALIZE PROJECTION status_summary;
```

## Materialized Views: Best for Cross-Table and Complex Transforms

Materialized views shine when you need to join tables, apply complex transformations, or route data to a differently-structured destination table:

```sql
CREATE MATERIALIZED VIEW user_event_summary
ENGINE = SummingMergeTree(events)
ORDER BY (user_id, day)
AS
SELECT
    e.user_id,
    toStartOfDay(e.event_time)    AS day,
    u.region,
    count()                        AS events
FROM events AS e
JOIN users AS u ON e.user_id = u.id
GROUP BY e.user_id, day, u.region;
```

This cross-table join is not possible with projections.

## When to Choose Projections

- Query pattern is a simple re-sort or GROUP BY over the same table
- You want automatic query routing without changing application queries
- Consistency with the base table at all times is required
- Table lifecycle should remove the pre-computation automatically

## When to Choose Materialized Views

- Pre-computation involves JOINs or lookups from other tables
- The destination schema is significantly different from the source
- You need different retention policies for aggregated vs raw data
- You want to fan out inserts to multiple pre-aggregated tables simultaneously

## Combining Both

Use materialized views for complex cross-table aggregation, then add projections to the MV target table for further query acceleration:

```sql
-- MV populates summary table
CREATE MATERIALIZED VIEW hourly_summary_mv ...;

-- Add projection to the summary table for common query patterns
ALTER TABLE hourly_summary
    ADD PROJECTION by_region (
        SELECT * ORDER BY region, hour
    );
```

## Summary

Projections offer automatic, always-consistent query acceleration for simple re-sorts and aggregations over a single table. Materialized views provide more flexibility for complex transformations and cross-table aggregation but require explicit querying of the target table. Use projections as the default for transparent speedups, and reach for materialized views when projections cannot express the required transformation.
