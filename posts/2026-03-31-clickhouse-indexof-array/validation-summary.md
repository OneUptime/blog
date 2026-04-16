# Validation Summary: How to Use indexOf() for Array Search in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- ClickHouse array functions: `indexOf()`, `arrayFirstIndex()`, `arraySlice()`, `has()`
- ClickHouse CTE / `WITH` clause syntax

## Sources Consulted
- ClickHouse official docs: Array Functions — https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse `indexOf` reference — https://clickhouse.com/docs/en/sql-reference/functions/array-functions#indexofarr-x
- ClickHouse `arrayFirstIndex` reference — https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayfirstindex
- ClickHouse `arraySlice` reference — https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayslice
- ClickHouse `WITH` clause / CTE docs — https://clickhouse.com/docs/en/sql-reference/statements/select/with

## Issues Found
No technical issues found.

Verified claims:
- `indexOf(arr, elem)` returns the 1-based index of the first occurrence, or `0` when absent — matches docs.
- `arrayFirstIndex` requires a lambda (higher-order form), so the comparison with `indexOf()` being simpler for exact-value lookups is accurate.
- Array indexing `metric_values[indexOf(metric_names, 'cpu_idle')]` is valid; arrays in ClickHouse are 1-indexed, and index `0` is invalid — the `WHERE indexOf(...) > 0` guard correctly prevents this.
- `arraySlice(array, offset, length)` signature and semantics are correct; the guard `indexOf(...) > 1` prevents a negative/zero length when the error would be at position 1.
- `WITH ['critical', 'high', 'medium', 'low', 'info'] AS severity_order` is valid ClickHouse CTE syntax (scalar/array aliasing).
- `BETWEEN 1 AND 3` is inclusive, matching the stated "first three steps" semantics.
- Example result values in "Basic Usage" (3, 0, 1) are correct.

## Review Notes
- The post's guard `WHERE indexOf(event_sequence, 'error') > 1` in the `arraySlice()` example excludes sessions where the error is the very first event; this is intentional (to avoid `length = 0`) and acceptable, though a reader wanting to include those sessions would need `>= 1` with a separate handling for empty slice. Not an error — worth noting.
- `indexOf()` performs a full linear scan of the array; for very large arrays or high-throughput workloads a `has()` check can be marginally cheaper when position is not needed. The post implicitly covers this by mentioning it doubles as a presence test; no change required.
