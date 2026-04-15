# Validation Summary: How to Configure ClickHouse MySQL Protocol Compatibility

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MySQL protocol compatibility interface)
- MySQL CLI client
- Python mysql-connector library
- DBeaver
- MySQL Workbench
- UFW (firewall)

## Sources Consulted
- ClickHouse MySQL Interface documentation: https://clickhouse.com/docs/en/interfaces/mysql
- ClickHouse system.processes documentation: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse server configuration reference for `mysql_port`

## Issues Found

1. **Authentication requirements overstated**: The post originally stated that the MySQL protocol "requires `double_sha1_password` authentication" and that "SHA256 passwords (the default)" cannot authenticate. This is incorrect — ClickHouse's MySQL interface supports both `double_sha1_password` and `sha256_password`. The `sha256_password` type maps to MySQL's `caching_sha2_password` plugin, which works with MySQL 8.0+ clients. The text was corrected to recommend `double_sha1_password` for broadest compatibility while noting that `sha256_password` also works, and clarifying that it is `plaintext_password` (not `sha256_password`) that cannot be used with the MySQL interface.

2. **Monitoring query used string comparison on UInt8 column**: The `system.processes` query used `WHERE interface = 'MySQL'`, but the `interface` column is `UInt8`, not an Enum type. The MySQL interface corresponds to the integer value `4`. Changed to `WHERE interface = 4`.

## Review Notes
- The default port 9004 is correct for self-managed ClickHouse. ClickHouse Cloud uses port 3306 for MySQL compatibility — this distinction is not mentioned but is outside the scope of the post which focuses on self-hosted configuration.
- The Python code example uses ClickHouse-specific SQL (`count()` without arguments, `today() - 1`) which works correctly through the MySQL interface but would not work on an actual MySQL server. This is appropriate for the post's context.
- The `<mysql_port>` configuration element and XML format are correct.
- The known limitations table is accurate — ClickHouse does not support transactions, stored procedures, AUTO_INCREMENT, or foreign keys through any interface.
