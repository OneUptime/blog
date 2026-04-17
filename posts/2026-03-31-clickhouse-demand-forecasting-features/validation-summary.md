# Validation Summary: How to Build Demand Forecasting Features with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, window functions, aggregate combinators)
- SQL window functions (ROWS BETWEEN frame clauses)
- ClickHouse data types: `LowCardinality(String)`, `Decimal64(2)`, `UInt32`, `Date`
- ClickHouse functions: `toYYYYMM`, `toDayOfWeek`, `today`, `sumIf`, `avg`, `stddevPop`, `nullIf`, `round`

## Sources Consulted
- ClickHouse Window Functions docs: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse Aggregate Functions docs: https://clickhouse.com/docs/sql-reference/aggregate-functions
- ClickHouse Aggregate Function Combinators (`-If` suffix): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse Date/Time functions (`today`, `toDayOfWeek`, `toYYYYMM`): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse LowCardinality docs: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- Tinybird / ClickHouse issue references for NOT_AN_AGGREGATE: https://www.tinybird.co/docs/sql-reference/clickhouse-errors/NOT_AN_AGGREGATE

## Issues Found
- **Day-of-Week Seasonality Index query**: The original query mixed a window function `avg(units_sold) OVER (PARTITION BY sku, location_id)` with `GROUP BY sku, location_id, dow`. Because `units_sold` is neither in the GROUP BY keys nor wrapped in an outer aggregate, ClickHouse would raise a `NOT_AN_AGGREGATE` ("Column is not under aggregate function and not in GROUP BY") error at parse/analysis time. Window functions are evaluated after GROUP BY, so their arguments must reference GROUP BY columns or aggregate expressions. Fixed by computing the per-dow average in a CTE (`dow_avg`), then applying the window function `avg(avg_units_for_dow) OVER (PARTITION BY sku, location_id)` on the aggregated result. This preserves the author's intent (comparing each dow's average against the overall per-(sku, location) average to derive a seasonality index).

## Review Notes
- The `daily_sales` MergeTree schema, partitioning by `toYYYYMM(sale_date)`, and the sort order `(sku, location_id, sale_date)` are idiomatic for this workload.
- Rolling window frame syntax (`ROWS BETWEEN N PRECEDING AND CURRENT ROW`) is correctly used; rolling averages assume one row per date per (sku, location). If there can be multiple sales rows per day, pre-aggregation to daily totals would be required before applying the window — worth noting but not an error in the code itself.
- The sell-through rate query joins a subquery that sums `inventory_events.quantity` across all history; depending on how inventory events are modeled (signed deltas vs. snapshots), this may not correctly represent current on-hand stock. This is a modeling assumption, not a SQL bug.
- `stddevPop` is chosen over `stddevSamp`; for feature engineering with small 90-day samples either is defensible. Left as-is since both are valid.
- ClickHouse supports date arithmetic such as `today() - 60`, `today() - 393`, `BETWEEN today() - 393 AND today() - 365` — verified correct.
- `sumIf`, `nullIf`, `round`, `Decimal64(2)`, `LowCardinality(String)`, `toDayOfWeek`, `toYYYYMM` — all verified against current ClickHouse documentation.
