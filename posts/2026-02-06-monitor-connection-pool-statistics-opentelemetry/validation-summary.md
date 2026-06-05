# Validation Summary: How to Monitor Connection Pool Statistics with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics
- OpenTelemetry Java API
- OpenTelemetry Python API and SDK
- OpenTelemetry JavaScript API
- HikariCP
- Spring Boot JDBC connection pooling
- psycopg2 connection pooling
- node-postgres (`pg`) connection pooling
- Database connection pool monitoring

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry database client metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- HikariCP `HikariPoolMXBean` Javadoc: https://javadoc.io/doc/com.zaxxer/HikariCP/latest/com.zaxxer.hikari/com/zaxxer/hikari/HikariPoolMXBean.html
- Spring Boot reference documentation for JDBC pool selection: https://docs.spring.io/spring-boot/docs/3.2.11/reference/htmlsingle/
- psycopg2 connection pool documentation: https://www.psycopg.org/docs/pool.html
- psycopg2 pool implementation source for `_used`, `_pool`, and exhausted-pool behavior: https://sources.debian.org/src/psycopg2/2.8.6-2/lib/pool.py
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool

## Issues Found
- The post described active connections as connections currently executing a query. Updated this to checked-out/in-use connections, because HikariCP, psycopg2, and node-postgres pool counters represent pool ownership state, not necessarily query execution.
- The post said every pool exposes active, idle, and waiting metrics. Updated the wording because psycopg2's built-in pool does not expose waiting requests publicly.
- The HikariCP Java example had an unused `ObservableDoubleGauge` import and a misleading active-connection comment. Removed the unused import and corrected the comment.
- The psycopg2 example created duplicate observable gauges for active and idle connections before registering the real callback-based gauges. Removed the duplicate instruments.
- The psycopg2 waiting metric was always zero because `_waiting_count` was never incremented. Added a small wrapper around `ThreadedConnectionPool` using a `BoundedSemaphore` so waiting callers are actually tracked.
- The psycopg2 example implied public access to pool statistics. Clarified that connection counts are read from psycopg2 internal collections because the public API only provides pool operations.
- The node-postgres example omitted the active-connection gauge even though the post presents active connections as a core metric. Added `db.pool.active_connections` as `pool.totalCount - pool.idleCount`.
- The trace correlation Python snippet referenced `pool._used` and `pool._pool`, which conflicted with the imported `psycopg2.pool` module name and omitted the `trace` import. Updated it to import `trace` and use the monitored pool wrapper methods.

## Review Notes
- The examples use custom metric names such as `db.pool.active_connections`. OpenTelemetry has database client connection pool semantic conventions under `db.client.connection.*`; using the semantic convention names and units would improve interoperability in a future revision.
- The Java dependencies are pinned to OpenTelemetry `1.35.0`, which is not current as of this review date, but the APIs used in the example are still valid for the demonstrated code.
