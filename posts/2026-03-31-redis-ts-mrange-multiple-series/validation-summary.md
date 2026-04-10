# Validation Summary: How to Use TS.MRANGE in Redis Time Series for Multiple Series

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisTimeSeries module
- TS.MRANGE command
- TS.RANGE, TS.MGET, TS.CREATE, TS.ADD, TS.CREATERULE (mentioned for comparison)

## Sources Consulted
- Official Redis documentation for TS.MRANGE: https://redis.io/docs/latest/commands/ts.mrange/
- Official Redis documentation for TS.RANGE: https://redis.io/docs/latest/commands/ts.range/

## Issues Found

### Issue 1: Invalid relative timestamps used throughout examples
- **What was wrong:** The post used `-3600000` and `-86400000` as `fromTimestamp` values, implying they are relative timestamps meaning "1 hour ago" and "24 hours ago" respectively. Redis Time Series does **not** support relative timestamps. Valid timestamp values are: `-` (earliest sample), `+` (latest sample), or an absolute Unix timestamp in milliseconds.
- **What was changed:** Replaced all occurrences of `-3600000` with `1711897200000` and `-86400000` with `1711814400000` (absolute Unix timestamps representing a concrete 1-hour and 24-hour window respectively). The mermaid diagram was simplified to use `- +`.
- **Why:** Using `-3600000` would either error or be interpreted as a negative Unix timestamp (before epoch), not as "1 hour ago." Clients must compute absolute timestamps before sending the command.
- **Affected sections:** With Aggregation, With Labels in Response, GROUPBY example, Filter by Value Range, Count Events example, Fleet-Wide Performance Dashboard, Multi-Region Latency Comparison, TS.MRANGE vs TS.RANGE, TS.MRANGE vs TS.MGET, and the mermaid diagram.

### Issue 2: Syntax block had GROUPBY before FILTER (incorrect order)
- **What was wrong:** The syntax reference showed `[GROUPBY label REDUCE reducer]` before `FILTER filter...`, but per official documentation, `FILTER` must come before `GROUPBY ... REDUCE`.
- **What was changed:** Swapped the order so `FILTER filter...` appears before `[GROUPBY label REDUCE reducer]` in the syntax block.
- **Why:** The official Redis documentation specifies that FILTER precedes GROUPBY. The actual command examples in the post already had the correct order — only the syntax reference was wrong.

### Issue 3: ALIGN shown as independent of AGGREGATION in syntax block
- **What was wrong:** `[ALIGN align]` was shown as a separate optional clause from `[AGGREGATION ...]`, but ALIGN is only valid when used with AGGREGATION and they share the same optional grouping.
- **What was changed:** Combined them into `[[ALIGN align] AGGREGATION aggregator bucketDuration [BUCKETTIMESTAMP bt] [EMPTY]]` to match the official syntax.
- **Why:** Using ALIGN without AGGREGATION is invalid. The nested bracket notation correctly shows ALIGN as an optional modifier within the AGGREGATION clause.

## Review Notes
- The actual command examples (as opposed to the syntax block) all had FILTER before GROUPBY — only the syntax reference was out of order.
- The basic TS.CREATE, TS.ADD, and TS.MRANGE examples with `-` and `+` timestamps are correct.
- The output format shown for the basic example is accurate.
- The FILTER syntax described (conjunctive label expressions) is correct.
- The TS.MRANGE vs TS.RANGE and TS.MRANGE vs TS.MGET comparisons are accurate.
- Performance considerations (fan-out, AGGREGATION for reducing data, GROUPBY computed server-side, TS.CREATERULE for downsampling) are all valid recommendations.
