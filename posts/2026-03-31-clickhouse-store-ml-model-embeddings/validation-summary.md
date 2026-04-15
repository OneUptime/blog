# Validation Summary: How to Store ML Model Embeddings in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, SQL DDL/DML, codecs, constraints, distance functions)
- Python (clickhouse_connect client library)
- ML embeddings (Array(Float32) storage, cosine distance similarity search)

## Sources Consulted
- ClickHouse official docs — Vector Search: https://clickhouse.com/docs/knowledgebase/vector-search
- ClickHouse official docs — Distance Functions (cosineDistance): https://clickhouse.com/docs/sql-reference/functions/distance-functions
- ClickHouse official docs — Compression Codecs: https://clickhouse.com/docs/data-compression/compression-in-clickhouse
- ClickHouse official docs — CREATE TABLE (MATERIALIZED columns): https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse official docs — ALTER TABLE ADD CONSTRAINT: https://clickhouse.com/docs/sql-reference/statements/alter/constraint
- ClickHouse official docs — Custom Partitioning Key: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- Altinity Knowledge Base — Codecs on Array Columns: https://kb.altinity.com/altinity-kb-schema-design/codecs/codecs-on-array-columns/
- ClickHouse official docs — Python clickhouse_connect example: https://clickhouse.com/docs/knowledgebase/python-clickhouse-connect-example
- ClickHouse Blog — Vector Search with ClickHouse Part 1: https://clickhouse.com/blog/vector-search-clickhouse-p1

## Issues Found
No technical issues found.

## Review Notes
- The `Delta` codec in `CODEC(Delta, ZSTD(3))` on `Array(Float32)` is valid syntax and will work, but Delta is most effective on monotonically increasing sequences. For embedding values (pseudo-random floats), the Delta stage may provide minimal benefit — the bulk of the compression comes from `ZSTD(3)`. The 30-50% reduction claim is plausible due to ZSTD alone.
- The phrase "without extra storage overhead" for the MATERIALIZED `dim` column is slightly imprecise — MATERIALIZED columns are physically stored on disk. However, the overhead of a single `UInt16` per row is negligible compared to the embedding array, so this is not meaningfully misleading.
- The `ALTER TABLE ADD CONSTRAINT CHECK` only validates future inserts, not existing data. The post does not mention this caveat, which could surprise users who add the constraint after initial data loading.
- The `dim` column is typed as `UInt16` (max 65,535), which is sufficient for all current embedding models (typically 384–4,096 dimensions).
- ClickHouse also supports `annoy` and `usearch` (HNSW) vector indexes for approximate nearest neighbor search, which could be a natural follow-up topic but is outside the scope of this post.
