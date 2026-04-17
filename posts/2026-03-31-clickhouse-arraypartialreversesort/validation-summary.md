# Validation Summary: How to Use arrayPartialReverseSort() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL array functions: `arrayPartialReverseSort`, `arrayPartialSort`, `arrayReverseSort`, `arraySort`, `arraySlice`, `arraySum`, `arrayMax`, `length`
- ClickHouse higher-order lambda functions

## Sources Consulted
- ClickHouse official documentation: Array Functions (https://clickhouse.com/docs/en/sql-reference/functions/array-functions)
- ClickHouse documentation on `arrayPartialSort` / `arrayPartialReverseSort` (including signatures `([func,] limit, arr, ...)`)
- ClickHouse documentation on higher-order lambda syntax (`x -> expr`)
- Companion post in the same repository: `posts/2026-03-31-clickhouse-arraypartialsort/README.md` (for consistency of claims)

## Issues Found
No technical issues found.

- The function signatures `arrayPartialReverseSort(N, arr)` and `arrayPartialReverseSort(func, N, arr)` match the official ClickHouse signatures `arrayPartialReverseSort([func,] limit, arr, ...)`.
- The behavioral description (first `N` elements are the largest `N` in descending order; remaining elements in unspecified order) matches documented behavior.
- The lambda syntax `t -> length(t)` is valid ClickHouse higher-order function syntax.
- All SQL examples are syntactically correct and use existing ClickHouse functions (`arraySlice`, `arraySum`, `arrayMax`, `arrayReverseSort`).
- The complexity claim of O(n log N) vs O(n log n) for a full sort is a standard and correct characterization of partial sort implementations (heap-based selection).
- The basic example output `[9,8,7,1,2,3,5]` correctly demonstrates that the first 3 positions contain the 3 largest values in descending order while the tail is in unspecified order.

## Review Notes
- The post states that `N` must be a positive integer no greater than the array length. In practice, ClickHouse tolerates `N` equal to the array length (equivalent to a full reverse sort); specifying `N` greater than the array length is undefined/unsupported, so the guidance is reasonable and matches the companion `arrayPartialSort` post.
- The unspecified tail ordering means users should always combine `arrayPartialReverseSort` with `arraySlice(..., 1, N)` (as the post recommends) when exposing the result, since the tail may look sorted in some cases but is not guaranteed to be.
- The post is consistent with the companion `arrayPartialSort` post in terminology and structure.
