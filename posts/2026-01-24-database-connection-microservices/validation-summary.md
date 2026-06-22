# Validation Summary: How to Fix 'Database Connection' Issues in Microservices

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- PostgreSQL
- MySQL
- SQLAlchemy
- Flask
- FastAPI
- asyncpg
- PgBouncer
- Kubernetes
- Prometheus
- Python

## Sources Consulted
- PostgreSQL documentation: `pg_stat_activity` and cumulative statistics views: https://www.postgresql.org/docs/current/monitoring-stats.html
- MySQL 8.4 Reference Manual: `INFORMATION_SCHEMA.PROCESSLIST` deprecation and process list columns: https://dev.mysql.com/doc/refman/8.4/en/information-schema-processlist-table.html
- MySQL Reference Manual: Performance Schema `processlist` table: https://dev.mysql.com/doc/refman/9.7/en/performance-schema-processlist-table.html
- MySQL Reference Manual: server status variables and connection error counters: https://dev.mysql.com/doc/refman/9.7/en/server-status-variables.html
- SQLAlchemy documentation: connection pooling configuration and `QueuePool` behavior: https://docs.sqlalchemy.org/en/21/core/pooling.html
- SQLAlchemy documentation: pool event listener registration and event signatures: https://docs.sqlalchemy.org/en/21/core/events.html
- asyncpg API reference: pool acquisition, release, and pool methods: https://magicstack.github.io/asyncpg/current/api/index.html
- PgBouncer configuration documentation: pool modes, pool sizing, connection limits, and timeouts: https://www.pgbouncer.org/config.html
- PgBouncer project release page: current PgBouncer release information: https://www.pgbouncer.org/
- Docker Hub tags for `edoburu/pgbouncer`: current published image tags: https://hub.docker.com/r/edoburu/pgbouncer/tags
- Kubernetes documentation: liveness and readiness probe configuration: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Prometheus documentation: alerting rule file format and `for` behavior: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- Replaced `information_schema.PROCESSLIST` with `performance_schema.processlist` in the MySQL diagnostic query because MySQL documents `INFORMATION_SCHEMA.PROCESSLIST` as deprecated and recommends the Performance Schema implementation.
- Updated the SQLAlchemy pool monitor to accept `max_overflow` explicitly instead of reading the private `pool._max_overflow` attribute. SQLAlchemy documents `max_overflow` as a pool configuration argument, but `_max_overflow` is not a public API.
- Added a missing `random` import to the retry example. The code used `random.random()` for jitter and would fail at runtime without the import.
- Added a missing `time` import to the connection leak detector example. The background monitor used `time.sleep()` and would fail at runtime without the import.
- Updated the PgBouncer Kubernetes image tag from the old `edoburu/pgbouncer:1.18.0` tag to `edoburu/pgbouncer:v1.25.2-p0`, matching the current PgBouncer release line available at review time.
- Changed the PgBouncer transaction pooling comment from an absolute recommendation to a narrower statement for short transactions, because transaction pooling has compatibility constraints and is not universally best for every microservice workload.
- Added missing `create_engine` and `NullPool` imports to the PgBouncer SQLAlchemy snippet so the standalone example can run as shown.
- Adjusted the PgBouncer SQLAlchemy guidance from "disable client-side connection pooling" to "avoid large client-side pools" because the example itself allows either `NullPool` or a small client-side pool.
- Fixed the Prometheus pool exhaustion alert to compare checked-out connections against a pool capacity metric that includes overflow. SQLAlchemy `QueuePool` exhaustion occurs at `pool_size + max_overflow`, not at `pool_size` alone.
- Added a `sqlalchemy_pool_capacity` metric and updated `update_pool_metrics()` to accept `max_overflow` explicitly.

## Review Notes
The Python snippets are syntactically valid after the fixes. Some examples remain illustrative and assume surrounding application definitions such as the SQLAlchemy `User` model, real database credentials, and matching Prometheus exporter metric names.
