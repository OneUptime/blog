# Validation Summary: How to Migrate from PostgreSQL to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, postgresql() table function, PostgreSQL database engine, MaterializedPostgreSQL engine, JSONExtract functions, window functions)
- PostgreSQL (COPY export, logical replication, WAL, publications, replication slots)
- clickhouse-client CLI
- psql CLI

## Sources Consulted
- ClickHouse documentation: Data Types — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: MergeTree Engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: postgresql() Table Function — https://clickhouse.com/docs/en/sql-reference/table-functions/postgresql
- ClickHouse documentation: PostgreSQL Database Engine — https://clickhouse.com/docs/en/engines/database-engines/postgresql
- ClickHouse documentation: MaterializedPostgreSQL Engine — https://clickhouse.com/docs/en/engines/database-engines/materialized-postgresql
- ClickHouse documentation: ALTER TABLE UPDATE (Mutations) — https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse documentation: Data Skipping Indexes — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- PostgreSQL documentation: COPY command — https://www.postgresql.org/docs/current/sql-copy.html
- PostgreSQL documentation: Logical Replication — https://www.postgresql.org/docs/current/logical-replication.html

## Issues Found

1. **Incorrect UPDATE syntax for ClickHouse (critical)**: The JSONB migration section used standard SQL `UPDATE events SET referrer = ..., device = ... WHERE ...` syntax. ClickHouse does not support standard UPDATE syntax; it requires `ALTER TABLE events UPDATE referrer = ..., device = ... WHERE ...` for mutations. Fixed to use the correct `ALTER TABLE ... UPDATE` syntax.

2. **Unnecessary and lossy Float64 cast in INSERT...SELECT (moderate)**: The INSERT from postgresql() table function cast `amount::Float64`, which is unnecessary because ClickHouse's postgresql() function handles PostgreSQL NUMERIC to ClickHouse Decimal conversion automatically. Worse, casting through Float64 can lose decimal precision (e.g., 0.1 cannot be represented exactly in IEEE 754 floating point). Removed the cast so the column passes through directly as a Decimal-compatible type.

3. **Inaccurate "No secondary indexes" claim (minor)**: The post stated "No secondary indexes" as a difference from PostgreSQL. ClickHouse does support data skipping indexes (minmax, set, bloom_filter, ngrambf_v1, etc.) which serve as a form of secondary index. Changed to "No B-tree indexes" with a note about ClickHouse's data skipping indexes.

4. **"analytics schema" should be "analytics database" (minor)**: The PostgreSQL Database Engine section stated it gives access to tables in the "analytics schema", but the `analytics` parameter is the database name, not a schema name. Fixed to say "analytics database."

## Review Notes
- The data type mapping table maps PostgreSQL TIMESTAMP to ClickHouse DateTime, which has only second-level precision. PostgreSQL TIMESTAMP has microsecond precision. For migrations where sub-second precision matters, DateTime64(6) would be more appropriate. The mapping is acceptable for the common case but readers should be aware of potential precision loss.
- The MaterializedPostgreSQL section lists manual creation of a replication slot and publication as "Requirements." In practice, ClickHouse's MaterializedPostgreSQL engine creates its own replication slot automatically. The publication can also be created automatically. These manual steps are not strictly required, though having them pre-created is not harmful.
- The claim "No secondary indexes" was corrected, but it's worth noting that ClickHouse's data skipping indexes are fundamentally different from PostgreSQL's B-tree indexes — they help skip granules rather than pointing to specific rows.
- Performance comparison figures (PostgreSQL 45-120s vs ClickHouse 0.3-2s on 100M rows) are plausible ballpark numbers for typical analytical aggregation queries but will vary significantly based on hardware, schema design, and data distribution.
- The SERIAL/BIGSERIAL mapping to UInt64 is a simplification — SERIAL is actually INTEGER (4 bytes) which would more precisely map to UInt32, while BIGSERIAL maps to UInt64. Using UInt64 for both is safe but not precise.
