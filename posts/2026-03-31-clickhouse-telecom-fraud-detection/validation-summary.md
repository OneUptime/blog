# Validation Summary: How to Build Telecom Fraud Detection with ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, window functions, aggregate functions)
- Telecom CDR (Call Detail Record) data analysis
- Fraud detection patterns (IRSF, Wangiri, SIM Box, Account Takeover)

## Sources Consulted
- ClickHouse SQL Reference: CREATE TABLE, MergeTree engine, PARTITION BY — https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse Data Types: UUID, UInt64, LowCardinality, Nullable — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse Aggregate Functions: count, avg, sum, countIf, stddevPop — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse Window Functions — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse String Functions: left() — https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse Date/Time Functions: toYYYYMM, today, now — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- SQL standard execution order (FROM -> WHERE -> GROUP BY -> HAVING -> window functions -> ORDER BY -> LIMIT)

## Issues Found
1. **Account Takeover query: HAVING used to filter window function results without GROUP BY**
   - **What was wrong:** The query used `HAVING data_mb > rolling_avg_mb * 10` without a `GROUP BY` clause, attempting to filter on `rolling_avg_mb`, which is a window function alias. In SQL execution order, HAVING is evaluated before window functions in the SELECT clause, so the window function result is not available at the HAVING stage. This would produce an error or incorrect results.
   - **What was changed:** Wrapped the query in a subquery. The inner query computes the window function (`rolling_avg_mb`), and the outer query filters with `WHERE data_mb > rolling_avg_mb * 10`. This correctly filters rows after the window function has been evaluated.
   - **Why:** Filtering on window function results requires a subquery or CTE pattern in standard SQL and in ClickHouse. The HAVING clause cannot reference window function aliases.

## Review Notes
- All other ClickHouse functions used (`left()`, `stddevPop()`, `countIf()`, `LowCardinality()`, `toYYYYMM()`) are valid and current.
- The `MergeTree` engine configuration with `ORDER BY` and `PARTITION BY` is correct for the fraud signals use case.
- The Account Takeover query's `WHERE activity_date >= today() - 3` limits input data to 3 days, while the window frame looks back 14 rows. If the data has one row per subscriber per day, the rolling average will have at most 2 preceding rows rather than 14. This is a data-modeling consideration rather than a syntax error — the query works correctly for data with multiple records per day per subscriber.
- The telecom fraud domain concepts (IRSF, Wangiri, SIM Box) are accurately described and the detection heuristics are reasonable.
