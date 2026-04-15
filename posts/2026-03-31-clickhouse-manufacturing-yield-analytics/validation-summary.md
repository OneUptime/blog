# Validation Summary: How to Analyze Manufacturing Yield Data in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions)
- Manufacturing yield metrics (First Pass Yield, Rolled Throughput Yield)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE and MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: Data types (UUID, LowCardinality, UInt8, UInt32, DateTime) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: Aggregate functions (sum, round) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: Functions (nullIf, today, toYYYYMM, toStartOfWeek, toDate, exp, log) — https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse documentation: Window functions (lag) — https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found
No technical issues found.

## Review Notes
- The RTY query uses `HAVING fpy_decimal > 0` to filter out zero-yield steps before taking logarithms. This is correct for avoiding `log(0)`, but it means steps with 0% yield are silently excluded from the RTY calculation rather than driving RTY to zero. This is a reasonable design choice but worth noting for readers who need strict RTY semantics.
- The `lag()` window function requires ClickHouse 21.x or later. The post does not specify a minimum version, which is fine since window functions have been stable in ClickHouse for several years.
- The `toStartOfWeek()` function defaults to mode 0 (week starts on Sunday). This is fine for trend analysis but readers in regions using ISO weeks (Monday start) may want to use mode 1.
- Division with `/` in ClickHouse returns Float64 even for integer operands, so the FPY percentage calculations are correct without explicit casting.
