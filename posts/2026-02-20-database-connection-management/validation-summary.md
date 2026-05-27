# Validation Summary: How to Manage Database Connections in Microservices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- PgBouncer
- Python
- psycopg2
- FastAPI
- Prometheus Python client
- Kubernetes/ECS readiness and liveness health checks
- Mermaid diagrams

## Sources Consulted
- Psycopg 2 documentation: `psycopg2.connect`, connection behavior, transactions, and pooling: https://www.psycopg.org/docs/module.html, https://www.psycopg.org/docs/connection.html, https://www.psycopg.org/docs/pool.html
- PostgreSQL documentation: client connection defaults and timeout settings: https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL documentation: `SET` and `SET LOCAL` behavior: https://www.postgresql.org/docs/current/sql-set.html
- PostgreSQL libpq documentation: connection parameters including `connect_timeout` and `options`: https://www.postgresql.org/docs/current/libpq-connect.html
- PgBouncer configuration documentation: pool modes, pool sizes, reserve pools, logging, and database entries: https://www.pgbouncer.org/config
- FastAPI documentation: returning `Response` and custom responses: https://fastapi.tiangolo.com/advanced/response-directly/, https://fastapi.tiangolo.com/advanced/custom-response/
- Prometheus Python client documentation: metric types and constructors: https://prometheus.github.io/client_python/instrumenting/, https://prometheus.github.io/client_python/instrumenting/gauge/
- Prometheus documentation: metric types: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The custom `ConnectionPool` accepted `max_idle_seconds` and described closing idle connections, but the sample never used `last_used` to close idle connections. Added an idle-age check in `get_connection()` that closes and replaces idle connections above `min_size`.
- The custom pool health check ran `SELECT 1` on a psycopg2 connection with autocommit disabled. Psycopg2 starts a transaction for any query by default, so the health check could leave the connection idle in a transaction until returned later. Updated the health check to use a cursor context manager and call `rollback()` after the probe.
- The PgBouncer section said it shares connections across all services and described `default_pool_size` as the maximum PostgreSQL connections overall. PgBouncer pools server connections by database/user pool, so the text now says compatible clients can share connections, and the config comment now says the setting applies per user/database pool.

## Review Notes
All Python snippets parse successfully with Python's `ast` parser after the fixes. The custom pool remains an educational example; production Python services should normally prefer a maintained pool implementation such as psycopg2's `ThreadedConnectionPool`, a framework-managed pool, or a database proxy depending on deployment needs.
