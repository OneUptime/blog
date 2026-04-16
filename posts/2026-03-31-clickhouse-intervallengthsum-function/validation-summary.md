# Validation Summary: How to Use intervalLengthSum() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- ClickHouse `intervalLengthSum()` aggregate function
- ClickHouse data types: `DateTime`, `DateTime64`, `Date`, `Float64`, `UInt32`
- MergeTree table engine

## Sources Consulted
- ClickHouse official docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/intervalLengthSum
- ClickHouse data types reference: https://clickhouse.com/docs/sql-reference/data-types

## Issues Found
1. **Simple-example output incorrect.** The first example showed `union_length = 4500` but the actual union of intervals (10:00-10:30, 10:15-10:45, 11:00-11:20) is 65 minutes = 3900 seconds. The narrative also contained an awkward "Wait — let me recalculate" passage that betrayed an LLM-generated artifact. Fixed the result to `3900` and rewrote the explanation cleanly.
2. **User 1 active-time row wrong in "Computing Total Active Time per User".** Output showed `active_seconds=5400, active_minutes=90` for user 1, but the correct union is a1∪a2 (09:00-09:50 = 50 min) + a3 (10:30-11:00 = 30 min) = 80 min = 4800 seconds. Fixed to `4800 / 80`.
3. **User 1 naive value wrong in "Comparing intervalLengthSum() to Naive Sum".** Output showed `naive_minutes=110` but the naive sum (30+30+30) is 90 minutes. Fixed to `90`.
4. **Overcount text wrong.** The text claimed user 1 "overcounts by 30 minutes" — actual overcount is 10 min (overlap a1∩a2 = 09:20-09:30). Corrected to "10 minutes".

## Review Notes
- ClickHouse's official reference page does not formally document `DateTime64` as an accepted argument type, though it is widely used in practice and the post's example will work. Considered acceptable since the function operates on the underlying integer representation. Worth flagging if ClickHouse ever changes behavior.
- Interval boundary semantics (`[begin, end)` vs `[begin, end]`) are not explicitly specified in the official docs. For continuous-time numeric/datetime inputs the distinction has zero measure and does not affect any of the calculations in the post, so the claim is harmless.
- User 2 and user 3 calculations (90 min and 70 min) and the video-streaming example (120s rewatched-aware vs 135s naive) are mathematically correct.
- The DateTime64 example does not show output, which sidesteps the undocumented-type concern.
