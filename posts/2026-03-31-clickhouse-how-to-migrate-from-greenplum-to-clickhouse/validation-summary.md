# Validation Summary: How to Migrate from Greenplum to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Greenplum (PostgreSQL-based MPP data warehouse)
- ClickHouse (columnar OLAP database)
- `gpfdist` (Greenplum parallel file distribution utility)
- ClickHouse MergeTree engine
- ClickHouse Distributed table engine
- SQL (PostgreSQL dialect vs ClickHouse dialect)

## Sources Consulted
- ClickHouse MergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse Distributed engine: https://clickhouse.com/docs/en/engines/table-engines/special/distributed
- ClickHouse INTERVAL / date functions: https://clickhouse.com/docs/en/sql-reference/operators
- ClickHouse array functions (arrayJoin, arrayMap, range): https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse client formats (CSVWithNames): https://clickhouse.com/docs/en/interfaces/formats
- Greenplum COPY documentation: https://docs.vmware.com/en/VMware-Greenplum/index.html
- Greenplum gpfdist documentation: https://docs.vmware.com/en/VMware-Greenplum/6/greenplum-database/admin_guide-external-g-using-the-greenplum-parallel-file-server--gpfdist-.html
- Greenplum Append-Optimized tables: https://docs.vmware.com/en/VMware-Greenplum/6/greenplum-database/admin_guide-ddl-ddl-storage.html

## Issues Found
No technical issues found.

- Greenplum `COPY ... TO ... WITH (FORMAT csv, HEADER true, DELIMITER ',')` syntax is valid.
- `gpfdist -d <dir> -p <port>` flags are correct.
- `CREATE WRITABLE EXTERNAL TABLE ... LOCATION ('gpfdist://...') FORMAT 'CSV'` syntax is valid.
- Greenplum AO/column DDL (`appendoptimized=true, orientation=column, compresstype=zstd`) is accurate.
- ClickHouse `MergeTree`, `toYYYYMM` partitioning, `LowCardinality(String)`, and `index_granularity = 8192` default are all correct.
- `clickhouse-client --query "INSERT ... FORMAT CSVWithNames" < file` usage is correct.
- `INTERVAL 7 DAY` is valid ClickHouse syntax.
- The `arrayJoin(arrayMap(x -> toDate('2024-01-01') + x, range(31)))` expression correctly reproduces `generate_series('2024-01-01', '2024-01-31', '1 day')` (31 rows).
- `Distributed(cluster, db, table, sharding_key)` signature and `cityHash64` sharding key are correct.
- `CREATE TABLE x AS y ENGINE = Distributed(...)` copies the schema from `y` and is a valid ClickHouse idiom for distributed tables.

## Review Notes
- The architecture comparison row "Row storage | Row-oriented (with AO tables)" is slightly ambiguous — Greenplum's default is row-oriented heap, and AO tables can be either row or column oriented. The phrasing is still technically defensible (AO tables exist as an alternative), so no edit was needed.
- `CSVWithNames` expects a header row; the `COPY ... HEADER true` export produces one, so the load step is consistent.
- Greenplum is deprecated as of VMware Greenplum 7 EOL announcements (2026), which reinforces the migration motivation but is not claimed in the post and therefore requires no change.
