# Validation Summary: How to Use NTH_VALUE() in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL window functions (NTH_VALUE, FIRST_VALUE, LAST_VALUE, ROW_NUMBER, count)
- ClickHouse table engines (MergeTree)
- ClickHouse types (UInt32, String, LowCardinality, DateTime, Date, Float64)

## Sources Consulted
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse docs on default frame semantics and NTH_VALUE return value for non-nullable columns

## Issues Found
1. **Incorrect default frame type**: The post claimed the default window frame is `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. According to ClickHouse docs, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` (RANGE, not ROWS). Fixed in the comment of the "Importance of Frame Specification" section.
2. **Incorrect NULL claim for non-nullable columns**: The post stated that `NTH_VALUE(score, 3)` "may return NULL for first two rows". For a non-nullable `UInt32` column, ClickHouse returns the column's default value (0) when the requested offset is not yet in the frame, not NULL. NULL is only returned for nullable columns. Updated the inline comments to reflect the correct behavior (returns 0 for UInt32).

## Review Notes
- The syntax for `NTH_VALUE`, `FIRST_VALUE`, `LAST_VALUE`, `ROW_NUMBER`, and `count()` window function usage is correct.
- The `WINDOW w AS (...)` named window syntax is supported in ClickHouse and correctly used.
- `intDiv` is the correct ClickHouse integer-division function.
- The "These are equivalent" comment in the FIRST_VALUE/LAST_VALUE comparison section is mildly ambiguous — only the first two (NTH_VALUE(..., 1) and FIRST_VALUE) are equivalent; the trailing LAST_VALUE example deliberately returns the last (i.e., minimum under DESC ordering). The intent is clarified by the inline comment, so no change was made.
- The quartile-boundary example is a reasonable illustrative use of NTH_VALUE, though in production ClickHouse users would typically prefer `quantile`/`quantiles` functions; this is a style note, not a correctness issue.
