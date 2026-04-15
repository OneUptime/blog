# Validation Summary: How to Use uniqCombined for Memory-Efficient Count Distinct in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (aggregate functions, AggregatingMergeTree engine)
- HyperLogLog algorithm
- uniqCombined, uniqExact, uniqHLL12, uniq functions
- AggregateFunction column type with -State and -Merge combinators

## Sources Consulted
- ClickHouse official docs: uniqCombined — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse official docs: uniqCombined64 — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniqcombined64
- ClickHouse official docs: uniq — https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official docs: AggregateFunction type — https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse official docs: Aggregate Function Combinators — https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse GitHub PR #7236 (hash table memory limits for uniqCombined) — https://github.com/ClickHouse/ClickHouse/pull/7236
- Altinity KB: Functions to count uniqs — https://kb.altinity.com/altinity-kb-schema-design/uniq-functions/

## Issues Found

1. **`uniqCombined12` is not a valid function name.** ClickHouse has `uniqCombined` and `uniqCombined64`, but no `uniqCombined12`. The correct syntax for specifying 12-bit HLL precision is `uniqCombined(12)(column)` using parametric function syntax. Fixed all references to use `uniqCombined(12)`.

2. **Section heading said "High-Precision Variant"** for `uniqCombined12`. Since 12-bit HLL is *lower* precision than the default 17-bit, the heading was misleading. Changed to "Lower-Precision Variant".

3. **Threshold for switching to HLL was stated as ~70,000.** Per ClickHouse source (PR #7236), the hash table is capped at ~4,096 entries for UInt64 before switching to HLL, not 70,000. Changed to "a few thousand elements" and clarified the two exact-counting phases (array and hash table).

4. **Memory at 1M cardinality was stated as ~50 KB.** The ClickHouse docs state that at default 17-bit precision, the HLL uses 2^17 cells at 6 bits each = ~96 KiB. Altinity benchmarks confirm ~98,505 bytes. Changed to ~96 KB in both the prose and the comparison table.

5. **"3-4x less memory" claim was vastly understated.** At 1M cardinality, ~96 KB vs ~8 MB is roughly 80x, not 3-4x. Changed to "significantly less memory (up to ~80x at high cardinalities)".

6. **Summary claimed "100x less memory".** With the corrected ~96 KB figure, the ratio is ~83x. Changed to "~80x less memory" for consistency.

## Review Notes
- The error rate of ~0.5% for uniqCombined is slightly conservative. The theoretical standard error for 17-bit HLL is ~0.29% (1.04/sqrt(2^17)). The ~0.5% figure is a reasonable practical upper bound and was left as-is.
- The error rate of ~1.6% for uniqHLL12 is accurate (1.04/sqrt(2^12) = 1.625%).
- The AggregatingMergeTree example with uniqCombinedState/uniqCombinedMerge is correct and follows proper ClickHouse patterns.
- The post does not mention `uniqCombined64` (which uses 64-bit hashing for better accuracy at very high cardinalities >4 billion). This is a reasonable omission for a general-purpose tutorial.
- Memory figures for `uniqHLL12` (~2.5 KB) and `uniq` (~4 KB) could not be precisely verified but appear plausible based on their algorithm parameters.
