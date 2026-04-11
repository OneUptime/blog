# Validation Summary: How to Create a Temporary Table in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0 and earlier versions)
- SQL (DDL: CREATE TEMPORARY TABLE, DROP TEMPORARY TABLE)
- MySQL storage engines (InnoDB, MEMORY, TempTable)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TEMPORARY TABLE — https://dev.mysql.com/doc/refman/8.0/en/create-temporary-table.html
- MySQL 8.0 Reference Manual: Server System Variables (default_tmp_storage_engine) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_tmp_storage_engine
- MySQL 8.0 Reference Manual: Internal Temporary Table Use (internal_tmp_mem_storage_engine / TempTable engine) — https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html
- MySQL 8.0 Reference Manual: The MEMORY Storage Engine — https://dev.mysql.com/doc/refman/8.0/en/memory-storage-engine.html
- MySQL 8.0 Reference Manual: Server System Variables (max_heap_table_size, tmp_table_size) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_heap_table_size

## Issues Found

1. **Incorrect default storage engine for user-created temporary tables (line 94)**
   - **What was wrong:** The post stated that temporary tables use the `TempTable` storage engine by default in MySQL 8.0, and the `MEMORY` engine in older versions. The `TempTable` engine is actually the internal storage engine used by the MySQL optimizer for implicit internal temporary tables (controlled by `internal_tmp_mem_storage_engine`), not for user-created temporary tables. User-created temporary tables default to `InnoDB` in MySQL 8.0, controlled by the `default_tmp_storage_engine` system variable.
   - **What was changed:** Corrected the paragraph to state that user-created temporary tables default to `InnoDB` in MySQL 8.0, controlled by `default_tmp_storage_engine`.
   - **Why:** Conflating the TempTable internal engine with user-created temporary table defaults would mislead readers about MySQL's storage engine behavior.

2. **Incorrect MEMORY engine size limits (line 174)**
   - **What was wrong:** The post stated that MEMORY engine temp tables are limited by both `max_heap_table_size` and `tmp_table_size`. For user-created MEMORY tables, only `max_heap_table_size` applies. The `tmp_table_size` variable controls the size of internal temporary tables created by the optimizer, not user-created ones.
   - **What was changed:** Removed `tmp_table_size` from the limitation, leaving only `max_heap_table_size`.
   - **Why:** Mentioning `tmp_table_size` in the context of user-created temporary tables is misleading since it only governs internal (optimizer-created) temporary tables.

## Review Notes
- The limitation "Cannot be referenced more than once in the same query" is accurate for MySQL but is worth noting as a MySQL-specific restriction — other databases (e.g., PostgreSQL) do not have this limitation.
- The `HAVING total_spent > 1000` clause using a column alias is valid MySQL syntax (MySQL extends standard SQL to allow alias references in HAVING), but would not work in all SQL databases.
- All SQL code examples are syntactically correct and demonstrate good practices.
- The mermaid diagram and overall structure are clear and well-organized.
