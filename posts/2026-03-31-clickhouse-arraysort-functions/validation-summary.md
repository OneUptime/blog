# Validation Summary: How to Use arraySort() and arrayReverseSort() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse array functions: `arraySort`, `arrayReverseSort`, `arraySlice`, `arrayCompact`, `arrayZip`, `arrayEnumerate`, `arrayReverse`, `range`, `length`, `extractAll`, `toUInt32`
- Higher-order functions / lambda expressions in ClickHouse

## Sources Consulted
- ClickHouse official documentation for array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse documentation on `arraySort`: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arraysort
- ClickHouse documentation on `arrayReverseSort`: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayreversesort
- ClickHouse documentation on `arrayZip`, `arrayCompact`, `arraySlice`, `range`, `extractAll`

## Issues Found
No technical issues found.

All code examples were verified against ClickHouse documented behavior:

- `arraySort(arr)` returns the array sorted in ascending natural order — correct for numbers and lexicographic for strings.
- `arrayReverseSort(arr)` returns descending order — correct.
- Lambda form `arraySort(func, arr)` sorts by the lambda's return value — correct.
- Multi-array lambda form `arraySort((a, b) -> key, arr1, arr2)` sorts `arr1` based on key derived from both arrays — correct. The parallel-array sort example (span_names by durations) and the tag/count example both match ClickHouse's documented semantics.
- The claim that `arrayReverseSort(arr)` is "equivalent to `arrayReverse(arraySort(arr))`" is valid for the simple non-lambda scalar cases shown (integers and strings without NULL/NaN).
- `range(1, length(arr) + 1)` produces `[1, 2, ..., length(arr)]` because `range(start, end)` is end-exclusive in ClickHouse — correct for 1-based ClickHouse array indexing.
- Expected result arrays (e.g., `['fig', 'kiwi', 'apple', 'banana']` for length sort, `['sql', 'performance', 'clickhouse', 'arrays']` for frequency sort) were re-computed and match.
- `extractAll(v, '[0-9]+')[1]` correctly returns the first captured numeric substring (ClickHouse array indexing is 1-based), and `toUInt32` then converts it for numeric sorting.
- `arrayCompact(arraySort(arr))` correctly produces a sorted, fully deduplicated array because after sorting, all duplicates are consecutive.

## Review Notes
- The phrase "in-place array sorting" in the introduction is slightly imprecise terminology — the functions return new arrays and do not mutate the source. The post itself clarifies this in the next sentence ("Both functions return a new sorted array and leave the original unchanged"), so no correction is needed, but authors may want to prefer "per-row array sorting" or similar in future posts to avoid ambiguity.
- In the final example, `(pair) -> -pair.2` relies on negation to flip the sort order. If `span_durations_ms` is an unsigned integer (e.g., UInt32/UInt64), ClickHouse will promote the negated result to a signed integer. An equivalent and slightly cleaner approach would be `arrayReverseSort(pair -> pair.2, arrayZip(...))`. Both work correctly; this is a stylistic note, not a correctness issue.
- No version-specific caveats — the functions shown have been stable across recent ClickHouse releases.
