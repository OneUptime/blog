# Validation Summary: How to Tune PostgreSQL Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- PostgreSQL
- PostgreSQL server configuration
- PostgreSQL query planning and WAL tuning
- pg_stat_statements
- Linux sysctl tuning

## Sources Consulted
- PostgreSQL documentation: Resource Consumption - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL documentation: Write Ahead Log - https://www.postgresql.org/docs/current/runtime-config-wal.html
- PostgreSQL documentation: Connections and Authentication - https://www.postgresql.org/docs/current/runtime-config-connection.html
- PostgreSQL documentation: Query Planning - https://www.postgresql.org/docs/current/runtime-config-query.html
- PostgreSQL documentation: Vacuuming / Automatic Vacuuming - https://www.postgresql.org/docs/current/runtime-config-vacuum.html
- PostgreSQL documentation: pg_stat_statements - https://www.postgresql.org/docs/current/pgstatstatements.html
- Red Hat Enterprise Linux documentation: Using PostgreSQL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_using_database_servers/using-postgresql

## Issues Found
- The post said `shared_buffers` should not exceed 8GB on most systems. PostgreSQL documentation recommends 25% of RAM as a starting point for dedicated servers and notes that values above 40% of RAM are unlikely to help. Updated the guidance to match that documented behavior.
- The post recommended `wal_buffers = 64MB` for busy servers. PostgreSQL normally auto-tunes this setting, and very large values are not generally needed. Updated the guidance to describe auto-tuning and use a more conservative explicit value.
- The post implied most settings besides `shared_buffers` can be reloaded. Several settings shown in the post require a restart, including `shared_buffers`, `wal_buffers`, `max_connections`, and `max_worker_processes`. Updated the restart/reload instructions.
- The `pg_stat_statements` setup enabled the extension before adding it to `shared_preload_libraries`. PostgreSQL requires the module to be loaded via `shared_preload_libraries` and a restart before it can collect statistics. Reordered the instructions.
- The kernel tuning section presented `kernel.shmmax` and `kernel.shmall` as general PostgreSQL tuning. PostgreSQL's default main shared memory implementation on modern platforms is not System V shared memory, and the documentation discourages `shared_memory_type = sysv` for normal use because it often needs non-default kernel settings. Updated the section to make those sysctl settings conditional.

## Review Notes
The remaining values are reasonable starting points, but they are workload-dependent. The post correctly recommends monitoring with `pg_stat_statements` and `pg_stat_user_tables` before further tuning.
