# Validation Summary: How to Use TS.QUERYINDEX in Redis Time Series to Find Series

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis
- Redis Time Series (RedisTimeSeries module)
- TS.QUERYINDEX command
- TS.MRANGE, TS.MGET, TS.CREATE commands (supporting examples)

## Sources Consulted
- Official Redis documentation for TS.QUERYINDEX: https://redis.io/docs/latest/commands/ts.queryindex/
- Official Redis documentation for TS.MRANGE: https://redis.io/docs/latest/commands/ts.mrange/
- Official Redis documentation for TS.MGET: https://redis.io/docs/latest/commands/ts.mget/
- Official Redis Time Series filter expressions documentation

## Issues Found

### 1. Standalone existence/non-existence filter examples (3 occurrences)
**What was wrong:** The examples `TS.QUERYINDEX experiment!=` and `TS.QUERYINDEX compaction=` were shown as standalone commands. The official documentation requires at least one value-matching filter (`label=value` or `label=(v1,v2,...)`) to be present. These commands would return an error when executed alone.

**What was changed:**
- "Find Series Where Label Exists" example: changed from `TS.QUERYINDEX experiment!=` to `TS.QUERYINDEX env=production experiment!=` with an explanatory note.
- "Find Series Where Label Does Not Exist" example: changed from `TS.QUERYINDEX compaction=` to `TS.QUERYINDEX metric=temperature compaction=` with an explanatory note.
- "Audit Active Experiments" use case: changed from `TS.QUERYINDEX experiment!=` to `TS.QUERYINDEX env=production experiment!=`.

**Why:** The post itself correctly noted this requirement in the syntax section ("at least one must match a value, not empty check") but then showed examples that violated it. This would confuse readers or lead to errors when they try to run the commands.

### 2. Incorrect TS.MRANGE timestamp in comparison example
**What was wrong:** `TS.MRANGE -3600000 + FILTER env=production metric=cpu` used `-3600000` which appears intended to mean "one hour ago" but Redis Time Series uses absolute Unix timestamps in milliseconds, not relative offsets. The value `-3600000` is actually a negative timestamp (before the Unix epoch, January 1, 1970).

**What was changed:** Replaced `-3600000` with `-` (the special character meaning "earliest sample"), making the example `TS.MRANGE - + FILTER env=production metric=cpu`. This is correct syntax and keeps the comparison section focused on illustrating the difference between the three commands rather than specific time ranges.

**Why:** The original would retrieve data from before the Unix epoch rather than "the last hour" as likely intended. Using `- +` is the idiomatic way to select all data.

### 3. Nonsensical phrase "well-cardinality"
**What was wrong:** The performance section stated "it is fast for well-cardinality labels" which is not a meaningful phrase.

**What was changed:** Replaced "well-cardinality" with "low-cardinality" which correctly conveys the intended meaning in context (the surrounding text advises against high-cardinality labels).

**Why:** The sentence's intent is to say the command performs well when label values have low cardinality (few distinct values), which aligns with the subsequent advice to avoid high-cardinality labels like UUIDs.

## Review Notes
- The filter expression table is accurate and complete per the official documentation.
- The syntax description and return value documentation are correct.
- The TS.MGET syntax shown (`TS.MGET FILTER ...`) is correct.
- The use cases presented are practical and well-chosen.
- The mermaid diagram correctly illustrates how label filtering works with TS.QUERYINDEX.
- The post correctly notes the distinction between TS.QUERYINDEX (discovery) and TS.MGET/TS.MRANGE (data retrieval).
