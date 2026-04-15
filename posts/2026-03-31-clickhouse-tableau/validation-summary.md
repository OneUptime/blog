# Validation Summary: How to Use ClickHouse with Tableau

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (OLAP database)
- ClickHouse JDBC driver (clickhouse-java v0.6.3)
- Tableau Desktop
- Tableau Server
- tabcmd CLI

## Sources Consulted
- ClickHouse JDBC driver source code (ClickHouse/clickhouse-java on GitHub) — verified JDBC URL scheme `jdbc:ch://`, JAR naming conventions, and connection parameters
- ClickHouse official documentation — verified SQL syntax for CREATE USER, GRANT, CREATE SETTINGS PROFILE, MergeTree engine, partitioning, array indexing, and built-in functions (generateUUIDv4, randCanonical, toStartOfMonth, toYYYYMM, etc.)
- Tableau tabcmd documentation — verified `tabcmd publish` flag names (`--db-username`, `--db-password`, `--save-db-password`)
- Tableau JDBC driver installation documentation — verified driver directory paths for macOS, Windows, and Linux

## Issues Found
1. **`compress=1` in JDBC URL parameters**: The ClickHouse JDBC driver expects boolean values (`true`/`false`) for the `compress` parameter, not integer `1`/`0`. Changed `compress=1` to `compress=true`.
2. **`--db-user` flag in `tabcmd publish`**: The correct flag name is `--db-username`, not `--db-user`. Changed `--db-user` to `--db-username`.

## Review Notes
- The post recommends `IDENTIFIED WITH plaintext_password` for the ClickHouse user. While syntactically correct, production deployments should prefer `sha256_password` or `bcrypt_password` for better security. This is acceptable for a tutorial context.
- The post recommends selecting "MySQL" as the SQL dialect in Tableau's JDBC connector. ClickHouse Inc. now provides a dedicated Tableau connector (TACO file) that offers better compatibility than the generic JDBC path. A future update could mention this as an alternative.
- The `use_query_cache` and `query_cache_ttl` settings require ClickHouse 23.1+. The post does not mention version requirements, which could cause confusion for users on older versions.
