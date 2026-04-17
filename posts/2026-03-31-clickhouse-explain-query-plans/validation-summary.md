# Validation Summary: How to Analyze Query Plans with EXPLAIN in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- ClickHouse EXPLAIN statement (PLAN, AST, SYNTAX, PIPELINE, indexes setting)
- MergeTree engine (primary keys, granules, parts)
- Skip indexes (bloom_filter)
- ClickHouse SQL (ALTER TABLE ... ADD INDEX / MATERIALIZE INDEX)

## Sources Consulted
- ClickHouse EXPLAIN statement documentation: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse skip indexes (data skipping indexes): https://clickhouse.com/docs/en/optimize/skipping-indexes
- ClickHouse ALTER INDEX documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index
- Unix timestamp conversion verified via Python's datetime module

## Issues Found
1. **Incorrect Unix timestamp in the EXPLAIN indexes output** — The query filters `ts >= '2026-01-01'`, but the sample output showed `ts in [1735689600, +Inf)`. The value 1735689600 is the Unix timestamp for 2025-01-01 00:00:00 UTC. The correct value for 2026-01-01 00:00:00 UTC is 1767225600. Fixed by updating the timestamp to `1767225600` so the sample output matches the query literal.

## Review Notes
- `EXPLAIN indexes = 1` is strictly a setting applied to `EXPLAIN PLAN` (i.e., `EXPLAIN PLAN indexes = 1 ...`), not a standalone variant. ClickHouse defaults the type to PLAN when no type is specified, so `EXPLAIN indexes = 1 SELECT ...` is still valid and commonly used in practice. Listing it alongside the variants is a slight informal simplification but not incorrect.
- The post omits a few additional EXPLAIN types that exist in current ClickHouse versions: `EXPLAIN ESTIMATE`, `EXPLAIN QUERY TREE`, `EXPLAIN TABLE OVERRIDE`, `EXPLAIN CURRENT TRANSACTION`. These are out of scope for an introductory post, so not flagged as issues.
- The sample `EXPLAIN PLAN` output structure (`Expression -> Limit -> Sorting -> Expression -> Aggregating -> Expression -> Filter -> ReadFromMergeTree`) matches typical output shapes for this class of query.
- `ALTER TABLE ... ADD INDEX ... TYPE bloom_filter(0.01) GRANULARITY 4` and `ALTER TABLE ... MATERIALIZE INDEX` syntax are correct per current ClickHouse docs.
- Granule counts, Parts notation, and the interpretation of skipped granules as an index-efficiency signal are accurate.
