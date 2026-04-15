# Validation Summary: How to Analyze Trading Bot Performance with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, parametric aggregate functions)
- SQL window functions (cumulative sums, running max)
- ClickHouse-specific functions: `countIf`, `sumIf`, `quantile`, `toHour`, `toYYYYMM`, `nullIf`, `LowCardinality`, `DateTime64`

## Sources Consulted
- ClickHouse documentation on window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation on aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation on data types (LowCardinality, Nullable, DateTime64, UUID): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation on MergeTree engine and partitioning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on parametric aggregate functions (quantile): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions
- SQL standard on window function nesting restrictions

## Issues Found

### 1. Nested window functions in Cumulative PnL and Drawdown query (Fixed)
**What was wrong:** The query used `max(sum(pnl) OVER (...)) OVER (...)` — a window function nested inside another window function. This is not valid SQL in ClickHouse or any standard SQL database. Window functions cannot be used as arguments to other window functions within the same query level.

**What was changed:** Rewrote the query to use a subquery. The inner query computes `cumulative_pnl` via `sum(pnl) OVER (...)`, and the outer query references that column in `max(cumulative_pnl) OVER (...)` to compute the running peak and drawdown. This produces the same logical result with valid SQL.

## Review Notes
- The "Execution Quality - Slippage Analysis" section describes measuring "slippage between expected and actual fill prices," but the query actually calculates the percentage difference between `entry_price` and `exit_price`. True slippage analysis would require an `expected_price` column to compare against the actual fill price. The schema does not include such a field, so the query measures price movement between entry and exit rather than execution slippage. This is a domain-level conceptual mismatch rather than a SQL error.
- All other queries are syntactically correct and use idiomatic ClickHouse SQL. The use of `countIf`/`sumIf` (ClickHouse-specific aggregate combinators), `quantile(0.95)(...)` (parametric syntax), `nullIf` for division-by-zero protection, and `LowCardinality(String)` for low-cardinality columns are all correct and follow best practices.
- ClickHouse's `/` operator returns `Float64` even for integer operands, so the win rate calculation `countIf(...) / count() * 100` works correctly without explicit casting.
