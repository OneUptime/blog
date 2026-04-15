# Validation Summary: How to Translate SQL Server Queries to ClickHouse SQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (columnar OLAP database)
- SQL Server (OLTP database)
- SQL query translation and migration patterns

## Sources Consulted
- ClickHouse official docs: date-time functions (`dateDiff`, `addDays`) - https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official docs: string functions (`length`, `lengthUTF8`, `substring`) - https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse official docs: string search functions (`position`) - https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse official docs: functions for nulls (`ifNull`) - https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse official docs: WITH clause / CTEs - https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse official docs: data types - https://clickhouse.com/docs/en/sql-reference/data-types
- SQL Server official docs: LEN function, CHARINDEX, DATEADD, DATEDIFF, ISNULL

## Issues Found

### 1. `length()` should be `lengthUTF8()` for SQL Server `LEN()` equivalence
- **What was wrong:** The post mapped SQL Server's `LEN(name)` to ClickHouse's `length(name)`. However, `LEN()` counts characters while ClickHouse's `length()` counts bytes. For multi-byte UTF-8 strings, these return different results.
- **What was changed:** Replaced `length(name)` with `lengthUTF8(name)`, which correctly counts Unicode code points and matches SQL Server's `LEN()` behavior.
- **Why:** A migration guide must map to functionally equivalent operations. Silent differences in return values for Unicode data would cause hard-to-diagnose bugs.

### 2. Recursive CTE version was incorrect (v23.3 -> v24.3)
- **What was wrong:** The post stated ClickHouse supports recursive CTEs "from v23.3 onward." The actual version is v24.3, which introduced the new query analyzer that enables recursive CTE support.
- **What was changed:** Updated "v23.3" to "v24.3" and added a note that it requires the new query analyzer.
- **Why:** Incorrect version information would mislead users running v23.x into thinking they have recursive CTE support when they don't.

### 3. CTE example incorrectly labeled "Works in both"
- **What was wrong:** The CTE example was commented "Works in both (non-recursive)" but used ClickHouse-specific syntax: `toStartOfMonth()` (not a SQL Server function) and `count()` without arguments (SQL Server requires `COUNT(*)`).
- **What was changed:** Split the example into separate SQL Server and ClickHouse versions, consistent with all other sections in the post. The SQL Server version uses `DATETRUNC(MONTH, ...)` and `COUNT(*)`.
- **Why:** The original example would cause a syntax error if run on SQL Server, contradicting the "works in both" comment.

## Review Notes
- The `DATETRUNC` function used in the corrected SQL Server CTE example requires SQL Server 2022 or later. Earlier versions would need `DATEFROMPARTS(YEAR(event_time), MONTH(event_time), 1)` instead.
- The data type mapping of `DATETIME2` to `DateTime64(3)` is reasonable (millisecond precision), but `DATETIME2` supports up to 7 fractional digits. Users needing full precision should use `DateTime64(6)` or `DateTime64(7)`.
- ClickHouse recursive CTE support was promoted to production status in v24.8 when `allow_experimental_analyzer` was renamed to `enable_analyzer`. Users on v24.3-v24.7 may need to enable the experimental analyzer setting.
- The `substring()` mapping is correct, but note that ClickHouse also provides `substringUTF8()` for proper multi-byte character handling, consistent with the `lengthUTF8` recommendation.
