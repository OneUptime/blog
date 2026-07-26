# Synchronous vs Asynchronous Materialized Views in StarRocks: Which One Should You Use?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Materialized View, Data Modeling, Query Performance, SQL

Description: Choose between StarRocks synchronous rollups and asynchronous materialized views based on query shape, freshness, and operating cost.

---

StarRocks uses the term materialized view for two distinct mechanisms. A synchronous materialized view is a rollup index maintained with its single native base table. An asynchronous materialized view is a physical table populated by a refresh task and can represent joins, external data, and more complex aggregation.

The choice is not simply "real time versus batch." It changes the supported query shape, load cost, operational surface, and how the object is queried.

## Compare the Two Models

| Requirement | Synchronous MV (rollup) | Asynchronous MV |
| --- | --- | --- |
| Base objects | One native table in the default catalog | Multiple native or supported external tables, views, and other MVs |
| Freshness | Updated as base-table data is loaded | Automatic, scheduled, or manual refresh |
| Join support | No | Yes |
| Aggregations | Limited supported aggregate forms | Broad SQL and aggregation support |
| Physical model | Index of the base table | Independent physical table |
| Direct query | Only through the synchronous-MV hint | Can be queried by name |
| Query rewrite | Transparent when eligible | Transparent when eligible and fresh enough |
| Operational work | Build status and load amplification | Refresh scheduling, failures, lag, and resource control |

Both are built asynchronously after their `CREATE` statement is submitted. "Synchronous" describes how subsequent base-table changes maintain the rollup, not whether the initial DDL blocks until construction finishes.

## Choose a Synchronous View for a Native Single-Table Rollup

A synchronous view fits repeated single-table projections or supported aggregations that need to track every successful load:

```sql
CREATE MATERIALIZED VIEW mv_store_sales
AS
SELECT
  store_id,
  SUM(sale_amount)
FROM fact_sales
GROUP BY store_id;
```

Check the build:

```sql
SHOW ALTER MATERIALIZED VIEW FROM analytics;
```

The optimizer can transparently rewrite an eligible query. Because the view is an index, direct access uses the special hint:

```sql
SELECT * FROM mv_store_sales [_SYNC_MV_];
```

Use a synchronous rollup when:

- There is exactly one native base table.
- The expression and aggregate functions are supported.
- The result must follow every load without a separate refresh schedule.
- The extra write, storage, and compaction cost is acceptable.
- You need another column order to improve prefix-index access.

Synchronous views are supported on Duplicate Key and Aggregate tables. A `WHERE` clause is supported from v3.1.8, and shared-data cluster support begins in v3.4.0. Verify the precise aggregate correspondence and table-model restrictions for the deployed release.

## Choose an Asynchronous View for Joins or Independent Refresh

An asynchronous view is the normal choice for star-schema joins, complex metric layers, external catalogs, and expensive computations whose maintenance should be separated from ingestion:

```sql
CREATE MATERIALIZED VIEW analytics.mv_daily_customer_sales
PARTITION BY order_date
DISTRIBUTED BY HASH(customer_id)
REFRESH ASYNC EVERY (INTERVAL 10 MINUTE)
AS
SELECT
  date_trunc('day', o.order_time) AS order_date,
  o.customer_id,
  c.segment,
  SUM(o.revenue) AS revenue
FROM analytics.orders AS o
JOIN analytics.customers AS c
  ON o.customer_id = c.customer_id
GROUP BY date_trunc('day', o.order_time), o.customer_id, c.segment;
```

This object can be queried directly:

```sql
SELECT * FROM analytics.mv_daily_customer_sales;
```

However, direct access can expose stale materialized data. For native base tables, transparent query rewrite applies consistency checks and normally avoids an ineligible stale view. Those are different read paths.

Use an asynchronous view when:

- The definition joins multiple tables.
- The source is a supported Hive, Iceberg, Hudi, Paimon, or other documented catalog.
- The refresh cadence should differ from ingestion cadence.
- You need partition-level incremental refresh, TTL, nested materialization, or a dedicated refresh resource group.
- The SQL is beyond the synchronous rollup's supported aggregate forms.

Asynchronous views are supported from v2.4, with capabilities added over later releases. Check the feature-support matrix rather than assuming a recent example works on an older cluster.

## Account for the Write and Refresh Costs

A synchronous rollup increases the work associated with every base-table load and adds another index to compact and store. It is inexpensive to operate compared with a scheduled pipeline, but it is not free.

An asynchronous view moves that cost into refresh tasks. This gives more control, but introduces:

- refresh lag
- task queues and merged runs
- failed task diagnosis
- full-refresh risk when partitions cannot be mapped
- resource contention with interactive queries
- explicit consistency decisions

For a high-ingest table with a simple real-time aggregation, a rollup is often the cleaner design. For a large multi-table dashboard model, an asynchronous partitioned view is usually more scalable.

## Test Rewrite, Not Just Direct Reads

For either type, use the actual application query:

```sql
EXPLAIN
SELECT
  store_id,
  SUM(sale_amount)
FROM fact_sales
GROUP BY store_id;
```

Inspect the scan node for the selected materialized object. Then compare result correctness, scan rows, CPU, and latency. A view that can be queried directly but never matches application SQL is not providing transparent acceleration.

For asynchronous rewrite failures, use:

```sql
TRACE REASON MV
SELECT
  store_id,
  SUM(sale_amount)
FROM fact_sales
GROUP BY store_id;
```

`TRACE REASON MV` requires v3.2.8 or later.

## A Practical Decision Sequence

1. Is the definition based on more than one table or an external catalog? Choose asynchronous.
2. Is it a supported single-table projection or aggregation requiring load-time freshness? Test a synchronous rollup.
3. Does maintaining the rollup make ingestion or compaction miss its SLO? Move the computation to an asynchronous view.
4. Can a late dimension update invalidate all view partitions? Redesign or budget the asynchronous refresh.
5. Do users require exact current results? Test transparent rewrite consistency, not direct reads of an async view.
6. Does neither model produce enough benefit to cover maintenance cost? Keep the base-table query and improve schema, partitioning, or statistics first.

The simplest view that matches the workload is usually best: a synchronous rollup for narrow, native, real-time patterns; a partitioned asynchronous view for complex or independently refreshed models.

## Official Documentation

- [Synchronous materialized view](https://docs.starrocks.io/docs/using_starrocks/Materialized_view-single_table/)
- [Asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/Materialized_view/)
- [CREATE MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/CREATE_MATERIALIZED_VIEW/)
- [Feature support for asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/feature-support-asynchronous-materialized-views/)
