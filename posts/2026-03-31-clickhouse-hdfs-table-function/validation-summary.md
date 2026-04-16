# Validation Summary: How to Use hdfs() Table Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- Hadoop HDFS (Hadoop Distributed File System)
- SQL table functions
- Parquet, CSV, JSONEachRow, ORC file formats
- Kerberos authentication

## Sources Consulted
- ClickHouse HDFS Table Function docs: https://clickhouse.com/docs/en/sql-reference/table-functions/hdfs
- ClickHouse HDFS Table Engine docs (for configuration options): https://clickhouse.com/docs/en/engines/table-engines/integrations/hdfs

## Issues Found
No technical issues found.

- The `hdfs(URI, format[, structure])` signature matches the official documentation.
- The URI format `hdfs://namenode:9000/path/to/file` matches documented example (`hdfs://hdfs1:9000/path/to/file`).
- Supported glob patterns shown in the post (`{1,2,3}` and `*`) are valid per the docs, which list `*`, `?`, `{abc,def}`, and `{N..M}`.
- The formats mentioned (Parquet, CSV, TSV, JSONEachRow, ORC) are all supported by ClickHouse.
- Kerberos configuration keys (`hadoop_kerberos_keytab`, `hadoop_kerberos_principal`, `hadoop_security_authentication`) match the documented XML settings under the `<hdfs>` section.
- `DESCRIBE TABLE hdfs(...)` is valid ClickHouse syntax for inspecting the inferred schema of a table function.
- `INSERT INTO ... SELECT ... FROM hdfs(...)` is a valid migration pattern.

## Review Notes
- The post uses `'simple'` as the value for `hadoop_security_authentication` in the non-Kerberos example. This is the standard Hadoop default; the ClickHouse docs primarily discuss Kerberos configuration but the `simple` value is the conventional Hadoop setting and works as shown.
- The post correctly distinguishes between the `hdfs()` table function (ad hoc access) and the HDFS table engine (for regular/high-frequency access) in the summary.
- Code blocks using `text` for XML configuration snippets are fine, though `xml` would provide syntax highlighting — this is a stylistic choice, not a technical issue.
