# Validation Summary: Why Does a Database Time Out During Traffic Spikes? Diagnosing Pool Exhaustion

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Database connection pooling
- PostgreSQL
- HikariCP
- SQLAlchemy 2.0
- Psycopg 3 and `psycopg_pool`
- Python
- SQL
- Queueing and concurrency control

## Sources Consulted

- [HikariCP configuration documentation](https://github.com/brettwooldridge/HikariCP#gear-configuration-knobs-baby)
- [HikariCP pool-sizing guidance](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [SQLAlchemy 2.0 connection-pooling documentation](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [SQLAlchemy 2.0 engine and connection lifecycle documentation](https://docs.sqlalchemy.org/en/20/core/connections.html)
- [SQLAlchemy 2.0 PostgreSQL/Psycopg dialect documentation](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#module-sqlalchemy.dialects.postgresql.psycopg)
- [Psycopg 3 pool API](https://www.psycopg.org/psycopg3/docs/api/pool.html)
- [Psycopg 3 connection-pool guide](https://www.psycopg.org/psycopg3/docs/advanced/pool.html)
- [PostgreSQL 18 monitoring statistics and `pg_stat_activity`](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL 18 `statement_timeout` documentation](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-STATEMENT-TIMEOUT)
- [PostgreSQL 18 connection-limit documentation](https://www.postgresql.org/docs/current/runtime-config-connection.html#GUC-MAX-CONNECTIONS)
- [MIT OpenCourseWare notes on Little's law](https://ocw.mit.edu/courses/6-826-principles-of-computer-systems-spring-2002/4298534e86c17eabcfcb42f114d4e810_1011.pdf)

## Issues Found

- The queueing example said that average occupancy would rise to about 40 connections after hold time increased, even though the example pool can contain only 20 connections. Changed this to say that the offered load would require about 40 connections to avoid queueing and that the 20-connection pool instead reaches its maximum and builds a queue. This preserves the intended capacity calculation while distinguishing connection demand from actual bounded-pool occupancy.

## Review Notes

- The Python snippets are syntactically valid and use current SQLAlchemy 2.0 APIs. `Engine.connect()` returns its connection to the pool when the context exits, and `Engine.begin()` commits on normal exit or rolls back on error.
- For SQLAlchemy `QueuePool`, the maximum simultaneous connection count is `pool_size + max_overflow`; the post correctly refers to budgeting the pool maximum rather than only its persistent size.
- The `pg_stat_activity` query uses current PostgreSQL columns and valid syntax. Its explanation that `state` and `wait_event` are independent matches the PostgreSQL 18 documentation.
- The timeout names and units match current HikariCP, SQLAlchemy 2.0, and Psycopg 3 pool documentation. No deprecated APIs or version-specific incompatibilities were found.
