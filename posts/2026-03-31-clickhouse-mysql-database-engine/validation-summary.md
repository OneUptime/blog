# Validation Summary: How to Use MySQL Database Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MySQL database engine)
- MySQL
- Federated queries / external database engines

## Sources Consulted
- ClickHouse MySQL database engine documentation: https://clickhouse.com/docs/en/engines/database-engines/mysql
- ClickHouse PostgreSQL database engine documentation: https://clickhouse.com/docs/en/engines/database-engines/postgresql
- ClickHouse database engines index: https://clickhouse.com/docs/en/engines/database-engines

## Issues Found

1. **False claim about PostgreSQL INSERT support (HIGH):** The post stated "Unlike PostgreSQL database engine, the MySQL database engine supports INSERT." This is incorrect — the PostgreSQL database engine also supports INSERT. Removed the false comparison, keeping only the factual statement that MySQL engine supports INSERT.

2. **MaterializedMySQL recommendation (HIGH):** The post recommended MaterializedMySQL as an alternative for production analytics in two places (Performance section and Summary). MaterializedMySQL is no longer listed in the current ClickHouse database engines documentation and appears to have been removed or deprecated. Replaced with a generic recommendation to replicate MySQL data into native ClickHouse tables.

3. **Incorrect type mapping: DECIMAL -> Decimal (LOW):** The official MySQL engine docs do not map MySQL DECIMAL to ClickHouse Decimal. DECIMAL falls under "all other types -> String." Removed DECIMAL from the mapping table and added a note that most other types (including DECIMAL, TEXT, JSON) map to String.

4. **Misleading type mapping: TINYINT(1) -> UInt8 (LOW):** The official docs map UNSIGNED TINYINT -> UInt8 and plain TINYINT -> Int8. The blog used MySQL's display-width notation TINYINT(1) which is a convention for booleans but not how ClickHouse maps types. Corrected to show both UNSIGNED TINYINT -> UInt8 and TINYINT -> Int8.

5. **Missing documented limitations (MEDIUM):** The official docs explicitly state that RENAME, CREATE TABLE, and ALTER are not supported. Added these to the Performance and Limitations section, replacing the MaterializedMySQL recommendation line.

## Review Notes
- The predicate pushdown section describes behavior that is plausible but not explicitly documented in the official ClickHouse MySQL database engine docs. It is left as-is since simple predicate pushdown is a common behavior in federated query engines, but readers should note this is not a guaranteed, documented feature.
- The post does not mention configurable connection settings (`read_write_timeout`, `connect_timeout`) which are documented. This is a minor omission, not an error.
