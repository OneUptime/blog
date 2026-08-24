# Validation Summary: How to Measure PostgreSQL Buffer-Cache Effectiveness Without Mistaking the OS Page Cache for Disk Reads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL cumulative statistics (`pg_stat_database` and `pg_statio_user_tables`)
- PostgreSQL `pg_stat_io` and I/O timing settings
- PostgreSQL `pg_stat_statements`
- PostgreSQL `pg_buffercache`
- PostgreSQL `EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)`
- Operating-system page cache and block-device monitoring

## Sources Consulted
- PostgreSQL 18 cumulative statistics and `pg_stat_io`: https://www.postgresql.org/docs/18/monitoring-stats.html
- PostgreSQL 16 cumulative statistics and `pg_stat_io`: https://www.postgresql.org/docs/16/monitoring-stats.html
- PostgreSQL 16 release notes: https://www.postgresql.org/docs/16/release-16.html
- PostgreSQL 17 release notes: https://www.postgresql.org/docs/17/release-17.html
- PostgreSQL 18 release notes: https://www.postgresql.org/docs/18/release-18.html
- PostgreSQL statistics collection settings: https://www.postgresql.org/docs/18/runtime-config-statistics.html
- PostgreSQL `pg_stat_statements`: https://www.postgresql.org/docs/18/pgstatstatements.html
- PostgreSQL `EXPLAIN`: https://www.postgresql.org/docs/18/sql-explain.html
- PostgreSQL `pg_buffercache` documentation for versions 18, 16, and 15: https://www.postgresql.org/docs/18/pgbuffercache.html, https://www.postgresql.org/docs/16/pgbuffercache.html, https://www.postgresql.org/docs/15/pgbuffercache.html
- PostgreSQL database object location functions, `pg_class`, and storage layout: https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-DBOBJECT, https://www.postgresql.org/docs/18/catalog-pg-class.html, https://www.postgresql.org/docs/18/storage-file-layout.html
- PostgreSQL buffer access strategy glossary: https://www.postgresql.org/docs/18/glossary.html#GLOSSARY-BUFFER-ACCESS-STRATEGY
- PostgreSQL aggregate and `ORDER BY` behavior: https://www.postgresql.org/docs/18/functions-aggregate.html, https://www.postgresql.org/docs/18/queries-order.html
- PostgreSQL `pg_basebackup`: https://www.postgresql.org/docs/18/app-pgbasebackup.html
- PostgreSQL source for buffer accounting, database aggregation, and statistics-view definitions: https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/storage/buffer/bufmgr.c, https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/utils/activity/pgstat_relation.c, https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/catalog/system_views.sql

## Issues Found
1. **The database-wide ratio was labeled as a strict shared-buffer ratio.** `pg_stat_database.blks_hit` and `blks_read` also include accesses to temporary relations, which use per-session local buffers. The post now calls the calculation `database_buffer_hit_ratio` and explains the shared-versus-local distinction in the introduction, counter description, dashboard, and conclusion.
2. **`blks_read` was described too narrowly as blocks actually read.** PostgreSQL derives this value from fetched blocks minus buffer hits, and some misses are satisfied by zero-filling a buffer rather than reading existing contents. The post now describes the counter as fetched blocks without a relation-buffer hit and lists zero-filled pages as another reason for low read time.
3. **The relation query could sort unindexed tables incorrectly.** `idx_blks_read` can be `NULL` for a table with no indexes, and descending order places null sort keys first. The query now uses `COALESCE(idx_blks_read, 0)`.
4. **The top-30 relation query was presented next to interval-delta advice without warning about selection bias.** Storing only the cumulative top 30 can omit a newly hot relation from either endpoint, and relation names alone are not robust sampling identities. The query now returns `relid`, and the post identifies it as a lifetime snapshot and says to collect all relation rows keyed by `relid` before calculating, ranking, and limiting interval deltas.
5. **The `pg_stat_io` wording mixed versions and dimensions.** `pg_stat_io` exists only in PostgreSQL 16 and later; versions 16 and 17 expose `op_bytes`, while PostgreSQL 18 replaced it with direct `read_bytes`, `write_bytes`, and `extend_bytes` totals. In addition, `checkpointer` is a backend type rather than an I/O context. The post now states the version-specific byte behavior and separates backend-type comparisons from context comparisons.
6. **Near-zero timing was ambiguous when timing collection was disabled or enabled for only part of an interval.** Timing counters are zero when their timing setting is disabled. The inference now explicitly requires timing to have been enabled throughout the measured interval.
7. **The `pg_buffercache` summary-function advice lacked a version boundary.** `pg_buffercache_summary()` and `pg_buffercache_usage_counts()` are available in PostgreSQL 16 and later but not PostgreSQL 15. The recommendation is now qualified accordingly.
8. **The unqualified backup example could be read as including physical base backups.** `pg_basebackup` copies database files without scanning them through relation buffers, so it does not directly produce these hit/read counters. The example now says “logical backup.”

## Review Notes
- PostgreSQL preserves cumulative statistics across a clean restart; an unclean shutdown, startup from a base backup, or point-in-time recovery resets them. Rejecting every restart interval, as the post recommends, is conservative but safe.
- The `pg_buffercache` relation join follows PostgreSQL's official example. It can still misattribute filenode collisions across tablespaces or shared/current-database relations, and it aggregates all forks; the post already discloses these limitations.
- Installing `pg_buffercache` normally requires elevated privileges. After installation, its inspection functions are available by default to superusers and roles with `pg_monitor` privileges.
- PostgreSQL 18 asynchronous I/O can also yield low backend read-wait time when I/O is overlapped. The post's wording remains correct because it presents OS-cache service and fast storage as possible explanations rather than an exhaustive list.
