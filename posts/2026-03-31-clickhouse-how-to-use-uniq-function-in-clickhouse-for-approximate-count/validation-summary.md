# Validation Summary: How to Use uniq() Function in ClickHouse for Approximate Count Distinct

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL)
- `uniq()`, `uniqExact()`, `uniqHLL12()`, `uniqCombined()` aggregate functions
- `-If` combinator (`uniqIf`)
- `uniqState()` / `uniqMerge()` with `AggregatingMergeTree` and materialized views
- HyperLogLog algorithm

## Sources Consulted
- ClickHouse docs — `uniq`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse docs — `uniqHLL12`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqhll12
- ClickHouse docs — `uniqCombined`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse docs — `uniqExact`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse docs — Combinators (`-If`, `-State`, `-Merge`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse docs — `AggregatingMergeTree`: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree

## Issues Found
- **Incorrect accuracy claim for `uniqHLL12()`** — The post originally stated `uniqHLL12()` "offers better accuracy than `uniq()`". This contradicts the official ClickHouse docs, which explicitly do not recommend `uniqHLL12()` and advise using `uniq` or `uniqCombined` instead. `uniqHLL12()` error can be up to ~10% for small cardinalities (<10K) and grows again past ~100M. Rewrote the section to describe the 2^12 cells / ~2.5 KB state, add the documentation's non-recommendation, and give correct error-rate context. Heading changed from "Higher Accuracy" to "HyperLogLog Variant" to avoid misleading readers.

## Review Notes
- The ~2.2% error figure cited for `uniq()` is a commonly quoted approximation. The current ClickHouse documentation describes `uniq()` as "very accurate" using an adaptive sampling algorithm but does not state an exact percentage; 2% is the typical figure referenced in community/source material, so ~2.2% is a reasonable approximation and was left as-is.
- The `uniqCombined()` description ("array, hash set, and HyperLogLog") is essentially correct — the docs describe it as "array, hash table, and HyperLogLog with an error correction table". The wording difference is minor and not worth changing.
- All SQL examples (`uniqIf`, `uniqState`/`uniqMerge`, `AggregatingMergeTree` materialized view with `ORDER BY (date, country)`) are syntactically valid ClickHouse SQL.
- `uniqIf` is a valid application of the `-If` combinator to `uniq`.
- Funnel example using `step >= N` flags is a reasonable pattern; semantics assume each event has a numeric `step` column — this is an illustrative schema assumption, not an error.
