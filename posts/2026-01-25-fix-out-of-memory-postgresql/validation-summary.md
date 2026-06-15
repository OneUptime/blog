# Validation Summary: How to Fix 'out of memory' Errors in PostgreSQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- PostgreSQL
- Linux memory management and OOM killer
- systemd service configuration
- pg_stat_statements
- SQL query planning and indexing
- psycopg2

## Sources Consulted
- PostgreSQL documentation: Managing Kernel Resources, Linux Memory Overcommit: https://www.postgresql.org/docs/current/kernel-resources.html
- PostgreSQL documentation: Resource Consumption settings (`shared_buffers`, `work_mem`, `maintenance_work_mem`, `huge_pages`): https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL documentation: pg_stat_statements: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation: Indexes and ORDER BY: https://www.postgresql.org/docs/current/indexes-ordering.html
- Linux kernel documentation: `/proc/sys/vm` overcommit and OOM settings: https://docs.kernel.org/admin-guide/sysctl/vm.html
- systemd documentation: `OOMScoreAdjust`: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- psycopg2 documentation: named cursors and `itersize`: https://www.psycopg.org/docs/cursor.html

## Issues Found
- The `pg_stat_statements` setup only showed `CREATE EXTENSION`, but PostgreSQL requires the module to be loaded through `shared_preload_libraries` and a server restart before the extension can collect statistics. Added comments explaining the required preload and restart step.
- The OOM killer section advised setting `oom_score_adj=-1000` without noting PostgreSQL's recommended child-process reset. Updated the guidance to protect the postmaster while setting `PG_OOM_ADJUST_FILE` and `PG_OOM_ADJUST_VALUE=0` so child backends can still be OOM-killed if necessary.
- The OOM killer and overcommit examples wrote directly to `/proc` without root-safe command examples. Updated the commands to use `sudo sh -c` or `sudo sysctl -w`.
- The sample index for `ORDER BY o.created_at DESC LIMIT 100` used `(customer_id, created_at DESC)`, which does not match the leading sort key. Changed it to `(created_at DESC, customer_id)` so it can support the ordering pattern shown.
- The EXPLAIN guidance said to look for `"Hash Batch"`, which is not the typical PostgreSQL EXPLAIN wording. Changed it to look for `"Batches: N"` where `N > 1`.
- A monitoring query comment claimed to check backend memory usage, but the query only lists active backend queries from `pg_stat_activity`. Updated the comment to match what the query actually returns.
- The `SELECT * FROM large_table` example said PostgreSQL fetches the entire table into memory. Clarified that the query returns the entire table and that client code buffering all rows can run out of memory.

## Review Notes
The memory sizing examples are reasonable starting points, not universal production recommendations. Actual values should still be tested against workload concurrency, `hash_mem_multiplier`, autovacuum activity, connection pooling, operating system cache needs, and container or cgroup memory limits.
