# Validation Summary: How to Use Interval Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse `Interval` data type
- ClickHouse `Date`, `Date32`, `DateTime`, `DateTime64` types
- ClickHouse TTL expressions
- `toIntervalX()` function family

## Sources Consulted
- ClickHouse official documentation - Interval data type: https://clickhouse.com/docs/sql-reference/data-types/special-data-types/interval
- ClickHouse official documentation - Operators (INTERVAL): https://clickhouse.com/docs/sql-reference/operators
- ClickHouse official documentation - Type conversion functions (toIntervalX): https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions
- ClickHouse official documentation - Date and time functions (now, now64, today): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse official documentation - MergeTree TTL: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found
No technical issues found.

All verified items:
- The list of interval units (Nanosecond through Year, including Quarter) matches ClickHouse's supported `IntervalKind` values.
- The mapping between `INTERVAL N UNIT` literals and `toIntervalX(N)` functions is correct.
- `today()`, `now()`, and `now64(9)` are valid ClickHouse functions with the described behavior.
- `toTypeName(INTERVAL 1 DAY)` returning `IntervalDay` (and similar for Month/Hour/Year) is correct.
- The restriction that different interval units (e.g., `IntervalDay` + `IntervalMonth`) cannot be combined into a single value — but can be chained via repeated `+` on a Date/DateTime — is accurate.
- TTL syntax with `INTERVAL` and `TO DISK 'disk_name'` / `DELETE` actions matches the MergeTree TTL documentation.
- Sub-second intervals (Nanosecond, Microsecond, Millisecond) requiring `DateTime64` is accurate.
- `arrayJoin(range(0, 12))` and the dynamic interval examples are syntactically valid.

## Review Notes
- The post states nanosecond/microsecond/millisecond intervals are "DateTime64 only". Strictly this means they require sub-second precision on the receiving type; this is correctly conveyed.
- The claim that ClickHouse "does not support directly adding multiple interval types together in a single expression" is accurate — each `Interval*` kind is its own distinct type, and they can only be combined by sequentially applying them to a Date/DateTime value.
- The examples use 2026 dates which align with current/future timeframes at review time (2026-04-16); no outdated version-specific caveats noted.
