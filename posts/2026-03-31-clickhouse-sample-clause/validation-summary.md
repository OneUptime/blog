# Validation Summary: How to Use SAMPLE Clause in ClickHouse for Approximate Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, Distributed engine)
- SQL (SELECT, SAMPLE clause, GROUP BY, WHERE, ORDER BY)
- ClickHouse sampling expressions (intHash32, SAMPLE BY)

## Sources Consulted
- ClickHouse official documentation — SAMPLE clause: https://clickhouse.com/docs/en/sql-reference/statements/select/sample
- ClickHouse official documentation — MergeTree engine (SAMPLE BY section): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse source code (`MergeTreeDataSelectExecutor.cpp`) for verification of hash space behavior and `_sample_factor` implementation

## Issues Found
1. **SAMPLE BY expression used raw `user_id` instead of a hash function.** The original CREATE TABLE example used `SAMPLE BY user_id` with `ORDER BY (user_id, event_time)`. While syntactically valid (UInt64 satisfies the unsigned integer requirement), using a raw column produces biased samples because sampling selects a contiguous range in the key space. The official ClickHouse documentation exclusively demonstrates `intHash32(UserID)` for SAMPLE BY to ensure pseudorandom, uniform distribution. **Fixed** by changing to `SAMPLE BY intHash32(user_id)` with `ORDER BY (intHash32(user_id), event_time)`. Also updated the explanatory text to mention the hash function recommendation and the unsigned integer requirement.

## Review Notes
- The `[0, 1)` hash space description for SAMPLE OFFSET is correct per the ClickHouse implementation (confirmed via source code) but is not explicitly documented in the official docs. This is a reasonable simplification for a tutorial.
- The distributed table behavior (SAMPLE applied independently per shard) is correct per the implementation but is not explicitly covered in the official documentation. The blog's description is accurate and useful.
- The `_sample_factor` virtual column usage with `any(_sample_factor)` in a GROUP BY query is correct — the factor is constant for a given sample rate, so `any()` is appropriate.
- The claim that SAMPLE n reads "at least n rows (rounded up to the nearest granule boundary)" is mostly correct — the docs confirm "at least n rows" and note that granules are the minimum read unit, implying granule-boundary rounding.
