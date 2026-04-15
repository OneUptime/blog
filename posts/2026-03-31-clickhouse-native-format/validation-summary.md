# Validation Summary: How to Use Native Format in ClickHouse for Best Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Native binary format)
- clickhouse-client CLI
- clickhouse-local CLI
- ClickHouse SQL (INTO OUTFILE, file() table function, remoteSecure() table function)
- zstd and lz4 compression utilities
- Bash scripting for backup workflows

## Sources Consulted
- ClickHouse Native format documentation: https://clickhouse.com/docs/en/interfaces/formats#native
- ClickHouse INTO OUTFILE documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/into-outfile
- ClickHouse remoteSecure table function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/remote
- ClickHouse file() table function documentation: https://clickhouse.com/docs/en/sql-reference/table-functions/file
- ClickHouse network ports documentation: https://clickhouse.com/docs/en/guides/sre/network-ports
- ClickHouse NativeWriter/NativeReader source code (block structure verification)

## Issues Found
No technical issues found.

## Review Notes
- The performance comparison table provides illustrative benchmark numbers rather than reproducible benchmarks. The relative ordering (Native fastest for ClickHouse-to-ClickHouse, Parquet best compression, text formats slowest) is accurate, but actual numbers will vary by hardware and data characteristics.
- The `file()` table function examples use unquoted format names (`Native` instead of `'Native'`). Both forms are valid in ClickHouse — the unquoted form is consistent with how `FORMAT Native` is used in standard ClickHouse SQL.
- The post correctly notes that `clickhouse-copier` uses Native format internally, though `clickhouse-copier` is being gradually superseded by ClickHouse Keeper-based approaches in newer versions. This is not an error but a future deprecation to watch.
- Port 9440 for `remoteSecure` is confirmed as the correct default `tcp_port_secure`.
