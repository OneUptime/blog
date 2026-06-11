# Validation Summary: How to Implement Index Optimization

## Status
validated

## Post Type
Technical tutorial / database performance guide

## Technologies Covered
- PostgreSQL
- MySQL
- SQL indexing
- Query execution plans
- Database performance monitoring

## Sources Consulted
- PostgreSQL documentation: Error Reporting and Logging (`log_min_duration_statement`) - https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL documentation: `pg_stat_statements` - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation: Cumulative Statistics System (`pg_stat_user_indexes`, `pg_statio_user_indexes`, `pg_stat_reset`) - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL documentation: `CREATE INDEX`, `INCLUDE`, and `CONCURRENTLY` - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: Index-Only Scans and Covering Indexes - https://www.postgresql.org/docs/current/indexes-index-only-scans.html
- PostgreSQL documentation: `REINDEX` - https://www.postgresql.org/docs/current/sql-reindex.html
- PostgreSQL documentation: `pgstattuple` and `pgstatindex` - https://www.postgresql.org/docs/current/pgstattuple.html
- MySQL 8.4 Reference Manual: The Slow Query Log - https://dev.mysql.com/doc/refman/8.4/en/slow-query-log.html
- MySQL 8.4 Reference Manual: Performance Schema query profiling and timer units - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-query-profiling.html
- MySQL 8.4 Reference Manual: Table I/O and Lock Wait Summary Tables - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-table-wait-summary-tables.html
- MySQL 8.4 Reference Manual: EXPLAIN Output Format - https://dev.mysql.com/doc/refman/8.4/en/explain-output.html
- MySQL 8.4 Reference Manual: Invisible Indexes - https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html
- MySQL 8.4 Reference Manual: Generated Columns - https://dev.mysql.com/doc/refman/8.4/en/create-table-generated-columns.html
- MySQL Reference Manual: OPTIMIZE TABLE - https://dev.mysql.com/doc/refman/8.4/en/optimize-table.html

## Issues Found
- PostgreSQL index removal section recommended directly updating `pg_index.indisvalid` to disable an index. This is not a supported production workflow or an equivalent to MySQL invisible indexes. Replaced it with dependency checking through `pg_constraint` and `DROP INDEX CONCURRENTLY`.
- Covering index wording claimed table lookups are eliminated entirely. Updated it to explain that PostgreSQL index-only scans depend on visibility map state, while MySQL reports covering access with `Using index`.
- PostgreSQL `INCLUDE` wording said payload columns are not part of the B-tree structure. Clarified that INCLUDE columns are stored in leaf tuples but are not part of the searchable B-tree key.
- Composite index wording stated range conditions stop all subsequent index use. Softened this to reflect optimizer-dependent behavior and data distribution.
- PostgreSQL bloat query was labeled as estimating bloat percentage but only listed large indexes, and the original query used ambiguous column references. Rewrote it as a large-index candidate query using `pg_stat_user_indexes`.
- Rebuild example used plain `DROP INDEX` after creating a replacement index concurrently. Changed it to `DROP INDEX CONCURRENTLY` to match the production-safe intent.
- MySQL generated-column workaround was presented as a partial index equivalent. Clarified that MySQL has no native partial indexes and that generated-column indexes only help when queries filter on the generated value explicitly.
- PostgreSQL `pg_stat_statements` setup omitted the requirement that the module be loaded through `shared_preload_libraries` before it can track statements. Added that caveat.
- General wording claimed every index speeds up reads. Changed it to "can speed up matching reads" to avoid an overbroad claim.

## Review Notes
The examples are intentionally generic and assume representative table schemas exist. Several thresholds in the post, such as index count limits, cache hit-rate targets, and bloat alert levels, are operational heuristics rather than database guarantees.
