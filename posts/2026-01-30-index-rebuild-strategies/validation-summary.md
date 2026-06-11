# Validation Summary: How to Implement Index Rebuild Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SQL Server index maintenance and `ALTER INDEX`
- PostgreSQL `REINDEX`, `REINDEX CONCURRENTLY`, `pgstattuple`, and index usage statistics
- MySQL/InnoDB index metadata and online DDL
- Python monitoring with `psycopg2`

## Sources Consulted
- Microsoft Learn: Maintain indexes optimally to improve performance and reduce resource consumption - https://learn.microsoft.com/en-us/sql/relational-databases/indexes/reorganize-and-rebuild-indexes
- Microsoft Learn: `sys.dm_db_index_physical_stats` - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-index-physical-stats-transact-sql
- Microsoft Learn: `ALTER INDEX` Transact-SQL - https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-index-transact-sql
- Microsoft Learn: Perform index operations online - https://learn.microsoft.com/en-us/sql/relational-databases/indexes/perform-index-operations-online
- PostgreSQL documentation: `REINDEX` - https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL documentation: `pgstattuple` - https://www.postgresql.org/docs/current/pgstattuple.html
- PostgreSQL documentation: cumulative statistics views including `pg_stat_user_indexes` - https://www.postgresql.org/docs/current/monitoring-stats.html
- MySQL 8.4 Reference Manual: InnoDB online DDL operations - https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html
- MySQL 8.4 Reference Manual: rebuilding or repairing tables or indexes - https://dev.mysql.com/doc/refman/8.4/en/rebuilding-tables.html
- MySQL 8.4 Reference Manual: `OPTIMIZE TABLE` - https://dev.mysql.com/doc/refman/8.4/en/optimize-table.html
- psycopg2 documentation: connection and cursor usage - https://www.psycopg.org/docs/

## Issues Found
- The MySQL statistics section implied that `INFORMATION_SCHEMA.STATISTICS` provides fragmentation measurements. Changed the wording to clarify that it provides metadata and cardinality estimates, not a SQL Server-style fragmentation percentage.
- The SQL Server offline rebuild example said `SORT_IN_TEMPDB = ON` reduces log growth. Changed the comment to accurately state that it uses `tempdb` for intermediate sort results.
- The PostgreSQL offline rebuild example used `REINDEX INDEX CONCURRENTLY` while saying it locks writes. Changed it to plain `REINDEX INDEX`, matching PostgreSQL's locking behavior for a non-concurrent rebuild.
- The decision-flow diagram described SQL Server online rebuild as "Row-Level Locking". Changed that label to "Concurrent Access" because online index operations allow concurrent access but still use table-level/schema locks during phases of the operation.
- The SQL Server online rebuild example placed `WAIT_AT_LOW_PRIORITY` as a separate rebuild option. Moved it under `ONLINE = ON (...)`, which is the documented `ALTER INDEX` syntax.
- The MySQL online rebuild example described `DROP INDEX` and `ADD INDEX` as "Instant DDL". Changed this to "Online DDL" because adding and dropping secondary indexes are online/in-place operations for supported InnoDB cases, not generally instant.
- The Python monitoring section said it checked fragmentation thresholds, but the query checked low index usage from `pg_stat_user_indexes`. Updated the docstring and log message to describe usage monitoring accurately and removed the unused fragmentation threshold field.

## Review Notes
The SQL Server 10%/30% thresholds match common Microsoft examples and guidance, but Microsoft now emphasizes page density, workload measurement, and resource tradeoffs over blindly applying fragmentation thresholds. The MySQL examples are valid for typical InnoDB secondary indexes, but online DDL support has limitations for primary keys, full-text indexes, and some table definitions.
