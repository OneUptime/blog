# Validation Summary: How to Use toStartOfMinute() and toStartOfFiveMinutes() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- `toStartOfMinute()` and `toStartOfFiveMinutes()` date/time truncation functions
- ClickHouse aggregate functions: `countIf()`, `quantile()`, `argMin()`, `argMax()`, `stddevPop()`
- ClickHouse `WITH FILL` gap-filling syntax
- ClickHouse window functions (`OVER ()`)
- `UNION ALL` queries

## Sources Consulted
- ClickHouse documentation: toStartOfMinute — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofminute
- ClickHouse documentation: toStartOfFiveMinutes — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartoffiveminutes
- ClickHouse documentation: argMin / argMax — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmin
- ClickHouse documentation: quantile — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse documentation: ORDER BY WITH FILL — https://clickhouse.com/docs/en/sql-reference/statements/select/order-by#order-by-expr-with-fill-modifier
- ClickHouse documentation: Window Functions — https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found
No technical issues found.

## Review Notes
- All SQL examples use correct ClickHouse syntax and appropriate functions.
- The `toStartOfMinute()` and `toStartOfFiveMinutes()` example outputs are verified correct (floor/truncation behavior).
- The OHLC candlestick pattern using `argMin(price, trade_time)` for open and `argMax(price, trade_time)` for close is a well-established ClickHouse idiom and is correctly applied.
- The spike detection query correctly uses `stddevPop()` as a window function with `OVER ()`, which ClickHouse supports.
- The `WITH FILL` examples correctly use `FROM`, `TO`, and `STEP` clauses with matching interval granularity.
- The boolean expression in `is_spike` will produce a `UInt8` column (0 or 1) in ClickHouse rather than a literal boolean, which is standard ClickHouse behavior.
