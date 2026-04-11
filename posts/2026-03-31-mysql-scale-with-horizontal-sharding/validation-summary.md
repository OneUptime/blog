# Validation Summary: How to Scale MySQL with Horizontal Sharding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB engine)
- Python (mysql-connector-python library)
- Horizontal sharding / database partitioning concepts
- information_schema system tables
- Vitess and PlanetScale (mentioned as production tools)

## Sources Consulted
- MySQL 8.0 Reference Manual: information_schema.TABLES table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html) — verified that TABLE_ROWS is the correct column for row count estimates, and that COUNT(*) on this view returns the number of tables, not data rows.
- MySQL 8.0 Reference Manual: CREATE TABLE syntax (https://dev.mysql.com/doc/refman/8.0/en/create-table.html) — verified BIGINT UNSIGNED, DATETIME DEFAULT CURRENT_TIMESTAMP, ENGINE=InnoDB syntax.
- MySQL Connector/Python Developer Guide (https://dev.mysql.com/doc/connector-python/en/) — verified mysql.connector.connect() parameters, cursor(dictionary=True), parameterized query syntax with %s placeholders.
- Vitess documentation (https://vitess.io/docs/) — confirmed Vitess supports automated resharding for MySQL.

## Issues Found
1. **Monitoring query used `COUNT(*)` instead of `SUM(TABLE_ROWS)`**: The query in the "Monitoring Shard Balance" section used `COUNT(*)` aliased as `row_count`, but `COUNT(*)` on `information_schema.TABLES` returns the number of tables in the schema, not the number of data rows. Changed to `SUM(TABLE_ROWS)` which returns the estimated total row count across all tables in the database — the correct metric for comparing shard balance.

## Review Notes
- The `UNIQUE KEY uk_email (email)` on the users table is only enforced per-shard, not globally across shards. Two users on different shards could have the same email. This is a known sharding trade-off and not an error, but readers implementing this should be aware they need an application-level or external mechanism for global uniqueness if required.
- `TABLE_ROWS` in InnoDB is an estimate, not an exact count. The post's use case (comparing relative shard balance) is appropriate for this approximation.
- The Python code creates persistent connections at module load time without connection pooling or error handling. Acceptable for a tutorial but not production-ready as-is.
