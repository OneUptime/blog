# StarRocks Materialized View Refresh Failed: How to Find and Fix the Root Cause

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Materialized View, Refresh, SQL, Troubleshooting

Description: Trace a failed StarRocks asynchronous materialized-view refresh from metadata and task history to the failed query and safe repair.

---

A failed asynchronous materialized-view refresh is a query failure with scheduling and dependency context around it. The fastest diagnosis is to identify the exact task run, preserve its error and query ID, and classify the failure before retrying.

Repeatedly issuing `REFRESH MATERIALIZED VIEW ... FORCE` is risky. It can repeat an expensive full computation, increase queue pressure, and add retry records that obscure the original timing signal.

## Capture the View State

Inspect the view before changing it:

```sql
SHOW MATERIALIZED VIEWS FROM analytics WHERE NAME = 'mv_daily_sales'\G

SELECT
  table_schema,
  table_name,
  is_active,
  inactive_reason,
  refresh_type,
  refresh_trigger,
  last_refresh_state,
  last_refresh_time,
  last_refresh_error_code,
  last_refresh_error_message,
  task_name
FROM information_schema.materialized_views
WHERE table_schema = 'analytics'
  AND table_name = 'mv_daily_sales';
```

Distinguish these states:

- `FAILED` means a refresh task ran and failed.
- `PENDING` or `RUNNING` may indicate queueing or a long query rather than a failure.
- `MERGED` means a newly scheduled run was combined with an existing pending run.
- `SKIPPED` means StarRocks detected no relevant base-table change.
- `is_active = false` means the view cannot be refreshed or used for automatic query rewrite. It can still be queried directly, but its data may be inconsistent until the dependency or definition problem is repaired and the view is active again.

## Find the Exact Task Run

Use the returned `TASK_NAME`, not a guessed materialized-view name:

```sql
SELECT
  query_id,
  task_name,
  create_time,
  finish_time,
  state,
  error_code,
  error_message,
  progress,
  extra_message,
  properties
FROM information_schema.task_runs
WHERE task_name = 'mv-12345'
ORDER BY create_time DESC
LIMIT 20;
```

`EXTRA_MESSAGE` records details such as the materialized-view partitions selected, related base partitions, refresh mode, and whether `FORCE` was used. A single logical refresh can produce several task runs when `partition_refresh_number` splits the work, so inspect the first failed subtask and its predecessors.

Keep the `QUERY_ID`. It links the task to the Query Profile and FE audit trail. If the refresh started long after `CREATE_TIME`, queueing is part of the incident. If it ran for most of its timeout, investigate the query plan and resource pressure.

## Classify the Failure

### Memory exhaustion

Large joins and aggregations can exceed the refresh query's memory limit. Prefer reducing the working set before simply increasing memory:

```sql
ALTER MATERIALIZED VIEW analytics.mv_daily_sales
SET ('session.enable_spill' = 'true');
```

Partition the view so changed partitions can refresh independently, and set a conservative batch:

```sql
ALTER MATERIALIZED VIEW analytics.mv_daily_sales
SET ('partition_refresh_number' = '1');
```

Spill protects memory but uses disk and can make a refresh slower. Confirm local spill capacity and monitor the new profile.

### Timeout

Recent StarRocks releases allow refresh-query session properties on the materialized view:

```sql
ALTER MATERIALIZED VIEW analytics.mv_daily_sales
SET ('session.insert_timeout' = '3600');
```

Only raise the timeout after showing that the query is making progress. A partition design, statistics fix, or simpler definition is preferable to letting an unbounded full refresh run longer.

### Dependency or schema change

Run:

```sql
SHOW CREATE MATERIALIZED VIEW analytics.mv_daily_sales;
```

Then verify every base table, view, catalog, column, and function still exists and is accessible. Base-table schema changes can inactivate dependent views. UDF-based definitions also require the appropriate function `USAGE` privileges in addition to `SELECT` on referenced objects.

After repairing the dependency, activate the view:

```sql
ALTER MATERIALIZED VIEW analytics.mv_daily_sales ACTIVE;
```

Activation asks StarRocks to validate the view again. It does not recreate a missing column or grant a privilege.

### External-catalog metadata

For Hive or Iceberg dependencies, determine whether the external table or partition was dropped, recreated, renamed, or committed with a schema change. Check catalog connectivity and credentials from every relevant FE and BE or CN. Refreshing stale connector metadata may help, but do not clear caches until you have recorded the failing snapshot and error.

### Scheduling or resource isolation

Only one refresh task for a given materialized view runs at a time. Short schedules can therefore yield waiting and merged runs when refresh takes longer than its interval. Inspect the assigned resource group, current query load, and task timestamps. If refresh competes with dashboards, assign it to a dedicated, capacity-limited resource group rather than allowing it to monopolize interactive resources.

## Retry the Smallest Safe Scope

For a partitioned view backed by native StarRocks tables, retry only the affected time range:

```sql
REFRESH MATERIALIZED VIEW analytics.mv_daily_sales
PARTITION START ('2026-07-25') END ('2026-07-26')
WITH SYNC MODE;
```

For a view built on external catalogs, check the behavior of your release before relying on this range to limit the work. The current `REFRESH MATERIALIZED VIEW` reference warns that StarRocks refreshes all materialized-view partitions for these views.

`WITH SYNC MODE` makes the SQL call wait for success or failure, which is useful for a controlled repair. Use `FORCE` only when you intentionally need to bypass the normal base-partition change check:

```sql
REFRESH MATERIALIZED VIEW analytics.mv_daily_sales
PARTITION START ('2026-07-25') END ('2026-07-26')
FORCE
WITH SYNC MODE;
```

Do not force the whole history to test a one-day fix.

## Confirm Recovery

After the retry:

```sql
SELECT
  state,
  error_message,
  create_time,
  finish_time,
  extra_message
FROM information_schema.task_runs
WHERE task_name = 'mv-12345'
ORDER BY create_time DESC
LIMIT 5;
```

Verify that:

1. The repaired run is `SUCCESS`.
2. `LAST_REFRESH_TIME` advances to the expected base-data point.
3. The view is active.
4. The intended partitions, not the entire history, were refreshed.
5. Query rewrite uses the view and returns results within the freshness SLO.
6. The next scheduled run also succeeds without manual intervention.

Alert on failed refresh counts and stale `LAST_REFRESH_TIME`, not only on view activity. A view can remain active while its latest refresh has failed.

## Official Documentation

- [Troubleshooting asynchronous materialized views](https://docs.starrocks.io/docs/using_starrocks/async_mv/troubleshooting_asynchronous_materialized_views/)
- [Understand materialized view task runs](https://docs.starrocks.io/docs/using_starrocks/async_mv/materialized_view_task_run_details/)
- [Information Schema task_runs](https://docs.starrocks.io/docs/sql-reference/information_schema/task_runs/)
- [REFRESH MATERIALIZED VIEW](https://docs.starrocks.io/docs/sql-reference/sql-statements/materialized_view/REFRESH_MATERIALIZED_VIEW/)
- [Information Schema materialized_views](https://docs.starrocks.io/docs/sql-reference/information_schema/materialized_views/)
