# Validation Summary: How to Create Tables with TTL Expressions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL DDL (CREATE TABLE, ALTER TABLE, OPTIMIZE TABLE)
- TTL expressions (column-level and table-level)
- Storage policies and tiered storage (disks, volumes)
- Compression codecs (LZ4, ZSTD)

## Sources Consulted
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse system.tables docs: https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse CREATE TABLE / TTL reference: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse ALTER TABLE TTL docs: https://clickhouse.com/docs/en/sql-reference/statements/alter/ttl
- ClickHouse OPTIMIZE TABLE docs: https://clickhouse.com/docs/en/sql-reference/statements/optimize
- ClickHouse storage policy / multi-disk configuration docs

## Issues Found
- **Non-existent column `ttl_expression` in `system.tables`**: The "Checking TTL Definitions" section referenced a `ttl_expression` column in `system.tables`, which does not exist in ClickHouse. The documented columns on `system.tables` include `create_table_query`, `engine_full`, `partition_key`, `sorting_key`, `primary_key`, `sampling_key`, `storage_policy`, etc., but no dedicated TTL column. Fixed the query to select and filter on `create_table_query` instead, which is the standard way to introspect TTL definitions from `system.tables`.

## Review Notes
- The rest of the post is technically accurate:
  - Column-level TTL reset behavior (defaults for data type — `0.0.0.0` for `IPv4`, `''` for `String`) is correct because IPv4 is stored as UInt32 whose default is 0.
  - Table-level TTL modes (`DELETE`, `TO DISK`, `TO VOLUME`, `RECOMPRESS`, `GROUP BY`, `WHERE`) and their syntax match the official MergeTree documentation.
  - `ALTER TABLE ... MODIFY TTL` and `ALTER TABLE ... REMOVE TTL` are valid syntax.
  - TTL firing during background merges and `OPTIMIZE TABLE ... FINAL` forcing immediate merge (and therefore TTL application) is accurate.
  - The storage policy XML example uses an inline style but is valid XML and represents a realistic three-tier hot/cold/archive setup. The `s3_disk` inside the `archive` volume is referenced but not defined in the `<disks>` block — this is acceptable for an illustrative snippet and the post doesn't claim the config is complete.
- Minor future improvement (not a correctness issue): the GROUP BY TTL example uses `toStartOfDay(ts), service` as GROUP BY keys against an `ORDER BY (ts, service)`. ClickHouse requires the GROUP BY to be a prefix of the primary key; expressions over primary-key columns are allowed in practice but the author could consider adding a clarifying note for readers who might hit "GROUP BY expression must be a prefix of the table primary key" errors on stricter versions.
- The post could also optionally mention the `materialize_ttl_after_modify` setting and `ALTER TABLE ... MATERIALIZE TTL` as alternatives to `OPTIMIZE TABLE ... FINAL` for forcing TTL application, but this is an enhancement, not a correction.
