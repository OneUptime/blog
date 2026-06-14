# Validation Summary: How to Use Vacuum and Analyze in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL VACUUM
- PostgreSQL ANALYZE
- PostgreSQL autovacuum configuration
- PostgreSQL monitoring views
- PostgreSQL pgstattuple extension
- pg_repack
- psql scripting

## Sources Consulted
- PostgreSQL VACUUM documentation: https://www.postgresql.org/docs/current/sql-vacuum.html
- PostgreSQL ANALYZE documentation: https://www.postgresql.org/docs/current/sql-analyze.html
- PostgreSQL vacuum/autovacuum configuration documentation: https://www.postgresql.org/docs/current/runtime-config-vacuum.html
- PostgreSQL cumulative statistics and progress reporting documentation: https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL pgstattuple documentation: https://www.postgresql.org/docs/current/pgstattuple.html
- PostgreSQL psql documentation for \gexec: https://www.postgresql.org/docs/current/app-psql.html
- pg_repack documentation: https://reorg.github.io/

## Issues Found
- The maintenance script used a PL/pgSQL `DO` block to run `VACUUM ANALYZE` dynamically. PostgreSQL documents that `VACUUM` cannot be executed inside a transaction block, and this pattern would fail. Changed it to generate `VACUUM ANALYZE` statements with `SELECT format(...)` and execute them through psql `\gexec`.
- The maintenance-window example created a PL/pgSQL function that executed `VACUUM FULL` dynamically. This has the same transaction/function execution problem as the `DO` block. Changed it to a psql `\gexec` example that generates and runs `VACUUM FULL` statements.
- The autovacuum status query was labeled as showing tables "waiting for vacuum", but `pg_stat_user_tables` dead tuple counts identify likely candidates, not an actual waiting queue. Changed the comment to "tables with many dead tuples."
- The pg_repack section said repacking runs "without locking." pg_repack avoids holding an exclusive lock for the full rewrite, but it still needs brief locks. Updated the wording to say it rewrites online with only brief locks and avoids a long `ACCESS EXCLUSIVE` lock.

## Review Notes
The remaining examples and explanations align with current PostgreSQL documentation. `VACUUM FULL` remains appropriate only for maintenance windows because it rewrites the table and takes an `ACCESS EXCLUSIVE` lock. `pg_stat_progress_vacuum` covers regular `VACUUM`; PostgreSQL reports `VACUUM FULL` progress through `pg_stat_progress_cluster`.
