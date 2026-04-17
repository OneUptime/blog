# Validation Summary: How to Use the -Resample Aggregate Combinator in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse aggregate function combinators (`-Resample`)
- ClickHouse SQL (MergeTree, DateTime, UInt32, array functions)

## Sources Consulted
- ClickHouse official documentation: Combinators — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators (specifically `-Resample`)
- ClickHouse official documentation: `count`, `sum`, `avg`, `groupArray` aggregate functions
- ClickHouse official documentation: `toUnixTimestamp`, `toDateTime`, `range`, `arrayMap`, `arrayMax`, `indexOf`
- ClickHouse `MergeTree` engine reference

## Issues Found
1. **Incorrect output for `countResample(30, 100, 10)(score, score)` example.** The post claimed `[1, 2, 1, 2, 1, 2, 3]` but recounting the inserted scores (45, 62, 78, 55, 90, 33, 71, 88, 47, 66, 95, 82) against buckets [30,40)…[90,100) produces 1+2+1+2+2+2+2 = 12 (matches the 12 inserted rows). The original sum (1+2+1+2+1+2+3 = 12) coincidentally summed correctly but bucket 4 (70-80) and bucket 6 (90-100) were wrong (78 and 71 fall in [70,80) → 2; 90 and 95 fall in [90,100) → 2). Corrected to `[1, 2, 1, 2, 2, 2, 2]`.

2. **Incorrect 200-status row in the GROUP BY example.** The post showed 200 → `[2, 3, 2, 1]` (sum 8) but only 7 rows have status_code 200 in the inserted data (ids 1, 2, 4, 5, 7, 8, 10). Per-minute counts are bucket 0=2 (ids 1, 2), bucket 1=2 (ids 4, 5), bucket 2=2 (ids 7, 8), bucket 3=1 (id 10). Corrected to `[2, 2, 2, 1]`. The 404 and 500 rows were already correct.

3. **Truncated `bucket_starts` array output.** The displayed result showed only the first element with the full date prefix and the rest without (`['2026-03-31 10:00:00','10:01:00',...]`). ClickHouse formats every `DateTime` element with the full `YYYY-MM-DD HH:MM:SS` representation, so the array was expanded to show the actual format.

## Review Notes
- The `-Resample` combinator syntax `<aggFunction>Resample(start, end, step)(<aggFunction_params>, resampling_key)` is correctly described, matching the ClickHouse documentation.
- The use of `countResample(...)(score, score)` is valid: `count(score)` counts non-null values of `score`, and since `score` is `UInt8 NOT NULL`, this is equivalent to counting all rows in each bucket.
- The displayed `avg` outputs (`435.666`, `37.666`, etc.) are intentionally truncated for readability; ClickHouse normally returns full `Float64` precision (e.g., `435.6666666666667`). This is a stylistic choice and not a technical error.
- The `range(1, 5)` + `(i - 1) * 60` pattern in the bucket-labels example works but `range(0, 4)` + `i * 60` would be slightly more idiomatic. Left as-is per "do not make stylistic changes" guidance.
- `toUnixTimestamp('YYYY-MM-DD HH:MM:SS')` interprets the string in the server's timezone. Readers may want to use `toUnixTimestamp(parseDateTimeBestEffort('...', 'UTC'))` or set the session timezone explicitly for reproducible results across deployments. Worth a future caveat but not a correctness bug for the demonstration.
