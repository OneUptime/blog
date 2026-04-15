# Validation Summary: How to Use NONE Codec in ClickHouse and When It Makes Sense

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, column codecs, compression)
- SQL (DDL statements, system table queries)
- LZ4, ZSTD, Delta, DoubleDelta compression codecs

## Sources Consulted
- ClickHouse documentation on column compression codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse documentation on `system.parts`: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse documentation on `system.columns`: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse documentation on TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse documentation on `randomString` function: https://clickhouse.com/docs/en/sql-reference/functions/random-functions
- ClickHouse documentation on storage policies: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#storage-policies

## Issues Found
No technical issues found.

## Review Notes
- The `storage_policy = 'ram'` example assumes a pre-configured storage policy named 'ram'. This is not a built-in policy and would need to be set up in ClickHouse's server configuration. The post uses it illustratively, which is acceptable, but readers would need to configure this policy themselves.
- All SQL syntax is valid and would execute correctly on a standard ClickHouse installation.
- The compression ratio claims (e.g., "Delta + LZ4 can achieve 5-10x compression" for timestamps) are reasonable and consistent with real-world observations, though exact ratios depend on data characteristics.
- The `hex(randomString(128))` approach for generating incompressible test data is a well-known technique and correctly produces 256-byte strings.
