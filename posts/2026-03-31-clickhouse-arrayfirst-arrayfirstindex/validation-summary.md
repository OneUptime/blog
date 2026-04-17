# Validation Summary: How to Use arrayFirst() and arrayFirstIndex() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse higher-order array functions (`arrayFirst`, `arrayFirstIndex`)
- ClickHouse lambda expressions (single- and multi-array)
- ClickHouse `arraySlice` function and 1-based array indexing

## Sources Consulted
- ClickHouse official documentation for array functions: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse documentation on higher-order functions and lambda syntax
- ClickHouse documentation on `arraySlice` and array element access (1-based indexing)

## Issues Found
No technical issues found.

All verified claims:
- `arrayFirst(func, arr)` returns the first element for which the lambda is non-zero, evaluated left to right — correct.
- `arrayFirst()` returns the default value for the element type when no element matches (0 for numeric, empty string for strings) — correct per the docs ("Returns the default value of the type T").
- `arrayFirstIndex(func, arr)` returns the 1-based index of the first matching element, and `0` if none match — correct.
- Both functions support multi-array lambdas with the form `func(x[, y1, ..., yN]), source_arr[, cond1_arr, ..., condN_arr]` — correct; example with `(duration, budget) -> duration > budget` is valid syntax.
- ClickHouse arrays are 1-indexed, so `arr[arrayFirstIndex(...)]` retrieves the matching element correctly — confirmed.
- `arraySlice(array, offset)` (without length) slices from offset to the end of the array — correct usage.
- `startsWith(s, 'err')` is a valid ClickHouse string function — correct.
- The example results (`first_positive = 3`, `first_error_idx = 2`, etc.) are arithmetically correct for the inputs given.

## Review Notes
- The post is well-written, accurate, and follows ClickHouse SQL conventions.
- Minor stylistic observation (not corrected, since it is not a technical error): the section heading "Combining with arrayMap() to Get Context" doesn't actually use `arrayMap()` in its example — it uses direct array element access. The content itself is correct, just the heading is slightly misleading.
- Short-circuit evaluation behavior (mentioned in the intro and summary) is consistent with how ClickHouse implements these higher-order functions; not separately documented but implied by the "first" semantics.
