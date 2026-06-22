# Validation Summary: How to Tune PostgreSQL for OLTP Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL 14+
- PostgreSQL server configuration
- PgBouncer
- SQL indexing and monitoring queries
- pg_stat_statements

## Sources Consulted
- PostgreSQL 18 Documentation: Resource Consumption - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL 18 Documentation: Write Ahead Log - https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL 18 Documentation: Monitoring Statistics - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL 18 Documentation: Query Planning - https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL 18 Documentation: Routine Vacuuming - https://www.postgresql.org/docs/current/routine-vacuuming.html
- PostgreSQL 18 Documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PgBouncer Configuration Documentation - https://www.pgbouncer.org/config.html

## Issues Found
- The checkpoint monitoring example used `pg_stat_bgwriter` and `checkpoints_timed` / `checkpoints_req` without noting that PostgreSQL 17+ moved checkpoint statistics to `pg_stat_checkpointer` with `num_timed` / `num_requested`. Updated the example to cover PostgreSQL 17+ and PostgreSQL 14-16.
- The `wal_level = minimal` example only said to use it when no replication is needed. PostgreSQL documentation also notes that `minimal` is incompatible with WAL archiving/PITR and the server will not start with `max_wal_senders > 0`. Updated the comments and example accordingly.
- The `pg_stat_statements` section showed only `CREATE EXTENSION`, but official documentation requires loading the module with `shared_preload_libraries` and restarting PostgreSQL before it can track statements. Added the required configuration note.
- The "Transactions per second" query returned cumulative transaction counters, not TPS. Updated the label and added `avg_tps_since_reset` based on `pg_stat_database.stats_reset`.

## Review Notes
The tuning values are reasonable starting points, but several settings, including `work_mem`, `max_connections`, `wal_buffers`, autovacuum thresholds, and planner cost constants, should still be validated against the actual workload and hardware. PgBouncer transaction pooling can break session-level features such as session state and some prepared-statement usage patterns, so future revisions could add a caveat, but the configuration keys themselves are valid.
