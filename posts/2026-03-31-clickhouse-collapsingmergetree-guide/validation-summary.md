# Validation Summary: What Is CollapsingMergeTree and When to Use It

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- CollapsingMergeTree table engine
- VersionedCollapsingMergeTree table engine
- ReplacingMergeTree table engine (comparison)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse CollapsingMergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse VersionedCollapsingMergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/versionedcollapsingmergetree
- ClickHouse aggregate function docs for `argMax`, `argMaxIf`, and `sum`

## Issues Found

- **Misleading description of cancellation row contents.** The post previously read: *"Only the sign and mutable columns (like balance) differ."* This contradicts the ClickHouse docs, which state that the cancel row must copy all of the state row's fields except `Sign`. Having `balance` differ between the state and its cancellation would prevent `sum(balance * sign)` from cancelling to zero and produce incorrect aggregates. Rewrote the sentence to clarify that the cancellation row must match the state row on the sorting key and any sign-weighted aggregation columns, with only `sign` flipping; the new state row afterward is where updated values go. The accompanying code example was already consistent with this (the cancel row uses the same `balance = 1250.00` as the original state), so only the prose needed fixing.

## Review Notes

- The `VersionedCollapsingMergeTree(sign, version)` parameter order and example are correct per the ClickHouse docs.
- The `CollapsingMergeTree(sign)` syntax, sign column type (`Int8`), and `ORDER BY` semantics are correctly described.
- The example `updated_at` value on cancel rows differs from the original state's `now()` timestamp. Strictly, ClickHouse recommends copying all non-sign fields, but the non-aggregated `updated_at` column only affects the `max(updated_at)` expression, and only for the short window before merges collapse the pair. Left as-is because it reflects common real-world practice (the original insertion timestamp usually isn't known at cancel time) and the behavioral impact is minor.
- `HAVING sum(sign) = 1` and `HAVING sum(sign) > 0` are both used across examples. Both are valid; `> 0` is more tolerant of out-of-order inserts and duplicate state rows. Left unchanged since both are defensible.
- The mention of `sumIf` in the prose ("Always use `sum(sign)` and `sumIf`...") is not actually exercised in the subsequent queries (they use `sum(balance * sign)` and `argMaxIf` instead). Not technically wrong — `sumIf` is a valid alternative pattern — so left unchanged.
- The caution against `OPTIMIZE TABLE ... FINAL` in production is accurate; it is resource-intensive and rewrites affected parts.
