# Validation Summary: How to Use arraySplit() and arrayReverseSplit() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- Higher-order array functions: `arraySplit`, `arrayReverseSplit`, `arrayDifference`, `arrayEnumerate`, `arrayMap`, `arrayReduce`
- ClickHouse `Memory` engine (used in example table)

## Sources Consulted
- ClickHouse official array functions reference: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse `arraySplit` docs (including the canonical `arraySplit((x, y) -> y, [1,2,3,4,5], [1,0,0,1,0])` example)
- ClickHouse `arrayReverseSplit` docs (canonical `[[1],[2,3,4],[5]]` example)
- ClickHouse `arrayDifference` docs (first element is 0, then adjacent differences)

## Issues Found
The post was built around a fundamental misconception about how the `arraySplit` / `arrayReverseSplit` lambda is invoked. Multiple examples would not execute, and several stated results were wrong. All were corrected.

1. **Incorrect claim that the lambda receives `(current, previous)` of a single array.**
   - Every `(cur, prev) -> ...` example with a single array argument (basic "runs" example, sessionizing, reverse split, per-session stats, last-session count) would have failed — the lambda receives one element from each *passed array* at the same index, not the current and previous element of one array.
   - Fixed by rewriting those examples to pass `arrayDifference(arr)` as a second array so the lambda becomes `(value, gap) -> ...` (for timestamps) or `(value, diff) -> ...` (for the ascending-runs example). Rewrote the explanatory notes accordingly.

2. **Incorrect output of the first Basic Usage example.**
   - `arraySplit(x -> (x % 2 = 0), [1, 3, 2, 4, 5, 7, 6])` actually returns `[[1,3],[2],[4,5,7],[6]]`, not the stated `[[1,3],[2],[4],[5,7],[6]]`. There is no trigger between `4` and `5` (the lambda returns 0 for `5`), so the extra split shown in the post was invalid. Corrected the result and the trace comment, and added the "first element never triggers" rule.

3. **Incorrect claim that the output is the split of the *last* array argument.**
   - Per the ClickHouse docs, `arraySplit` always returns sub-arrays of the **first** (source) array; additional arrays only provide values to the lambda. The "Splitting Pages Into Sessions Simultaneously" section depended on the wrong direction — it put `event_times` first and `event_pages` last and expected `event_pages` to be split. Reversed the argument order (page array first, gap array second) and fixed the explanatory note.

4. **`arrayReverseSplit` example used the bogus `(cur, prev) -> (cur > prev)` pattern.** Replaced with a valid single-array example mirroring the basic `arraySplit` example (`x -> (x % 2 = 0)`), with a correct trace and result (`[[1,3,2],[4],[5,7,6]]`) that demonstrates the "split to the right" / "last element never triggers" semantics.

5. **Function Signatures section missing first-element rule.** Added a note that the first element of the source array never triggers a split in `arraySplit` (last element in `arrayReverseSplit`).

6. **Summary paragraph overgeneralized.** Updated so the "triggering element is not discarded" wording correctly distinguishes between `arraySplit` (element begins new sub-array) and `arrayReverseSplit` (element ends its sub-array), and added the clarification about how the lambda receives elements across multiple arrays.

The chunking examples (both variants using `arrayEnumerate` / `range(1, 11)`) were already correct and were left as-is.

## Review Notes
- Kept the sessionizing narrative, the example data, the expected per-user results (user 1: 2 sessions × 3 events, durations 120/140 s; user 2: 2 sessions of 2/1 events, durations 300/0 s) — all of those numbers verify against the corrected queries.
- Style, tone, and section structure were preserved; changes were limited to correcting incorrect lambda shapes, expected outputs, and explanatory notes.
- `arrayDifference` returns signed values (return type is `Int*` per the docs). For the `UInt32 event_times` array, subtracting produces `Int64` differences, and comparing `gap > 1800` is safe. No cast was required.
