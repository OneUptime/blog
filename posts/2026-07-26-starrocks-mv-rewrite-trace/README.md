# Why Isn’t StarRocks Using My Materialized View? Diagnose Query Rewrite with TRACE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Materialized View, Query Rewrite, SQL, Troubleshooting

Description: Diagnose StarRocks materialized-view rewrite failures with EXPLAIN, TRACE, freshness checks, and structural query comparisons.

---

Creating an asynchronous materialized view does not force every related query to use it. The optimizer considers active views whose contents are fresh enough and whose definitions can legally answer the query. It can then choose a base-table plan if no candidate matches.

Use a repeatable sequence: prove that the view is usable, prove that rewrite is enabled, inspect the chosen plan, and only then read the optimizer's reason.

## Prove the View Is a Candidate

Start with metadata rather than query timing:

```sql
SHOW MATERIALIZED VIEWS WHERE NAME = 'mv_daily_revenue'\G

SELECT
  table_schema,
  table_name,
  is_active,
  inactive_reason,
  last_refresh_state,
  last_refresh_time,
  last_refresh_error_message,
  query_rewrite_status
FROM information_schema.materialized_views
WHERE table_schema = 'analytics'
  AND table_name = 'mv_daily_revenue';
```

An asynchronous view must be active and have materialized data before it can accelerate a query. A failed initial refresh, a base-table schema change, or a missing dependency can leave it inactive. Fix the reported cause first. Do not run `ALTER MATERIALIZED VIEW ... ACTIVE` as a substitute for fixing a broken definition.

Confirm the definition you are actually testing:

```sql
SHOW CREATE MATERIALIZED VIEW analytics.mv_daily_revenue;
```

This catches a surprisingly common mistake: comparing a query with an old view definition after deployment automation changed aliases, casts, predicates, or the partition expression.

## Confirm Rewrite Is Enabled and Inspect the Plan

Check the session variable in the same connection that runs the BI query:

```sql
SHOW VARIABLES LIKE 'enable_materialized_view_rewrite';
```

Then explain the exact application SQL, including its casts and predicates:

```sql
EXPLAIN
SELECT
  order_date,
  region,
  SUM(revenue) AS revenue
FROM analytics.orders
WHERE order_date >= '2026-07-01'
GROUP BY order_date, region;
```

In the plan, inspect the `TABLE` field under `OlapScanNode`. Rewrite occurred only if it names the materialized view. A fast execution is not proof, because cache, partition pruning, and warmed storage can also make the base-table plan fast.

## Ask TRACE for the Reason

StarRocks provides two materialized-view tracing forms:

```sql
TRACE REASON MV
SELECT
  order_date,
  region,
  SUM(revenue)
FROM analytics.orders
WHERE order_date >= '2026-07-01'
GROUP BY order_date, region;
```

`TRACE REASON MV` is available in v3.2.8 and later and returns concise rejection reasons. If that is not enough, use the detailed form:

```sql
TRACE LOGS MV
SELECT
  order_date,
  region,
  SUM(revenue)
FROM analytics.orders
WHERE order_date >= '2026-07-01'
GROUP BY order_date, region;
```

`TRACE LOGS MV` is available from v3.2. Treat its output as diagnostic data: capture the server version, view definition, query, and trace together before changing anything.

## Fix the Common Structural Mismatches

For regular asynchronous rewrite, StarRocks primarily matches select-project-join-group-by shapes. Check these differences first:

- A query predicate references a column that the view did not project. Include columns needed for filtering and grouping in the view definition.
- Join types, join keys, or outer-join predicates differ. Moving a safe predicate between `ON` and `WHERE` can materially change outer-join semantics, so follow the trace rather than rewriting blindly.
- The query needs a finer aggregation grain than the view stores. A daily view cannot reconstruct hourly results.
- Expressions differ because of casts, time-zone conversion, or function arguments.
- A non-deterministic function such as `rand()`, `uuid()`, or `sleep()` makes rewrite unsuitable.
- Statistics are missing or stale, so an eligible view is not the cheapest estimated plan.

From v3.3, text-based rewrite can match a query or subquery whose abstract syntax tree matches a materialized-view definition. It supports shapes beyond the regular SPJG path, but the match is intentionally sensitive to the SQL structure. Avoid unnecessary `ORDER BY` inside the matching subquery, because StarRocks normally removes subquery ordering.

If the view is based on a complex logical view, `enable_view_based_mv_rewrite` is disabled by default. Enable it only after verifying that the deployed StarRocks version supports the required pattern:

```sql
SET enable_view_based_mv_rewrite = true;
```

## Check Freshness Before Relaxing Consistency

For native StarRocks base tables, automatic rewrite normally preserves strong result consistency by rejecting stale materialized partitions or combining fresh view partitions with base-table data when supported. If TRACE reports a timeliness failure, repair or reschedule refresh first.

StarRocks also offers controls such as:

```sql
ALTER MATERIALIZED VIEW analytics.mv_daily_revenue
SET ('mv_rewrite_staleness_second' = '300');
```

That setting explicitly permits a five-minute staleness window. It is a product decision, not a generic performance fix. Record the freshness SLO and ensure dashboard users understand it.

`query_rewrite_consistency = 'LOOSE'` weakens consistency checks further. Do not use it merely to make TRACE quiet.

External catalogs require extra care. StarRocks cannot provide the same strong consistency guarantee for external data, and JDBC-catalog-based asynchronous materialized views do not support query rewrite. Verify the external-catalog support matrix for your release before tuning.

## Validate the Repair

Run the test in a clean session:

```sql
EXPLAIN
SELECT
  order_date,
  region,
  SUM(revenue)
FROM analytics.orders
WHERE order_date >= '2026-07-01'
GROUP BY order_date, region;
```

Then verify all of the following:

1. The scan names the expected view.
2. The result matches the base-table query at the required freshness point.
3. The profile shows fewer scanned rows and lower operator cost.
4. Refresh cost does not overwhelm the performance saved by rewrite.
5. The application session has the same rewrite variables as the test session.

The durable fix is a view whose grain, predicates, expressions, and refresh policy match the real query workload. A hint or relaxed consistency setting can hide a bad model, but TRACE usually makes the mismatch explicit.

## Official Documentation

- [Troubleshooting asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/troubleshooting_asynchronous_materialized_views/)
- [Query rewrite with materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/query_rewrite_with_materialized_views/)
- [Asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/Materialized_view/)
- [Information Schema materialized_views](https://docs.starrocks.io/docs/sql-reference/information_schema/materialized_views/)
