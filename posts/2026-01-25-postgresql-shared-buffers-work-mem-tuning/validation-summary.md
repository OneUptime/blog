# Validation Summary: How to Tune shared_buffers and work_mem in PostgreSQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL configuration
- PostgreSQL memory tuning
- SQL monitoring queries
- PostgreSQL extensions: pg_buffercache and pg_stat_statements
- Linux sysctl and systemd commands

## Sources Consulted
- PostgreSQL Documentation: Resource Consumption - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL Documentation: Query Planning / effective_cache_size - https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL Documentation: pg_buffercache - https://www.postgresql.org/docs/current/pgbuffercache.html
- PostgreSQL Documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL Documentation: pg_backend_memory_contexts - https://www.postgresql.org/docs/current/view-pg-backend-memory-contexts.html
- PostgreSQL Documentation: Monitoring Statistics - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL Documentation: Managing Kernel Resources - https://www.postgresql.org/docs/current/kernel-resources.html

## Issues Found
- The `SHOW shared_buffers` follow-up comment said "View in bytes", but `pg_settings.setting` is reported in the setting's unit, not directly in bytes. Changed the comment to "View raw setting and unit."
- The `pg_buffercache` query joined only on `relfilenode`, which PostgreSQL documentation warns can produce incorrect joins because the buffer cache is shared across databases. Added the documented `reldatabase` filter, included schema names, and used `current_setting('block_size')` instead of assuming 8192-byte blocks.
- The `work_mem` explanation did not mention that hash operations can use `work_mem * hash_mem_multiplier`. Added that caveat and changed the formula to use active connections rather than all configured connections.
- The `pg_stat_statements` example created the extension but did not note that the module must be loaded through `shared_preload_libraries` and requires a server restart. Added a comment before the extension command.
- The `maintenance_work_mem` comment said these operations run one at a time. That is not guaranteed because concurrent maintenance operations and autovacuum workers can run. Updated the comment to mention concurrency.
- The memory monitoring query used `pg_backend_memory_contexts()` as if it were a function and claimed to show all PostgreSQL process memory. Current PostgreSQL documents `pg_backend_memory_contexts` as a view for the current session. Updated the queries to use the view and adjusted the description to current-session memory contexts.

## Review Notes
The sizing tables remain heuristic guidance rather than universal recommendations. In production, `work_mem`, `maintenance_work_mem`, and `shared_buffers` should be validated against workload concurrency, connection pooling, autovacuum settings, OS cache behavior, and swap/OOM risk.
