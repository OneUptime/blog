# Validation Summary: How to Use MySQL Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MySQL table engine, mysql() table function, MergeTree engine)
- MySQL (as remote data source)
- SQL (DDL, DML, federated queries)

## Sources Consulted
- ClickHouse documentation: MySQL table engine — https://clickhouse.com/docs/en/engines/table-engines/integrations/mysql
- ClickHouse documentation: mysql() table function — https://clickhouse.com/docs/en/sql-reference/table-functions/mysql
- ClickHouse documentation: Type mapping for MySQL — https://clickhouse.com/docs/en/engines/table-engines/integrations/mysql#data-types-mapping
- ClickHouse documentation: system.query_log — https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
1. **Misleading comment about DELETE support** (line 140): The comment "Update via DELETE + INSERT (ClickHouse does not support UPDATE via MySQL engine)" implied that DELETE was supported through the MySQL engine as part of an update workaround. In fact, the MySQL table engine only supports SELECT and INSERT — neither UPDATE nor DELETE is supported. Fixed the comment to clarify that both UPDATE and DELETE are unsupported, and to direct users to perform those operations directly on MySQL.

## Review Notes
- The CREATE TABLE syntax for the MySQL engine (`MySQL('host:port', 'database', 'table', 'user', 'password')`) is correct.
- The WHERE pushdown explanation is accurate: simple, MySQL-compatible predicates are pushed down, while ClickHouse-specific functions like `toYYYYMM()` are not.
- The type mapping table is accurate (UInt32/INT UNSIGNED, String/VARCHAR, Float64/DOUBLE, Decimal/DECIMAL, UInt8/TINYINT, Date/DATE, DateTime/DATETIME, String/TEXT+JSON).
- The `mysql()` table function syntax and usage is correct.
- The incremental refresh pattern using `WHERE updated_at > (SELECT max(updated_at) FROM orders_local)` is a common and valid approach, though users should be aware it may produce duplicates if multiple rows share the same `updated_at` value and the previous batch didn't capture all of them.
- The MergeTree table definition with `PARTITION BY toYYYYMM()` and `ORDER BY` is valid ClickHouse syntax.
- The limitations section is accurate and comprehensive for the scope of the post.
