# Validation Summary: How to Use arrayPushBack() and arrayPushFront() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse Array Functions (arrayPushBack, arrayPushFront, arraySlice, arrayDifference, arrayStringConcat)
- ClickHouse MergeTree engine
- ClickHouse ALTER TABLE ... UPDATE mutations
- SQL

## Sources Consulted
- Official ClickHouse documentation on array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse docs for arrayPushBack: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arraypushback
- ClickHouse docs for arrayPushFront: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arraypushfront
- ClickHouse docs for arraySlice: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayslice
- ClickHouse docs for arrayDifference: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arraydifference
- ClickHouse docs for arrayStringConcat: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arraystringconcat
- ClickHouse docs on ALTER UPDATE: https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse docs on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
No technical issues found.

Verification details:
- `arrayPushBack(arr, elem)` and `arrayPushFront(arr, elem)` signatures are correct — they accept an array and a single value and return a new array.
- Function behavior and example results (e.g., `arrayPushBack([1,2,3], 4)` → `[1,2,3,4]`, `arrayPushFront([1,2,3], 0)` → `[0,1,2,3]`) are correct.
- Chaining example results are correct.
- `arraySlice(arr, -10)` correctly returns the last 10 elements when used with a negative offset.
- `arrayDifference([0, 10, 25, 40, 55])` correctly returns `[0, 10, 15, 15, 15]` — the first element is always 0 per the docs, and subsequent elements are `a[i] - a[i-1]`.
- `arrayStringConcat(['usr','local','bin','clickhouse'], '/')` correctly produces `'usr/local/bin/clickhouse'`.
- ClickHouse arrays use 1-based indexing; `page_visits[1]` returning the first (most-recent-after-prepend) element is correct.
- `ALTER TABLE ... UPDATE col = expr WHERE ...` syntax for MergeTree mutations is valid.
- CREATE TABLE with `ENGINE = MergeTree() ORDER BY ...` and multi-row `INSERT INTO ... VALUES` syntax are both correct.

## Review Notes
- The post correctly frames ClickHouse arrays as immutable — mutations via `ALTER UPDATE` rewrite parts in the background rather than performing in-place updates. This is an important caveat for readers who may be tempted to use `arrayPushBack` in `ALTER UPDATE` as a frequent operation; mutations are heavy operations and not suitable for high-frequency event ingestion. The post does not explicitly warn about mutation cost, but that is beyond the scope of the function reference.
- Pushing onto an empty array literal `[]` (type `Array(Nothing)`) works as shown; ClickHouse infers the result type from the pushed element.
- All code examples are self-consistent and would execute correctly on a recent ClickHouse version.
