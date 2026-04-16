# Validation Summary: How to Use HDFS Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HDFS table engine, hdfs() table function, MergeTree)
- Hadoop Distributed File System (HDFS)
- Data formats: CSV, Parquet, ORC, JSON, Avro
- SQL (ClickHouse dialect)
- XML configuration (ClickHouse config.xml / config.d)
- libhdfs3 client library

## Sources Consulted
- ClickHouse HDFS engine docs: https://clickhouse.com/docs/engines/table-engines/integrations/hdfs
- ClickHouse hdfs() table function docs: https://clickhouse.com/docs/sql-reference/table-functions/hdfs
- ClickHouse settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse source code (`src/Core/Settings.cpp`) for verification of `hdfs_replication` and `max_read_buffer_size`

## Issues Found
No technical issues found.

Verifications performed:
- `ENGINE = HDFS(URI, format)` syntax — correct.
- Glob patterns (`*`, `?`, `{a,b}`, `{N..M}`) — correct per official docs.
- `<hdfs><libhdfs3_conf>...</libhdfs3_conf></hdfs>` config block — correct structure matching ClickHouse documentation.
- Supported formats (CSV, Parquet, ORC, JSON, Avro) — all supported.
- `hdfs()` table function and `INSERT INTO FUNCTION hdfs(...)` — both valid.
- `hdfs_replication` setting — confirmed as a real setting in ClickHouse source (controls HDFS replication factor when writing files).
- `max_read_buffer_size` setting — confirmed valid (default 1 MB).
- `max_threads` setting — valid.
- Claim about "Parquet column pruning" (projection pushdown) — accurate.
- MergeTree `PARTITION BY toYYYYMM(...) ORDER BY (...)` syntax — correct.
- `LowCardinality(String)` data type — valid.

## Review Notes
- The HDFS engine remains available in current ClickHouse releases, though many users now favor S3-compatible object storage for new data lakes. The post's guidance (read directly for ad hoc, copy to MergeTree for repeated queries) aligns with ClickHouse best practices.
- The `hdfs dfs -ls` example output is simplified (omits the time column and full path) but is illustrative and not incorrect.
- Newer, more granular buffer settings `max_read_buffer_size_local_fs` and `max_read_buffer_size_remote_fs` exist for per-filesystem-type tuning, but `max_read_buffer_size` still works as a general fallback.
- The post does not discuss the Kerberos-specific config fields in depth; this is intentionally scoped out and noted as a limitation.
