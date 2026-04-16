# Validation Summary: How to Use index_granularity Setting in MergeTree Tables

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- `index_granularity` MergeTree setting
- `index_granularity_bytes` (adaptive granularity)
- ClickHouse SQL (CREATE TABLE, SELECT from system.parts)

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse system.parts docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse primary key indexing / sparse index documentation

## Issues Found

1. **Incorrect column name in `system.parts` query.** The post used `part_name`, but `system.parts` exposes the data part name as `name` (not `part_name`). `part_name` exists in `system.part_log` and `system.detached_parts`, but not in `system.parts`. Fixed the SELECT query to use `name`.

2. **Incorrect memory-size estimate.** The post stated that a 1-billion-row table with `index_granularity = 8192` and an 8-byte key produces an index of approximately 1 GB. The correct value is approximately 1 MB: 1,000,000,000 / 8192 ≈ 122,070 marks × 8 bytes ≈ 976 KB (~1 MB). Fixed the statement and added the arithmetic inline so readers can verify.

## Review Notes

- Default `index_granularity` of 8192 and default `index_granularity_bytes` of 10485760 (10 MB) are correct as of current ClickHouse versions.
- The characterization of the sparse primary index (one entry per granule, scan index → read matching granules) is accurate.
- The SQL DDL examples (`CREATE TABLE ... ENGINE = MergeTree() ... SETTINGS index_granularity = ...`) are syntactically valid.
- The recommendation table is opinion/guidance; values are reasonable but not prescribed by official docs. In practice, very small granularities (e.g., 256) will also be affected by `index_granularity_bytes` unless adaptive granularity is disabled — worth keeping in mind but not a technical error given the post already introduces `index_granularity_bytes`.
- Minor: the index size formula assumes one scalar key column. For composite primary keys, `key_bytes_per_mark` grows accordingly — the post's formula accommodates this correctly via the `key_bytes_per_mark` variable.
