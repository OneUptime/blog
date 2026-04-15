# Validation Summary: How to Compare ClickHouse vs PostgreSQL for Analytics

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- ClickHouse (columnar OLAP database)
- PostgreSQL (row-oriented OLTP database)
- MergeTree engine family (ClickHouse)
- TOAST compression / pglz / LZ4 (PostgreSQL)
- ClickHouse codecs (DoubleDelta, ZSTD, T64, LZ4)
- MaterializedPostgreSQL (ClickHouse engine for CDC from PostgreSQL)
- Citus (PostgreSQL horizontal sharding extension)

## Sources Consulted
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on ALTER mutations (UPDATE/DELETE): https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse documentation on column codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse documentation on MaterializedPostgreSQL: https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql
- PostgreSQL documentation on TOAST compression: https://www.postgresql.org/docs/current/storage-toast.html
- PostgreSQL 14 release notes (LZ4 TOAST compression): https://www.postgresql.org/docs/14/release-14.html
- PostgreSQL documentation on MVCC: https://www.postgresql.org/docs/current/mvcc.html
- PostgreSQL documentation on WAL streaming replication: https://www.postgresql.org/docs/current/warm-standby.html

## Issues Found
1. **Incorrect PostgreSQL compression description (line 155)**: The post stated "PostgreSQL uses page-level compression (with `pg_lz`) or tablespace-level compression (PostgreSQL 14+)." This was inaccurate in two ways: (a) `pglz` is the TOAST compression algorithm for individual large values exceeding ~2 KB, not a page-level compression mechanism; (b) PostgreSQL 14 introduced LZ4 as an alternative TOAST compression method, not tablespace-level compression. PostgreSQL has no native page-level or tablespace-level compression. **Fixed** to: "PostgreSQL uses TOAST compression (`pglz` by default, or LZ4 in PostgreSQL 14+) for individual large values exceeding ~2 KB, but has no native columnar or page-level compression, which makes it less effective for analytical columns."

## Review Notes
- The benchmark table is appropriately labeled as "illustrative" — actual numbers will vary significantly based on hardware, schema design, indexing, and query patterns.
- The ClickHouse concurrency table simplifies isolation levels to "Read committed only." ClickHouse doesn't implement standard SQL isolation levels; it provides atomic inserts within a single partition and consistent snapshots for reads. This is a reasonable simplification for a comparison article.
- The `MaterializedPostgreSQL` engine referenced in the summary is an experimental feature in ClickHouse. Its stability and API may change across versions. Worth noting in a future update if the feature graduates to stable or is renamed.
- All SQL syntax (PostgreSQL CREATE TABLE, ClickHouse CREATE TABLE with ENGINE/ORDER BY/CODEC, ALTER TABLE mutations) is correct and current.
- The Mermaid diagrams are syntactically valid and accurately represent the described architectures.
