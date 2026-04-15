# Validation Summary: How to Use windowFunnel() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- windowFunnel() aggregate function
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation — Parametric Aggregate Functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions#windowfunnel

## Issues Found

1. **Window parameter unit description was incorrect**: The post stated the `window` parameter is "time window size in seconds." This is only true when the timestamp column is `DateTime`. For `Date` columns the unit is days, and for unsigned integer columns the unit matches whatever the column represents. Fixed to describe the unit as dependent on the timestamp column type.

2. **Incomplete timestamp type list**: The post listed only `DateTime` or `UInt32` as supported timestamp types. The function also supports `Date`, `UInt8`, `UInt16`, and `UInt64`. Fixed to list all supported types.

3. **Missing `allow_reentry` mode**: The post listed four modes (`strict_order`, `strict_deduplication`, `strict_increase`, `strict_once`) but omitted the `allow_reentry` mode. Fixed by adding it to the list.

4. **Inaccurate `strict_deduplication` description**: The post said "the second occurrence does not advance the funnel," implying the duplicate is simply skipped. The official documentation states that a repeating condition "interrupts further processing," meaning the chain breaks at that point. Fixed to match the documented behavior.

## Review Notes
- All SQL code examples are syntactically correct and use valid ClickHouse syntax.
- The expected query outputs are consistent with the sample data and windowFunnel() behavior.
- The explanation of User 3 scoring 1 (signup only, no onboard event to advance the chain) and User 4 scoring 0 (never matched step 1) is correct.
- The post does not mention the 32-condition limit on windowFunnel() arguments — this is a minor omission but not an error.
- The post does not mention the UInt64 constraint (values must not exceed 2^63 - 1) — this is an edge-case detail and not an error for a tutorial-level post.
