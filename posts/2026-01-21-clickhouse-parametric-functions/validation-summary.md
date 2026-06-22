# Validation Summary: How to Use ClickHouse Parametric Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse parametric aggregate functions
- SQL
- sequenceMatch
- sequenceCount
- windowFunnel
- retention
- MergeTree and AggregatingMergeTree

## Sources Consulted
- ClickHouse official documentation: Parametric Aggregate Functions - https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions
- ClickHouse official documentation: Map(K, V) data type - https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse Docker image with clickhouse-local version 26.5.1.882 for syntax and runtime checks

## Issues Found
- The sample table used `DateTime64(3)` for `event_time`, but current `sequenceMatch` rejects `DateTime64` timestamps and requires `DateTime`, `Date`, or supported unsigned integer timestamp types. Changed `event_time` to `DateTime`.
- The pattern syntax section showed `(?1)(?!2)(?3)` as a negative lookahead pattern, but ClickHouse `sequenceMatch` pattern syntax does not support regex negative lookahead. Removed that pattern and rewrote the "Purchase without cart abandonment" example to combine a positive `sequenceMatch` with a separate negative `sequenceMatch` check.
- The repeated add-to-cart example used `sequenceCount('(?1)')`, but current ClickHouse requires at least two condition arguments for `sequenceCount`/`sequenceMatch`. Replaced it with `countIf(event_name = 'add_to_cart')`.
- The basic funnel and segmented funnel examples nested `sequenceMatch` inside `countIf`, which ClickHouse rejects because it nests one aggregate function inside another. Rewrote those examples to calculate per-user sequence results in a subquery, then aggregate the per-user results in the outer query.
- The conversion-rate funnel used `sequenceMatch('(?1)')` for a single-step check, which ClickHouse rejects for the same minimum-argument reason. Replaced it with `max(toUInt8(event_name = 'page_view'))`.

## Review Notes
- ClickHouse documents that events with the same second timestamp can be ordered nondeterministically for `sequenceMatch` and `sequenceCount`; this remains a relevant caveat for production event tables.
- Several examples compute rates without guarding against zero denominators. The examples are technically valid SQL, but production dashboard queries should usually use `nullIf` or explicit denominator checks.
