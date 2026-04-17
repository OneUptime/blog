# Common ClickHouse Materialized View Mistakes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, AggregatingMergeTree, Query Optimization, Incremental Aggregation

Description: Avoid the most common ClickHouse materialized view mistakes that cause stale data, incorrect aggregations, and hidden performance penalties.

---

Materialized views in ClickHouse update incrementally as data is inserted, making them powerful for real-time aggregations. But they are easy to misuse. Here are the mistakes that cause the most production problems.

## Mistake 1: Using SUM Instead of sumState in AggregatingMergeTree Views

When combining materialized views with `AggregatingMergeTree`, you must use aggregate state functions, not plain aggregates. Using `SUM` stores final values that cannot be combined correctly during merges.

```sql
-- Wrong: uses plain SUM, breaks during merge
CREATE MATERIALIZED VIEW hourly_events_mv
ENGINE = AggregatingMergeTree() ORDER BY (hour, region)
AS SELECT
  toStartOfHour(ts) AS hour,
  region,
  sum(revenue) AS total_revenue
FROM events GROUP BY hour, region;

-- Correct: uses sumState
CREATE MATERIALIZED VIEW hourly_events_mv
ENGINE = AggregatingMergeTree() ORDER BY (hour, region)
AS SELECT
  toStartOfHour(ts) AS hour,
  region,
  sumState(revenue) AS total_revenue
FROM events GROUP BY hour, region;
```

Query with `sumMerge` to get the final value.

## Mistake 2: Forgetting the TO Clause and Using an Implicit Target Table

Without a `TO` clause, ClickHouse creates an internal `.inner_id.<uuid>` table. This table is dropped when the view is dropped, and altering its schema, TTL, or partitioning later is painful because you have to reference the auto-generated name.

```sql
-- Correct: explicit target table
CREATE TABLE hourly_events (
  hour DateTime,
  region String,
  total_revenue AggregateFunction(sum, Float64)
) ENGINE = AggregatingMergeTree() ORDER BY (hour, region);

CREATE MATERIALIZED VIEW hourly_events_mv TO hourly_events AS
SELECT toStartOfHour(ts) AS hour, region, sumState(revenue) AS total_revenue
FROM events GROUP BY hour, region;
```

## Mistake 3: Not Populating Historical Data

Materialized views only process new inserts. After creation, the target table is empty until new data arrives.

```sql
-- Backfill manually after creating the view
INSERT INTO hourly_events
SELECT toStartOfHour(ts) AS hour, region, sumState(revenue) AS total_revenue
FROM events GROUP BY hour, region;
```

## Mistake 4: Chaining Views Without Understanding Order of Execution

ClickHouse executes materialized view triggers in an undefined order. If view B depends on view A's output, B may run before A completes processing the same batch.

Design pipelines so each view reads directly from the source table, not from another view's target table, unless you accept eventual consistency.

## Mistake 5: Using POPULATE Without a Transaction Window

`CREATE MATERIALIZED VIEW ... POPULATE` backfills data but does not stop new inserts during the process. Rows inserted between `CREATE` and `POPULATE` completing may be missed.

Use the explicit INSERT approach above for reliable backfills.

## Summary

ClickHouse materialized views require aggregate state functions with `AggregatingMergeTree`, explicit `TO` clauses, and manual backfill queries. Avoid chaining views for sequential processing and never rely on `POPULATE` for production backfills. When built correctly, materialized views deliver sub-millisecond query latency for real-time dashboards.
