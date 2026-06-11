# Validation Summary: How to Implement Deadlock Prevention

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- PostgreSQL locking, deadlock detection, lock timeouts, and monitoring views
- SQL transactions and row-level locking
- Python DB-API usage with psycopg2
- Optimistic locking with version columns
- Prometheus Python client counters
- MySQL InnoDB and SQL Server deadlock behavior

## Sources Consulted
- PostgreSQL Documentation: Explicit Locking - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL Documentation: Client Connection Defaults (`lock_timeout`) - https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL Documentation: Lock Management (`deadlock_timeout`, `log_lock_waits`) - https://www.postgresql.org/docs/current/runtime-config-locks.html
- PostgreSQL Documentation: `pg_locks` view and `pg_blocking_pids()` guidance - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL Documentation: Cumulative Statistics System (`pg_stat_database.deadlocks`, `pg_stat_database_conflicts`) - https://www.postgresql.org/docs/current/monitoring-stats.html
- Psycopg 2.9 Documentation: `psycopg2.errors` exception classes - https://www.psycopg.org/docs/errors.html
- MySQL 8.4 Reference Manual: InnoDB Deadlock Detection - https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html
- Microsoft Learn: SQL Server Deadlocks Guide - https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-deadlocks-guide
- Prometheus Python Client Documentation: Counter - https://prometheus.github.io/client_python/instrumenting/counter/

## Issues Found
- The PostgreSQL blocking query manually joined `pg_locks` on `relation`, which is incomplete and can produce incorrect blocker relationships. PostgreSQL documentation recommends `pg_blocking_pids()` for identifying blockers, so the query was changed to join `pg_stat_activity` through `pg_blocking_pids()`.
- The deadlock monitoring SQL queried `pg_stat_database_conflicts`, which tracks recovery conflicts on standby servers, not ordinary deadlock events. It was changed to query `pg_stat_database.deadlocks`, the documented cumulative deadlock counter.
- The row-level locking section said large updates might escalate to table locks. That is misleading for PostgreSQL, which does not use SQL Server-style lock escalation for ordinary row locks. The wording was changed to focus on large updates holding many locks and increasing contention.

## Review Notes
- The Python snippets are syntactically valid. Some are illustrative and assume surrounding application infrastructure, such as an existing psycopg2 connection, imported helper functions, and retry policy choices.
- The post correctly presents consistent lock ordering as a primary deadlock prevention technique and retry logic as necessary for database-detected deadlocks.
