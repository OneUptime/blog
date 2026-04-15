# How to Use Refreshable Materialized Views in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Materialized View, Refreshable, Performance, Aggregation

Description: Learn how to create refreshable materialized views in ClickHouse to precompute expensive aggregations on a schedule, decoupling writes from view updates.

---

Standard ClickHouse materialized views update incrementally on every INSERT. Refreshable materialized views take a different approach: they run a full query on a schedule, replacing the view's data atomically. This is ideal when your aggregation depends on the entire dataset or when incremental computation is impractical.

## When to Use Refreshable Materialized Views

Use refreshable materialized views when:
- Your aggregation requires sorting or joining the full table
- You want hourly or daily summaries without incremental overhead
- You need to rebuild derived tables after data corrections or backfills
- The source table undergoes mutations that break incremental view state

## Creating a Refreshable Materialized View

The syntax uses `REFRESH EVERY` to define the schedule:

```sql
CREATE MATERIALIZED VIEW daily_sales_summary
REFRESH EVERY 1 HOUR
ENGINE = MergeTree
ORDER BY (sale_date, product_id)
AS
SELECT
    toDate(event_time) AS sale_date,
    product_id,
    sum(amount) AS total_sales,
    count() AS order_count
FROM orders
GROUP BY sale_date, product_id;
```

ClickHouse will run this query every hour and atomically swap the view's contents with the new result.

## Refreshing on a Fixed Schedule

For daily aggregations that should run at a specific time, use `REFRESH EVERY 1 DAY OFFSET 2 HOUR`:

```sql
CREATE MATERIALIZED VIEW monthly_cohort_summary
REFRESH EVERY 1 DAY OFFSET 1 HOUR
ENGINE = MergeTree
ORDER BY (cohort_month, user_segment)
AS
SELECT
    toStartOfMonth(signup_date) AS cohort_month,
    user_segment,
    count(DISTINCT user_id) AS cohort_size,
    avg(lifetime_value) AS avg_ltv
FROM users
GROUP BY cohort_month, user_segment;
```

The `OFFSET 1 HOUR` means the refresh runs 1 hour after midnight UTC each day.

## Checking Refresh Status

```sql
SELECT
    database,
    view,
    status,
    last_refresh_time,
    next_refresh_time,
    exception
FROM system.view_refreshes
ORDER BY next_refresh_time;
```

The `status` column shows the current refresh state, and the `exception` column contains the error message if the last refresh failed.

## Manually Triggering a Refresh

```sql
SYSTEM REFRESH VIEW daily_sales_summary;
```

Useful after backfilling historical data or when you need the view updated immediately.

## Refresh with Dependencies

If one refreshable view depends on another, you can chain them using `DEPENDS ON`:

```sql
CREATE MATERIALIZED VIEW weekly_rollup
REFRESH EVERY 1 DAY OFFSET 2 HOUR
DEPENDS ON daily_sales_summary
ENGINE = MergeTree
ORDER BY (week_start, product_id)
AS
SELECT
    toMonday(sale_date) AS week_start,
    product_id,
    sum(total_sales) AS weekly_sales
FROM daily_sales_summary
GROUP BY week_start, product_id;
```

ClickHouse waits for `daily_sales_summary` to finish refreshing before starting `weekly_rollup`.

## Pausing and Resuming Refreshes

```sql
-- Stop scheduled refreshes without dropping the view
SYSTEM STOP VIEW daily_sales_summary;

-- Resume the schedule
SYSTEM START VIEW daily_sales_summary;
```

## Summary

Refreshable materialized views give you the power of full-scan aggregations on a reliable schedule, with atomic swaps that keep queries reading consistent data. They are a clean alternative to incremental views when your aggregation logic requires global context or when you want predictable, time-based data freshness rather than continuous incremental updates.
