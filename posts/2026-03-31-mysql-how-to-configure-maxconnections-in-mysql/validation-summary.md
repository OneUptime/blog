# Validation Summary: How to Configure max_connections in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (max_connections system variable)
- ProxySQL (connection pooling)
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — max_connections (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_max_connections)
- MySQL 8.0 Reference Manual: Performance Schema accounts Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-accounts-table.html)
- MySQL 8.0 Reference Manual: ALTER USER Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-user.html)
- ProxySQL Documentation: Configuration file (https://proxysql.com/documentation/configuration-file/)

## Issues Found
1. **ASCII table formatting error in SHOW VARIABLES output**: The separator lines in the example output had three column divisions (`+-------+---------+-------+`) instead of two, which didn't match the two-column header. Fixed to use consistent two-column separators (`+-----------------+-------+`).

2. **Misleading PgBouncer reference**: The post mentioned "ProxySQL or PgBouncer (for MySQL: ProxySQL)" as connection pooling options. PgBouncer is exclusively a PostgreSQL connection pooler and does not work with MySQL. Removed the PgBouncer reference to avoid confusing readers.

3. **Incorrect ProxySQL configuration format**: The ProxySQL config snippet used INI-style format (`[mysql_servers]` with key=value pairs), which is not how ProxySQL is configured. ProxySQL uses its own configuration file format with parenthesized blocks and curly-brace objects. Fixed to use the correct ProxySQL config file syntax.

4. **Wrong column name in Performance Schema query**: The query used `count_star AS total_connections` to select from `performance_schema.accounts`, but the `accounts` table has no `count_star` column. The correct column name is `total_connections`. Fixed the query accordingly.

## Review Notes
- The memory calculation formula is a commonly cited rough approximation. In practice, per-connection memory usage varies significantly depending on workload (e.g., temporary tables, large sorts). The post appropriately labels it as a "rough formula."
- The claim that ProxySQL can handle "10,000 frontend connections while using only 100 backend connections" is a general capability claim, not a guaranteed number — it depends on configuration and workload. This is acceptable as a general illustration.
- The post covers MySQL 5.7+ and 8.0 well. The `CONNECTION_ADMIN` privilege mentioned alongside `SUPER` was introduced in MySQL 8.0; the `SUPER` privilege is deprecated in MySQL 8.0 but still functional. This is fine as stated.
