# Validation Summary: How to Use HyperLogLog for Cardinality Estimation in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- HyperLogLog (HLL) probabilistic cardinality estimation
- ClickHouse aggregate functions: `uniqHLL12`, `uniqExact`, `uniq`
- State/Merge combinators: `uniqHLL12State`, `uniqHLL12Merge`
- `AggregatingMergeTree` engine and `AggregateFunction` data type

## Sources Consulted
- ClickHouse official docs — uniqHLL12: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse official docs — Aggregate function combinators (-State, -Merge): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official docs — AggregatingMergeTree engine

## Issues Found
- **Inaccurate description of HLL precision parameter.** The post originally said "12 bits of precision in ClickHouse's implementation," which conflates the HLL precision parameter (p=12) with bit width. ClickHouse's implementation uses 2^12 = 4096 5-bit registers (per the official docs). I rewrote the clause to read "a precision parameter of 12, meaning 2^12 = 4096 5-bit registers in ClickHouse's implementation" to match the underlying algorithm accurately.

## Review Notes
- The ~2.5 KB state size and ~1.6% typical error rate are both consistent with the ClickHouse documentation ("slightly more than 2.5 KB" and ~1.6% max error for medium datasets 10K–100M).
- The recommendation to use `uniq` for low-cardinality (< 10K) aligns with the docs, which note `uniqHLL12` has up to ~10% error on small datasets.
- Recommending `uniqExact` for compliance/billing counts is correct.
- The "Memory Usage Comparison" section's SQL query queries the column size in `system.columns` rather than directly demonstrating HLL state size; this is a slightly weak illustration but not technically incorrect — the accompanying prose states the true HLL state size.
- ClickHouse's docs also note `uniqCombined` as a common alternative that offers better accuracy/memory trade-offs; the post could optionally mention this in a future revision, but its omission is not an error.
