# Validation Summary: How to Use SHOW OPEN TABLES in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (SHOW OPEN TABLES statement)
- MySQL table cache (table_open_cache)
- MySQL status variables (Open_tables, Opened_tables)
- FLUSH TABLES command

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW OPEN TABLES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-open-tables.html
- MySQL 8.0 Reference Manual: Server System Variables (table_open_cache) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_table_open_cache
- MySQL 8.0 Reference Manual: Server Status Variables (Open_tables, Opened_tables) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found
1. **Incorrect description of what SHOW OPEN TABLES shows (intro paragraph):** The post stated that the command shows "how many times they have been opened." This is incorrect — the `In_use` column shows the number of table locks or lock requests, not an open count. Changed to "how many table locks or lock requests exist for each table."

2. **Inaccurate In_use column description:** The post described `In_use` as "The number of table instances currently in use by active queries." Per MySQL documentation, `In_use` is "The number of table locks or lock requests there are for the table." This is a meaningful distinction because the count includes pending lock requests from blocked sessions, not just active queries. Updated to accurately reflect locks and lock requests.

## Review Notes
- The SQL syntax examples (`SHOW OPEN TABLES`, `FROM`, `LIKE`, `WHERE` clauses) are all correct.
- The `Name_locked` column description is accurate.
- The table cache monitoring advice (comparing `Opened_tables` growth to `Open_tables`) is sound and well-explained.
- The `FLUSH TABLES` verification workflow is correct.
- The summary references `SHOW STATUS LIKE 'table_open_cache%'` which matches the `Table_open_cache_hits`, `Table_open_cache_misses`, and `Table_open_cache_overflows` status variables available in MySQL 5.6.6+. This is valid.
