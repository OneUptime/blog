# Validation Summary: How to Use uniqCombined() and uniqCombined64() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse aggregate functions: `uniqCombined()`, `uniqCombined64()`, `uniq()`, `uniqExact()`
- ClickHouse AggregatingMergeTree engine
- ClickHouse materialized views with State/Merge combinators

## Sources Consulted
- ClickHouse official documentation: uniqCombined — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse official documentation: uniqCombined64 — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqcombined64
- ClickHouse official documentation: uniq — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official documentation: AggregatingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse official documentation: Aggregate function combinators (-State, -Merge) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found

1. **Hash bit width oversimplification (lines 66-67)**: The post stated that `uniqCombined()` uses "32-bit hashes" as a blanket statement. Per the official documentation, `uniqCombined()` uses 32-bit hashes for non-String types and 64-bit hashes for String types. Fixed to accurately reflect this distinction.

2. **Incorrect threshold for uniqCombined64() (line 75)**: The post recommended using `uniqCombined64()` when distinct counts exceed ~500 million. The official documentation states that errors become significant near UINT_MAX (~4.3 billion distinct values), not at 500 million. Fixed to reference billions and UINT_MAX as the documented concern.

3. **"Default" vs "recommended" for uniq() (line 47)**: The post called `uniq()` "the default approximate distinct-count function." The official docs describe it as the "recommended" function "in almost all scenarios," not as a "default." Fixed wording to "recommended."

4. **Selection guide comment (line 130)**: Updated the inline comment for `uniqCombined64()` from ">500M distinct values" to "billions of distinct values on non-String columns" to match the corrected guidance.

## Review Notes
- The three-phase hybrid algorithm description (array, hash table, HyperLogLog) is correct per the docs. The "< ~256" threshold for the array phase is not explicitly stated in official documentation but is a reasonable approximation from the source code. It could be softened to "a small number" to match the docs' language, but is not materially wrong.
- The HyperLogLog precision of 17 bits (131,072 registers) is confirmed by the official documentation as the default.
- The AggregatingMergeTree materialized view pattern with State/Merge combinators is correctly demonstrated and matches the documented pattern.
- All SQL syntax is valid ClickHouse SQL.
- The accuracy comparison between `uniq()`, `uniqCombined()`, and `uniqExact()` is supported by the documentation.
