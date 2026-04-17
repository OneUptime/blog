# How to Use Aggregate Projections in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Projection, Aggregate, MergeTree, Query Optimization

Description: Learn how to use aggregate projections in ClickHouse to pre-compute GROUP BY results and serve dashboard queries in milliseconds.

---

## What Are Aggregate Projections?

Aggregate projections store pre-computed GROUP BY aggregations inside MergeTree table parts. Unlike normal projections that reorder rows, aggregate projections collapse many rows into fewer rows using aggregate functions - similar to a materialized view but co-located with the base table and automatically maintained.

## Creating an Aggregate Projection

```sql
ALTER TABLE http_logs
    ADD PROJECTION hourly_status_summary (
        SELECT
            service,
            status_code,
            toStartOfHour(timestamp) AS hour,
            count()                   AS request_count,
            sum(response_time_ms)     AS total_latency,
            max(response_time_ms)     AS max_latency
        GROUP BY service, status_code, hour
    );

ALTER TABLE http_logs MATERIALIZE PROJECTION hourly_status_summary;
```

## How ClickHouse Selects the Projection

ClickHouse's query planner automatically uses the projection when:
1. All columns referenced in SELECT, WHERE, GROUP BY, and HAVING are present in the projection
2. The query's GROUP BY keys are a subset of or exactly match the projection's GROUP BY keys (so ClickHouse can roll up the pre-aggregated data to answer the query)

```sql
-- This query will use the hourly_status_summary projection automatically
SELECT
    service,
    status_code,
    toStartOfHour(timestamp) AS hour,
    count()                   AS requests,
    max(response_time_ms)     AS max_latency
FROM http_logs
WHERE service = 'api-gateway'
GROUP BY service, status_code, hour
ORDER BY hour;
```

## Using AggregateFunction State in Projections

For functions like `uniq`, `quantileTDigest`, store intermediate states:

```sql
ALTER TABLE http_logs
    ADD PROJECTION user_stats (
        SELECT
            service,
            toStartOfDay(timestamp) AS day,
            countState()                           AS cnt_state,
            uniqState(user_id)                     AS user_state,
            quantileTDigestState(0.99)(response_time_ms) AS p99_state
        GROUP BY service, day
    );

ALTER TABLE http_logs MATERIALIZE PROJECTION user_stats;
```

To query:

```sql
SELECT
    service,
    day,
    countMerge(cnt_state)                        AS requests,
    uniqMerge(user_state)                        AS distinct_users,
    quantileTDigestMerge(0.99)(p99_state)        AS p99_latency
FROM http_logs
GROUP BY service, day;
```

## Aggregate Projection vs Materialized View

| Aspect | Aggregate Projection | Materialized View |
|---|---|---|
| Maintenance | Automatic, atomic with insert | Eventual, separate table |
| Schema coupling | Co-located with base table | Independent table |
| DROP TABLE | Removed with base table | Survives base table changes |
| Flexibility | Limited to base table columns | Can JOIN/transform |

Use projections for simple pre-aggregations over the same table. Use materialized views when you need cross-table joins or complex transformations.

## Verifying Projection Use with EXPLAIN

```sql
EXPLAIN projections = 1
SELECT service, count()
FROM http_logs
WHERE toStartOfHour(timestamp) = toStartOfHour(now())
GROUP BY service;
```

Look for the projection name under the `ReadFromMergeTree` step's `Projections:` annotations in the plan output.

## Dropping an Aggregate Projection

```sql
ALTER TABLE http_logs DROP PROJECTION hourly_status_summary;
```

This removes the projection data from all parts and stops maintaining it on future inserts.

## Summary

Aggregate projections in ClickHouse automatically maintain pre-computed GROUP BY results inside table parts. They are ideal for dashboard queries that aggregate on time buckets or low-cardinality dimensions. Using `AggregateFunction` state types enables even more power - supporting merging of probabilistic structures like HyperLogLog and t-digest across time windows.
