# Validation Summary: How to Use TS.MREVRANGE in Redis Time Series

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.MREVRANGE command
- TS.MRANGE, TS.MGET (comparisons)

## Sources Consulted
- Official Redis TS.MREVRANGE documentation: https://redis.io/docs/latest/commands/ts.mrevrange/
- Official Redis TS.MRANGE documentation: https://redis.io/docs/latest/commands/ts.mrange/
- Official Redis TS.REVRANGE documentation: https://redis.io/docs/latest/commands/ts.revrange/
- Official Redis TS.RANGE documentation: https://redis.io/docs/latest/commands/ts.range/

## Issues Found

### 1. `fromTimestamp` and `toTimestamp` descriptions were swapped
- **What was wrong:** The blog described `fromTimestamp` as "end/upper time bound" and `toTimestamp` as "start/lower time bound." This is backwards.
- **What was changed:** Corrected to `fromTimestamp` = "start/lower time bound; use `-` for earliest" and `toTimestamp` = "end/upper time bound; use `+` for latest."
- **Why:** Per official docs, `fromTimestamp` is always the start/lower bound and `toTimestamp` is always the end/upper bound. The "reverse" in MREVRANGE refers to the order results are returned, not the parameter semantics.

### 2. All timestamp argument orderings were backwards (`+ -` instead of `- +`)
- **What was wrong:** Every example used `TS.MREVRANGE + -` or `TS.MREVRANGE + <timestamp>`, placing `+` (latest) as `fromTimestamp` and `-` (earliest) as `toTimestamp`.
- **What was changed:** All instances corrected to `TS.MREVRANGE - +` (from earliest to latest).
- **Why:** Official documentation and examples confirm the correct form is `TS.MREVRANGE - + ...`. The command returns results in reverse chronological order regardless of the timestamp parameter order.

### 3. Invalid relative timestamps (`-3600000`)
- **What was wrong:** Multiple examples used `-3600000` as a timestamp, apparently intending "now minus one hour." Redis Time Series does not support relative timestamps — only absolute Unix epoch milliseconds and the special `-`/`+` symbols are valid.
- **What was changed:** Replaced all `-3600000` occurrences with `+` (making full range `- +` queries) and updated surrounding descriptions to remove "last hour" claims where the command no longer expresses that constraint.
- **Why:** Per official docs, timestamp parameters accept only integer Unix timestamps in milliseconds, `-` (earliest sample), or `+` (latest sample). There is no relative timestamp syntax.

### 4. GROUPBY and FILTER order was wrong in syntax block
- **What was wrong:** The syntax block showed `[GROUPBY label REDUCE reducer]` before `FILTER filter...`.
- **What was changed:** Moved `FILTER filter...` before `[GROUPBY label REDUCE reducer]` to match the official syntax.
- **Why:** The official TS.MREVRANGE syntax requires the `FILTER` clause to appear before the optional `GROUPBY` clause.

### 5. Section heading mismatched example
- **What was wrong:** The heading "Last 5 Samples from Multiple Series" did not match the example which used `COUNT 2`.
- **What was changed:** Updated heading to "Last 2 Samples from Multiple Series."
- **Why:** The example only creates 2 data points per series and uses `COUNT 2`, so the heading should match.

## Review Notes
- The post's examples now all use `- +` (full range) since Redis Time Series lacks relative timestamp support. In real applications, users would compute absolute Unix timestamps client-side and pass them as `fromTimestamp`/`toTimestamp`. A future enhancement could add a note about this pattern.
- The TS.MRANGE comparison section (`TS.MRANGE - +` vs `TS.MREVRANGE - +`) now clearly shows the commands take the same arguments and differ only in result ordering, which is the correct and most useful teaching point.
- The output format shown in the first example is accurate and matches the official documentation's response format.
