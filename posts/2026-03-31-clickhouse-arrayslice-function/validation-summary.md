# Validation Summary: How to Use arraySlice() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (array functions)
- SQL
- `arraySlice` function
- `arrayReduce` function
- `ARRAY JOIN` clause

## Sources Consulted
- ClickHouse official documentation: Array Functions — https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayslice
- ClickHouse official documentation: `arrayReduce` — https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayreduce
- ClickHouse official documentation: `ARRAY JOIN` clause — https://clickhouse.com/docs/en/sql-reference/statements/select/array-join

## Issues Found

1. **Text/code mismatch in "Sliding Window Analysis" section**: The prose said "to build a moving average" but the code computed sums via `arrayReduce('sum', ...)`. Changed wording from "moving average" to "moving sum" to match the actual code.

## Review Notes

- The function signature `arraySlice(arr, offset [, length])` is accurate per ClickHouse docs.
- 1-based positive offsets, negative offsets counting from the end, and empty-array behavior for out-of-range positive offsets are all correctly described.
- Example outputs were spot-checked and match ClickHouse behavior:
  - `arraySlice([10,20,30,40,50], 2, 3)` → `[20,30,40]` ✓
  - `arraySlice([10,20,30,40,50], -3)` → `[30,40,50]` ✓
  - `arraySlice([1,2,3], 10)` → `[]` ✓
  - Negative offset with |offset| > length returns the whole array (e.g., user 2 with `[2001, 2002]` and `-3` returns `[2001, 2002]`) ✓
- The pagination offset formula `(page_number - 1) * page_size + 1` is correct for 1-based indexing.
- `arrayReduce('sum', ...)` syntax and `ARRAY JOIN ... AS alias` syntax are both valid ClickHouse.
- `Memory` table engine is valid for the demo tables.
- The "drop last element" example uses `length(arr) - 1` as the length parameter, which is functionally equivalent to `arrayPopBack` as noted — correct.
- No deprecated APIs or version-specific caveats observed; `arraySlice` has been stable in ClickHouse for many versions.
