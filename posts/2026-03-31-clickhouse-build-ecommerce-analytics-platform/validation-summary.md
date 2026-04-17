# Validation Summary: How to Build an E-Commerce Analytics Platform with ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (MergeTree engine, LowCardinality types, Decimal types, Nullable types)
- ClickHouse SQL: CTEs, window functions (`lagInFrame`), aggregate combinators (`countIf`), quantiles
- Date/time functions: `toDate`, `toYYYYMM`, `toStartOfMonth`, `dateDiff`, `today`
- Null-handling functions: `nullIf`
- Grafana (referenced in architecture diagram)
- Mermaid (for diagrams)

## Sources Consulted
- ClickHouse `countIf` and aggregate combinators: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference
- ClickHouse `nullIf`: https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse `LowCardinality` data type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse `quantile`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse date/time functions including `dateDiff`, `toYYYYMM`, `toStartOfMonth`: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse CTE syntax: https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse window functions (including `lagInFrame`): https://clickhouse.com/docs/sql-reference/window-functions

## Issues Found

### 1. Product Performance query produced inflated `revenue` and `units_sold` (fixed)
The original query LEFT-JOINed `order_items` with a subquery of `product_events` rows on `product_id`. Because `product_events` contains one row per session view (not one per product), each order_item row was multiplied by the number of matching view rows. As a result, `sum(oi.total_price_usd)` and `sum(oi.quantity)` were both inflated by the number of product views — often by orders of magnitude — producing wrong revenue numbers. Only the `count(DISTINCT ...)` aggregates were unaffected.

**Fix:** Rewrote the query using two CTEs (`product_sales` and `product_views`) that each aggregate independently by `product_id`, then joined the per-product aggregates. This preserves the original intent (revenue, units, orders, views, and view-to-purchase conversion) while producing correct numbers.

## Review Notes
- The `net_revenue` formula in the Daily Revenue Report (`sum(total_usd) - sum(discount_usd)`) assumes the reader treats `total_usd` as pre-discount; under the more common convention where `total_usd` already has the discount applied, this double-counts the discount. Left unchanged since the schema's exact semantics are not documented in the post and the SQL itself is valid — the author's intent was clear enough and fixing would require schema assumptions.
- The Daily Revenue Report and LTV cohort queries filter on `status != 'cancelled'`. If statuses include things like `'refunded'`, these would still be counted toward revenue; this is a business-logic consideration rather than a technical error.
- `ORDER BY` clauses that include aliased expressions work correctly in ClickHouse; verified.
- All ClickHouse types (`LowCardinality(String)`, `Decimal(12, 2)`, `Nullable(DateTime)`, `UInt16`), engine choices (`MergeTree`), partitioning (`PARTITION BY toYYYYMM(...)`), and `SETTINGS index_granularity = 8192` are valid and idiomatic.
- Window function `lagInFrame(...) OVER (PARTITION BY ... ORDER BY ...)` is a supported pattern in ClickHouse.
