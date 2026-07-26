# How to Keep StarRocks Materialized Views Fresh Without Full-Refresh Overload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Materialized View, Partitioning, Refresh, Performance

Description: Design partition-aware StarRocks materialized-view refreshes that meet freshness targets without repeatedly recomputing full history.

---

Materialized-view freshness is primarily a data-modeling problem. If a large asynchronous view has no useful partition relationship to its base data, a small change can require a full recomputation. Scheduling that work every minute only creates a permanent refresh backlog.

The scalable pattern is to align the view with the base table's change boundary, refresh changed partitions in bounded batches, and define how much lag the consuming query is allowed to tolerate.

## Start with a Freshness Contract

Write down three values before creating the view:

- Maximum acceptable result age, such as five minutes.
- Maximum late-arrival window, such as three days.
- Maximum refresh resource budget during peak traffic.

These values determine whether automatic, scheduled, or externally orchestrated manual refresh is appropriate. They also determine which historical partitions need reopening when late data arrives.

## Build a Partitioned View

Suppose `fact_orders` is partitioned daily on `order_time`. A daily materialized view can track the same boundary:

```sql
CREATE MATERIALIZED VIEW analytics.mv_daily_region_revenue
PARTITION BY order_date
DISTRIBUTED BY HASH(region)
REFRESH ASYNC EVERY (INTERVAL 5 MINUTE)
PROPERTIES (
  'partition_refresh_number' = '1',
  'partition_refresh_strategy' = 'adaptive',
  'auto_refresh_partitions_limit' = '7'
)
AS
SELECT
  date_trunc('day', order_time) AS order_date,
  region,
  SUM(revenue) AS revenue
FROM analytics.fact_orders
GROUP BY date_trunc('day', order_time), region;
```

The partition column must be an output column of the view query. Here, `order_date` is the day-truncated output used by both `PARTITION BY` and `GROUP BY`, so the stored rows and partitions have the same daily grain. This example deliberately uses one day-grain partition expression; from v3.5.0, asynchronous materialized views can use multiple partition expressions. Native StarRocks base tables can use Range, List, or Expression partitioning subject to the documented mapping rules. `date_trunc` is the usual way to roll a finer base-table time partition into a coarser view partition.

When a tracked base partition changes, StarRocks can refresh the related view partition instead of all history. If the view is unpartitioned, or StarRocks cannot establish a partition mapping through the query, expect full refresh behavior.

## Bound Each Refresh Run

`partition_refresh_number` limits how many partitions a refresh batch processes. In StarRocks v3.3 and later its default changed to `1`, so one logical refresh can appear as several closely spaced entries in `information_schema.task_runs`.

The `adaptive` partition refresh strategy can vary the batch size based on source data volume. Use it only on a version that supports the property, and confirm the actual `adaptivePartitionRefreshNumber` in task-run details.

`auto_refresh_partitions_limit` limits the most recent partitions considered by automatic refresh. It is an upper limit, not a promise to refresh exactly that many. If only two tracked base partitions changed, only those partitions need work.

For a controlled backfill, use a manual range:

```sql
REFRESH MATERIALIZED VIEW analytics.mv_daily_region_revenue
PARTITION START ('2026-07-20') END ('2026-07-27')
WITH SYNC MODE;
```

Avoid `FORCE` unless the base-partition version check is known to be insufficient. Forced refresh deliberately bypasses the change check.

## Choose a Trigger Policy That Can Finish

StarRocks supports:

- `REFRESH ASYNC`, triggered when relevant base data changes.
- `REFRESH ASYNC EVERY (...)`, checked on a schedule.
- `REFRESH MANUAL`, triggered by an operator or external scheduler.

Only one refresh task per materialized view can run at a time. If a refresh takes longer than its interval, new pending work can be merged or wait behind the running task. Therefore, a one-minute interval cannot produce one-minute freshness when each refresh needs eight minutes.

Measure:

```sql
SELECT
  task_name,
  create_time,
  finish_time,
  state,
  progress,
  error_message,
  extra_message
FROM information_schema.task_runs
WHERE task_name = 'mv-12345'
ORDER BY create_time DESC
LIMIT 30;
```

Compare queue delay, execution time, and the number of partitions in each run. Increase the interval, reduce the batch, or simplify the view until normal refresh finishes inside the planned cadence.

## Prevent Dimension Changes from Rebuilding History

In a join-based view, changing a small dimension table can invalidate results across every fact partition. StarRocks provides properties such as `excluded_trigger_tables` and `excluded_refresh_tables` for specialized models, but excluding a table means accepting that its changes will not immediately propagate through the normal dependency path.

Use exclusion only when one of these is true:

- The table is effectively immutable.
- Its updates are handled by a separate, deliberate refresh.
- The freshness contract explicitly permits stale dimension values.

Document the compensating refresh. Otherwise, a performance optimization becomes silent data inconsistency.

## Limit Materialized History

If consumers only query a recent window, retain only that window with a partition TTL. On versions v3.1.5 and later, time-based `partition_ttl` is preferred over the older count-based `partition_ttl_number`.

TTL reduces refresh and storage cost, but queries outside the materialized window may need Union rewrite against the base table. Test the resulting plan and latency. A TTL is not an archival policy for the base data.

## Isolate and Protect Refresh Work

Refresh joins and aggregations can use substantial memory. Assign refresh to an appropriate resource group and enable spill only after provisioning spill capacity:

```sql
ALTER MATERIALIZED VIEW analytics.mv_daily_region_revenue
SET ('session.enable_spill' = 'true');
```

Do not give refresh unlimited resources to chase an impossible schedule. A bounded refresh queue is healthier than making interactive queries compete with repeated full scans.

## Treat Query Freshness Separately

For native base tables, automatic query rewrite normally rejects an asynchronous view that does not meet consistency requirements. A direct query against the materialized view can still return stale data.

If the product permits bounded staleness, state it explicitly:

```sql
ALTER MATERIALIZED VIEW analytics.mv_daily_region_revenue
SET ('mv_rewrite_staleness_second' = '300');
```

This permits rewrite within a five-minute staleness window. It does not make refresh faster. For external catalogs, StarRocks cannot guarantee the same strong consistency because it may not immediately perceive upstream changes.

## Operate the View as a Pipeline

Monitor at least:

- `IS_ACTIVE` and `LAST_REFRESH_STATE`
- `LAST_REFRESH_TIME` compared with the freshness SLO
- refresh queue delay and execution time
- failed and merged task runs
- partitions selected per run
- bytes scanned, memory, spill, and CPU for refresh query IDs

The target is not "refresh as frequently as possible." It is a stable pipeline whose worst normal run fits inside its cadence and whose exceptional backfills are bounded and observable.

## Official Documentation

- [Create a partitioned materialized view](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/create_partitioned_materialized_view/)
- [Data modeling with materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/use_cases/data_modeling_with_materialized_views/)
- [Asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/Materialized_view/)
- [Understand materialized view task runs](https://docs.starrocks.io/docs/using_starrocks/async_mv/materialized_view_task_run_details/)
- [REFRESH MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/REFRESH_MATERIALIZED_VIEW/)
