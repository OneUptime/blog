# Validation Summary: How to Create an Invisible Index in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- MySQL invisible indexes
- MySQL optimizer switches
- MySQL information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Invisible Indexes — https://dev.mysql.com/doc/refman/8.0/en/invisible-indexes.html
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: SHOW INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/show-index.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: Switchable Optimizations — https://dev.mysql.com/doc/refman/8.0/en/switchable-optimizations.html

## Issues Found
No technical issues found.

## Review Notes
- The post mentions that invisible indexes are "maintained by InnoDB on every write." While this is accurate for the default storage engine, invisible indexes are a server-level feature that works with any storage engine supporting indexes, not just InnoDB. This is not incorrect given MySQL 8's default engine, but readers using other engines should know the feature still applies.
- All SQL syntax (`CREATE INDEX ... INVISIBLE`, `ALTER TABLE ... ALTER INDEX ... INVISIBLE/VISIBLE`, `SET SESSION optimizer_switch`, `information_schema.STATISTICS.IS_VISIBLE`) is correct for MySQL 8.0+.
- The workflow recommendation (invisible → observe → drop or restore) aligns with MySQL's official documentation and best practices.
- The limitation about primary keys not being invisible is accurate. A related nuance not mentioned: if there is no explicit primary key, a `UNIQUE NOT NULL` index serving as the implicit clustered index also cannot be made invisible.
