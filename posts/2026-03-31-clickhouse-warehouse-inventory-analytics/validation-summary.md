# Validation Summary: How to Build Warehouse Inventory Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, window functions, aggregate combinators)
- SQL (DDL, analytical queries, window functions)
- Warehouse/inventory domain concepts (on-hand quantity, turnover rate, dead stock, reorder points)

## Sources Consulted
- ClickHouse Decimal Types documentation: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse Date-Time Functions documentation: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse Custom Partitioning Key documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse HAVING Clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/having
- ClickHouse Syntax (Aliases) documentation: https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse Aggregate Function Combinators documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/sql-reference/window-functions

## Issues Found
- **Dead Stock description mismatch**: The description said "Find SKUs with no outbound movement in 90 days" but the query checks `max(event_at)` across all event types (not just outbound/pick events), so it actually finds SKUs with no movement of any kind in 90 days. Changed the description to "Find SKUs with no movement in 90 days" to accurately reflect the query behavior.

## Review Notes
- All ClickHouse-specific syntax is correct: `Decimal64(2)`, `toYYYYMM()`, `LowCardinality(String)`, `sumIf()` combinator, and window function `OVER (PARTITION BY ... ORDER BY ...)`.
- ClickHouse's ability to reference column aliases in HAVING clauses and within the same SELECT list is used throughout and is valid per ClickHouse documentation.
- The `today() - N` integer subtraction for date arithmetic is valid in ClickHouse.
- The Reorder Point Alert query uses a hardcoded `safety_stock_threshold` of 50 with a comment noting it should be per-SKU in production, which is appropriate for a tutorial.
- The Inventory Turnover Rate query uses a window function to compute running on-hand quantities, then averages them -- this is a reasonable approximation of average inventory for turnover calculation.
