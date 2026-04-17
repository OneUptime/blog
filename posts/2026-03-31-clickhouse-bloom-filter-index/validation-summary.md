# Validation Summary: How to Use Bloom Filter Index in ClickHouse

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- ClickHouse (MergeTree table engine)
- Data skipping indexes: `bloom_filter`, `ngrambf_v1`, `tokenbf_v1`, `set`, `minmax`
- SQL (DDL for CREATE TABLE / ALTER TABLE / EXPLAIN)
- `system.data_skipping_indices` system table

## Sources Consulted
- ClickHouse MergeTree docs (data skipping indexes): https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse ALTER INDEX / skipping index docs: https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index
- ClickHouse "Understanding ClickHouse data skipping indexes": https://clickhouse.com/docs/optimize/skipping-indexes
- ClickHouse EXPLAIN docs: https://clickhouse.com/docs/sql-reference/statements/explain
- Bloom filter math (m ≈ -n·ln(p)/(ln 2)^2)

## Issues Found
1. **Contradictory index count.** Intro to "Index Variants" said "ClickHouse provides two bloom filter index types" but the table listed three (`bloom_filter`, `ngrambf_v1`, `tokenbf_v1`). Changed to "three."
2. **Inaccurate memory-growth claim.** The intro stated that bloom filter memory "grows logarithmically, not linearly, with the number of distinct values." This is wrong — for a fixed false positive rate, bloom filter memory is linear in n (m ≈ -n·ln(p)/(ln 2)^2, about 9.6 bits/element at 1% FPR). The real advantage vs. Set is the small fixed constant per element rather than storing the full value. Rewrote the sentence accordingly.
3. **Misleading comparison-table row.** The Bloom Filter vs Set Index table said "Memory overhead: Logarithmic vs Linear". Both are linear in cardinality; bloom filter wins on constant factor. Replaced the row with "Memory per element | ~10 bits at 1% FPR | Full stored value" which is accurate and more informative.
4. **Default FPR not stated.** Minor clarification: added that the default FPR is `0.025` when the argument is omitted (per ClickHouse docs), so readers know the built-in default.

## Review Notes
- `bloom_filter`'s supported operators (`=`, `!=`, `IN`, `NOT IN`, `has`, `hasAny`, `hasAll`) and non-support for `hasToken`/`LIKE` matches the official function-support matrix. The comparison table's claims are correct.
- `ALTER TABLE … ADD INDEX` + `MATERIALIZE INDEX` is the correct pattern for applying a skip index to existing data.
- The EXPLAIN output is slightly simplified vs. real ClickHouse output (real output also includes a `Parts` line and typically shows `Description: bloom_filter GRANULARITY 4` without the FPR embedded). Left as-is since it is illustrative and not materially misleading.
- **Future deprecation watch:** `ngrambf_v1` and `tokenbf_v1` are slated to be replaced by a new unified `text` index in ClickHouse 26.2. Not yet relevant as the post focuses on `bloom_filter`, but when the dedicated follow-up posts for the ngram/token variants are reviewed, they should note the deprecation.
- Example tables, query syntax, `system.data_skipping_indices` usage, and the benchmark snippet are all valid.
