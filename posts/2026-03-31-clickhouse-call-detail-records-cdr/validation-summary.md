# Validation Summary: How to Store and Analyze CDR (Call Detail Records) in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- CDR (Call Detail Records) domain concepts (IMSI, disconnect cause, call types)

## Sources Consulted
- ClickHouse Data Types documentation: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse Date/Time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions (toStartOfHour, toDate, today)
- ClickHouse Aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference (count, sum, avg, quantile)
- ClickHouse Window functions: https://clickhouse.com/docs/en/sql-reference/window-functions

## Issues Found
No technical issues found.

- Schema types (DateTime, UInt32, UInt16, String, LowCardinality(String), Float32, Date) are all valid ClickHouse types.
- `DEFAULT toDate(call_start)` is valid — `toDate()` accepts a DateTime argument.
- `PARTITION BY date` + `ORDER BY (caller_imsi, call_start)` is a reasonable MergeTree layout for subscriber-centric access patterns.
- `toStartOfHour()`, `today()`, `quantile(0.95)(expr)` parametric aggregate syntax, and `sum(count()) OVER ()` window function usage are all correct.
- Date arithmetic `today() - 7` / `today() - 30` is valid (Date minus integer yields a Date in ClickHouse).

## Review Notes
- Minor stylistic observations (not corrected, as they are not technical errors):
  - `ORDER BY (caller_imsi, call_start)` optimizes for single-subscriber lookups but is less efficient for time-range scans that are not subscriber-scoped; a `PRIMARY KEY` narrower than the full `ORDER BY` or an additional skipping index could help broad aggregate queries. This is a design tradeoff, not an error.
  - `Float32` for `charge_amount` is imprecise for billing; `Decimal(18, 4)` or similar is typically preferred in real telecom billing systems. The author's choice still compiles and runs correctly, so no change was made.
  - `quantile(0.95)` uses a reservoir sampling approximation; `quantileExact(0.95)` or `quantileTDigest` may be preferred depending on accuracy/perf tradeoffs. Again, not an error.
  - The percentage calculation `count() / sum(count()) OVER () * 100` is a valid and idiomatic ClickHouse pattern for computing per-group share.
