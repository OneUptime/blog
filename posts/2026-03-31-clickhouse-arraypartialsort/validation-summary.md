# Validation Summary: How to Use arrayPartialSort() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide for a ClickHouse array function.

## Technologies Covered
- ClickHouse (SQL / array functions)
- `arrayPartialSort` and related functions: `arraySort`, `arraySlice`, `arrayPartialReverseSort`
- Mermaid (for the conceptual diagram)

## Sources Consulted
- ClickHouse official docs — Array Functions: https://clickhouse.com/docs/sql-reference/functions/array-functions (sections `arrayPartialSort` and `arrayPartialReverseSort`)
- ClickHouse documentation examples for `arrayPartialSort`, including lambda forms `arrayPartialSort((x) -> -x, 2, [5, 9, 1, 3])` and `arrayPartialSort((x, y) -> -y, 1, [0, 1, 2], [1, 2, 3])`

## Issues Found
No technical issues found.

Notes verified during review:
- Argument order in the post (`arrayPartialSort(N, arr)` and `arrayPartialSort(func, N, arr)`) matches every example in the official ClickHouse docs, where the limit follows the optional lambda and precedes the array argument(s). The post's signature matches the actual usage shown by ClickHouse, even though the docs' formal "Signature" line is written differently — every doc example puts `limit` before the arrays.
- Behavior description is correct: the first `N` positions are guaranteed to be the smallest `N` values in ascending order; positions after `N` are in unspecified order. This matches the documented behavior.
- The `arrayPartialReverseSort` recommendation for the largest-N use case is correct.
- Edge-case outputs are presented as one valid permutation of the unspecified tail, which is appropriate given the documented "unspecified order" guarantee.
- Performance characterization (`O(n log k)` for partial sort vs. `O(n log n)` for full sort) reflects the underlying `std::partial_sort` algorithm.
- Lambda usage with tuple element access (`x -> x.1`) and with a scalar function (`t -> length(t)`) are valid ClickHouse lambda forms.

## Review Notes
- The post's claim that "`N` must be a positive integer no greater than the array length" is conservative. In current ClickHouse, passing a `limit` larger than the array size does not error — it effectively performs a full sort. The advice in the post is reasonable for users and is not technically wrong (just stricter than the implementation requires); left unchanged.
- The "Basic Usage" example output `[1,2,3,5,9,8,7]` is one valid permutation but not necessarily what a particular ClickHouse build will return for the unsorted tail. The post explicitly notes this immediately afterwards ("the rest are unordered"), so it is not misleading.
- No version-specific caveats: `arrayPartialSort` has been part of ClickHouse for a long time and the signature/behavior described applies to current releases.
