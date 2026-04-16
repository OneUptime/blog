# Validation Summary: How to Use indexOf() Function for Arrays in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse Array functions (`indexOf`, `has`, `arrayElement`, `arrayFirstIndex`)
- MergeTree table engine

## Sources Consulted
- ClickHouse official docs — Array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official docs — `indexOf`: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#indexofarr-x
- ClickHouse official docs — `has`: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#hasarr-elem
- ClickHouse official docs — `arrayFirstIndex`: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayfirstindex
- ClickHouse official docs — `arrayElement`: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayelementarr-n-operator-arrn

## Issues Found
No technical issues found.

- `indexOf(arr, elem)` correctly described as returning a 1-based position of the first occurrence, and 0 when the element is absent.
- Example results verified:
  - `indexOf(['a','b','c','d'], 'c')` → 3 ✓
  - `indexOf(['a','b','c','d'], 'z')` → 0 ✓
  - `indexOf([10,20,30,40,50], 30)` → 3 ✓
  - `indexOf([1,2,3,2,1], 2)` → 2 (first match) ✓
  - `arrayFirstIndex(x -> x > 3, [1,2,3,4,5])` → 4 ✓
- `has()` correctly described as returning 0/1 for membership.
- `arrayElement(arr, indexOf(arr, 'B') + 1)` correctly yields the element after the first match.
- MergeTree `CREATE TABLE` / `INSERT` syntax is valid.
- `arrayFirstIndex(func, arr)` signature is correct.

## Review Notes
- The post notes that `arrayElement(arr, indexOf(arr, 'B') + 1)` returns the element after a match. One subtle caveat worth keeping in mind (not a correctness issue in the example shown): if `indexOf` returns 0 (not found) or if the match is the last element, `indexOf + 1` will point outside the array, and `arrayElement` returns the default value for the element type (e.g., empty string for `String`). Not worth adding in a basic tutorial, but future-you may want to mention it.
- The illustrative output table uses an ad-hoc text format rather than ClickHouse's actual Pretty/PrettyCompact/TSV output — acceptable for a blog post and clearly marked as `text`.
