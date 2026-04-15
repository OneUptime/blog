# Validation Summary: How to Use ClickHouse with MySQL as Source via MaterializedMySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MaterializedMySQL database engine)
- MySQL (binlog replication, GTID)
- ReplacingMergeTree (underlying table engine)
- Change Data Capture (CDC)

## Sources Consulted
- ClickHouse official documentation for MaterializedMySQL (archived from GitHub, last version before removal): https://github.com/ClickHouse/ClickHouse/blob/a20ef2a3d073/docs/en/engines/database-engines/materialized-mysql.md
- ClickHouse PR #73879 removing MaterializedMySQL from v25.1+: https://github.com/ClickHouse/ClickHouse/pull/73879
- MySQL documentation on binary log configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL documentation on GTID configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-options-gtids.html

## Issues Found

1. **MaterializedMySQL removed from ClickHouse v25.1+ (Critical):** The engine was removed in December 2024 (PR #73879), making a March 2026 blog post misleading without context. Added a prominent deprecation notice in the Introduction with pointers to alternatives (MySQL table engine, mysql table function, Debezium).

2. **Missing required MySQL configuration (`default_authentication_plugin`, GTID):** The official docs require `default_authentication_plugin = mysql_native_password` and `gtid_mode = ON` / `enforce_gtid_consistency = ON` on the MySQL side. These were missing from the prerequisites. Added them to the MySQL config block with an explanatory note.

3. **`expire_logs_days` deprecated in MySQL 8.0:** Replaced with `binlog_expire_logs_seconds = 604800` (equivalent to 7 days) and added a note about using `expire_logs_days` for MySQL 5.7 and earlier.

4. **Non-existent setting `materialized_mysql_replication_table_do_not_read_from_cache`:** This setting does not exist in ClickHouse documentation. The entire "Filtering Rows with WHERE (Skip Rows)" section referenced it but the code example only showed buffer settings with no actual row filtering. Rewrote the section as "Tuning Buffer Settings" with accurate content.

5. **Non-existent system table `system.materialized_mysql_databases`:** This table does not appear in ClickHouse documentation. Replaced the query with `SELECT name, engine, metadata_path FROM system.databases WHERE engine = 'MaterializedMySQL'`, which is a valid approach.

6. **RENAME COLUMN listed as supported DDL:** Not explicitly documented as supported. Removed from the DDL support table.

7. **GTID presented as optional:** The blog stated "ClickHouse prefers GTID-based replication." The docs indicate GTID is required. Corrected the GTID section to state it is required and consolidated the GTID config into the prerequisites section.

8. **Incorrect claim about automatic FINAL in "22.8+":** The automatic application of `FINAL` and `WHERE _sign = 1` is fundamental behavior of MaterializedMySQL, not a 22.8+ feature. Corrected the explanation to describe this as default behavior.

9. **MySQL version claim "MySQL 5.6+ required":** The official docs do not specify a minimum MySQL version. Replaced this limitation entry with the actual documented requirement (`mysql_native_password` authentication).

10. **Missing `REPLICATION CLIENT` grant:** Added `REPLICATION CLIENT` privilege to the replication user grants, which is typically needed alongside `REPLICATION SLAVE`.

## Review Notes
- The blog covers the core MaterializedMySQL workflow well for users on ClickHouse versions prior to 25.1, but the engine's removal is the dominant concern for any reader in 2026.
- The TABLE OVERRIDE feature (for customizing partitioning, column types, TTLs, skip indexes, projections) is not covered in the blog. This is a significant omission for advanced users but acceptable for an introductory tutorial.
- The blog does not mention that INSERT/DELETE/UPDATE queries cannot be run directly on the ClickHouse-side MaterializedMySQL tables, which could be confusing for beginners.
- Cascade UPDATE/DELETE operations are not visible in MySQL binlog and therefore not captured by MaterializedMySQL — not mentioned in the blog.
