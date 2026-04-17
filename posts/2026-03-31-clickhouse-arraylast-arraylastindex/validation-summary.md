# Validation Summary: How to Use arrayLast() and arrayLastIndex() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL higher-order array functions (`arrayLast`, `arrayLastIndex`, `arrayFirst`, `arrayFirstIndex`, `arraySlice`, `has`, `length`)
- Lambda expressions in ClickHouse SQL

## Sources Consulted
- ClickHouse official array functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/array-functions (entries for `arrayLast`, `arrayLastIndex`, `arraySlice`)

## Issues Found
- **Incorrect version claim.** The post stated: "Both functions are available from ClickHouse 21.9+." According to the official ClickHouse documentation, both `arrayLast` and `arrayLastIndex` were introduced in v1.1.0, not 21.9. Fixed by changing the sentence to: "Both functions have been available since ClickHouse v1.1.0."

## Review Notes
- All code examples are syntactically valid ClickHouse SQL. The expected output in the "Basic Usage" and "Difference Between arrayFirst and arrayLast" sections matches the documented behavior (right-to-left scan, 1-based indexing, `0` for no match on the index, type default for no match on the value).
- The `arraySlice(events, arrayLastIndex(...))` pattern correctly leverages the documented behavior: when `arraySlice` is called with only `(arr, offset)` it returns the suffix from `offset` to the end of the array, which matches the "events after last checkout" semantics described.
- The claim that `arrayLastIndex` returns a 1-based index is consistent with ClickHouse docs (it returns a `UInt32` index, with 1-based indexing as is standard for ClickHouse array functions).
- The null-safe pattern using `r IS NOT NULL` inside the lambda is valid — ClickHouse accepts `IS NOT NULL` inside higher-order function lambdas.
- No other technical inaccuracies were found.
