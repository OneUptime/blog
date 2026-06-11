# Validation Summary: How to Build Index Maintenance Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SQL Server index maintenance
- SQL Server dynamic management views
- PostgreSQL REINDEX and autovacuum
- Python schedule library
- Database maintenance automation

## Sources Consulted
- Microsoft Learn: sys.dm_db_index_physical_stats (Transact-SQL) - https://learn.microsoft.com/en-us/sql/relational-databases/system-dynamic-management-views/sys-dm-db-index-physical-stats-transact-sql
- Microsoft Learn: ALTER INDEX (Transact-SQL) - https://learn.microsoft.com/en-us/sql/t-sql/statements/alter-index-transact-sql
- Microsoft Learn: Maintain indexes optimally to improve performance and reduce resource utilization - https://learn.microsoft.com/en-us/sql/relational-databases/indexes/reorganize-and-rebuild-indexes
- PostgreSQL documentation: REINDEX - https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL documentation: Routine Reindexing - https://www.postgresql.org/docs/current/routine-reindex.html
- PostgreSQL documentation: Vacuuming configuration - https://www.postgresql.org/docs/current/runtime-config-vacuum.html
- schedule documentation: Examples - https://schedule.readthedocs.io/en/stable/examples.html

## Issues Found
- The SQL Server fragmentation query used `LIMITED` scan mode while selecting `avg_page_space_used_in_percent`. Microsoft examples use `SAMPLED` for actionable fragmentation and page-density results, so the query now uses `SAMPLED`.
- The post described B-tree changes as creating "imbalanced tree structures." B-tree indexes remain balanced by design, so this was changed to "fragmented page layouts."
- The fragmentation threshold table and workflow implied fixed thresholds were sufficient. Microsoft recommends considering workload impact and not using fixed thresholds alone, so the wording now frames the thresholds as a starting point and includes page density and measured workload impact.
- The PostgreSQL query claimed to identify bloated indexes, but it only used `pg_stat_user_indexes` and relation size. The wording and comments now describe it as finding large active indexes for further review.
- The Python SQL Server maintenance example generated invalid `ALTER INDEX` statements because SQL Server requires `ALTER INDEX index_name ON schema.table`. The query now returns schema and table names, identifiers are quoted, and the generated statements include `ON schema.table`.
- The Python example used `%s` parameter syntax for a SQL Server-oriented query. It now uses `?`, matching common SQL Server DB-API drivers such as pyodbc.
- The large-table guidance implied `ONLINE = ON` is universally available. SQL Server online index rebuilds have edition and index-type limitations, so the text now says "where supported."
- The resource governor guidance was too SQL Server-specific for a mixed SQL Server/PostgreSQL post. It now refers generally to resource governance where supported.

## Review Notes
The Python script remains illustrative and assumes application-provided functions such as `get_database_connection`, `log_maintenance`, and `run_full_maintenance`. PostgreSQL `REINDEX CONCURRENTLY` is valid for production-style maintenance, but it has documented caveats: it does more work than regular `REINDEX`, cannot run inside a transaction block, and has exclusions such as exclusion constraint indexes.
