# Validation Summary: How to Use arrayCompact() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide for a ClickHouse SQL function

## Technologies Covered
- ClickHouse (SQL array functions)
- `arrayCompact`, `arrayMap`, `arrayJoin`, `length`
- `Memory` table engine, `Array(T)` column types

## Sources Consulted
- ClickHouse official docs — Array functions: https://clickhouse.com/docs/sql-reference/functions/array-functions#arraycompact
- ClickHouse local (version 26.4.1.1031) — executed every code example in the post to verify the stated results

## Issues Found

1. **State Stability section — inverted logic (technical error)**
   - The original code used `status_timeline = arrayCompact(status_timeline) AS is_stable`, with claimed results 0/1/0.
   - Actual behavior verified in ClickHouse: that comparison returns `1` only when the raw array has no consecutive duplicates (i.e., it changed constantly). For the sample data it produces 0/0/1 — the exact opposite of "stable."
   - A device where "all readings were identical" cannot satisfy `timeline = arrayCompact(timeline)` unless it only had one reading, because a raw array like `[0,0,0,...,0]` compacts to `[0]` and is not equal to itself.
   - **Fix:** Replaced the predicate with `length(arrayCompact(status_timeline)) = 1`, which matches the stated intent and now produces the claimed 0/1/0 results. Updated the lead-in sentence accordingly.

2. **"5 distinct state changes" comment — inaccurate**
   - The compacted array `[0,1,2,1,0]` contains 5 entries but only 4 transitions (and only 3 distinct values). Calling this "5 distinct state changes" is incorrect.
   - **Fix:** Changed the parenthetical to "5-entry transition sequence" so the number matches what it actually describes. The following query (`length(arrayCompact(...)) - 1`) already reports transitions correctly as 4/0/5.

## Review Notes

- All basic-usage examples (`[1,1,2,2,2,3,1,1]`, string arrays, already-compact, all-same, empty) were executed in ClickHouse local 26.4.1.1031 and returned exactly the results shown in the post. Note: `arrayCompact([])` works on a literal empty array because ClickHouse infers `Array(Nothing)` and the function is defined for it.
- The time-series `CREATE TABLE` / `INSERT` / `SELECT` examples run without errors and produce the commented outputs.
- The "Implementing Run-Length Encoding" section is honest about being a placeholder — the `arrayMap((v, i) -> v, ...)` example is syntactically valid and runs, but it returns the same as `arrayCompact(arr)` and doesn't actually compute run lengths. A future improvement could show a real RLE recipe (e.g., using `arrayCumSum`/`arrayDifference` on a change-indicator array). Not a technical error, just a weak example.
- The `ARRAY JOIN transitions AS status` example runs correctly and produces per-device counts of how many times each state appears in the compacted transition sequence.
- The contrast with `arrayDistinct` in the summary is accurate: `arrayDistinct` removes all duplicates regardless of position, while `arrayCompact` only collapses adjacent runs.
