# Validation Summary: How to Use hasAny() and hasSubstr() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (array functions: `hasAny`, `hasSubstr`, `has`, `hasAll`, `arrayIntersect`)
- SQL

## Sources Consulted
- ClickHouse official documentation — Array Functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
  - `hasAny(array1, array2)` — returns 1 if arrays share at least one common element.
  - `hasSubstr(array1, array2)` — returns 1 if array2 appears as a contiguous, order-preserving subsequence of array1 (i.e., `array1 = prefix + array2 + suffix`).
  - `has(arr, elem)` and `hasAll(array1, array2)` for the comparative notes.
  - `arrayIntersect(arr1, arr2, ...)` — returns an array of elements common to all input arrays.

## Issues Found
No technical issues found.

All function semantics are described accurately:
- `hasAny(['a','b','c'], ['b','d','e']) = 1` and `hasAny(['a','b','c'], ['x','y','z']) = 0` — correct.
- `hasSubstr([1,2,3,4,5], [2,3]) = 1` (contiguous) and `hasSubstr([1,2,3,4,5], [2,4]) = 0` (non-contiguous) — correct.
- The distinction between `hasSubstr()` (contiguous, ordered) vs. `hasAll()` (set membership, unordered) is accurate.
- The comparison between `hasAny()` and chained `has() OR has()` is correct and idiomatic.
- Usage of `arrayIntersect()` alongside `hasAny()` is a valid pattern.
- SQL syntax in all examples is valid ClickHouse SQL.

## Review Notes
- The subquery pattern in the multi-tenant permission check example (`hasAny(required_roles, (SELECT granted_roles FROM users WHERE user_id = 42))`) works in ClickHouse as a scalar subquery when it returns a single row with an Array column. Users should ensure the subquery returns exactly one row, otherwise the query will error.
- `hasSubstr` requires that the needle array appear as a literal contiguous slice; it is not a fuzzy or gapped subsequence match. The post states this correctly but it is worth remembering when comparing to regex-style patterns.
- No version-specific caveats: both `hasAny` and `hasSubstr` have been stable in ClickHouse for many major versions.
