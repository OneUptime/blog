# Validation Summary: How to Use mysql() Table Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (mysql() table function)
- MySQL / MariaDB
- SQL (ClickHouse SQL dialect)
- Named Collections (ClickHouse configuration)

## Sources Consulted
- ClickHouse official documentation: mysql() table function — https://clickhouse.com/docs/en/sql-reference/table-functions/mysql
- ClickHouse official documentation: MySQL table engine — https://clickhouse.com/docs/en/engines/table-engines/integrations/mysql
- ClickHouse official documentation: MySQL database engine (type mappings) — https://clickhouse.com/docs/en/engines/database-engines/mysql
- MySQL 8.0 reference manual: GRANT statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found

### 1. Incorrect TINYINT(1) type mapping
- **What was wrong:** The type mapping table claimed `TINYINT(1)` maps to `UInt8` (treated as boolean). According to the official ClickHouse documentation, `TINYINT` (which is signed by default in MySQL) maps to `Int8`, and only `UNSIGNED TINYINT` maps to `UInt8`. The `(1)` display width is a MySQL display hint, not a type modifier, and has no effect on the ClickHouse mapping.
- **What was changed:** Replaced the single `TINYINT(1) → UInt8` row with two accurate rows: `TINYINT → Int8` and `UNSIGNED TINYINT → UInt8`.
- **Why:** The original mapping was incorrect for the default signed TINYINT case and could lead readers to expect wrong column types.

### 2. Deprecated MySQL GRANT ... IDENTIFIED BY syntax
- **What was wrong:** The MySQL permission examples used `GRANT SELECT ON ... TO ... IDENTIFIED BY 'pass'`, which combines user creation and privilege granting in one statement. This syntax was removed in MySQL 8.0 (MySQL 5.7 reached EOL in October 2023).
- **What was changed:** Split into separate `CREATE USER IF NOT EXISTS ... IDENTIFIED BY ...` and `GRANT ... TO ...` statements, which is the correct approach for MySQL 8.0+.
- **Why:** The original syntax would fail on any MySQL 8.0+ server, which is now the standard version in production use.

## Review Notes
- The DECIMAL(p, s) → Decimal(p, s) mapping is accurate but depends on the `mysql_datatypes_support_level` setting including `decimal`, which is enabled by default in recent ClickHouse versions.
- The DATE → Date mapping may actually produce Date32 in newer ClickHouse versions where `mysql_datatypes_support_level` includes `date2Date32` (also enabled by default). The blog's simpler representation is acceptable for an introductory tutorial.
- The predicate pushdown section is correct; only simple comparison operators (=, !=, >, >=, <, <=) are pushed down to MySQL, while more complex expressions are evaluated on the ClickHouse side after fetching data.
- The incremental sync pattern using a subquery against a local table in the WHERE clause is explicitly documented in official ClickHouse docs and is valid.
- Named collections can also be created via SQL (`CREATE NAMED COLLECTION`) in addition to the config.xml approach shown in the blog. Both are valid.
