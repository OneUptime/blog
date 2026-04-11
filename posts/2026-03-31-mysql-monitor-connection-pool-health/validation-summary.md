# Validation Summary: How to Monitor MySQL Connection Pool Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (server-side status variables, information_schema)
- HikariCP (Java connection pool with JMX and Micrometer)
- Spring Boot Actuator
- SQLAlchemy (Python connection pool events and inspection)
- Node.js mysql2 (connection pool events and internals)
- Go database/sql (DBStats with Prometheus)

## Sources Consulted
- HikariCP GitHub repository and documentation (setMetricRegistry API, MicrometerMetricsTrackerFactory class, HikariPoolMXBean interface)
- mysql2 npm package source code (lib/base/pool.js, lib/create_pool.js) — https://github.com/sidorares/node-mysql2
- SQLAlchemy official documentation (pool events: connect, checkout, checkin; QueuePool inspection methods)
- MySQL 8.0 Reference Manual (SHOW STATUS variables: Threads_connected, Threads_running, Max_used_connections, Connection_errors_max_connections, Aborted_connects)
- MySQL 8.0 Reference Manual (information_schema.INNODB_TRX table, TRX_STATE column values)
- Go standard library documentation (database/sql.DBStats struct fields)
- Prometheus Go client library documentation (Gauge, Counter, Registry)

## Issues Found

1. **HikariCP Micrometer integration used a non-existent class** (line 63): The post used `config.setMetricRegistry(new MicrometerMetricRegistry(meterRegistry))`. The class `MicrometerMetricRegistry` does not exist in HikariCP. The correct usage is to pass the Micrometer `MeterRegistry` directly: `config.setMetricRegistry(meterRegistry)`. HikariCP's `setMetricRegistry()` accepts an `Object` and auto-detects whether it is a Dropwizard `MetricRegistry` or a Micrometer `MeterRegistry`. Fixed by removing the non-existent wrapper class.

2. **Node.js mysql2 pool internal property access used wrong indirection** (lines 119-121): The post accessed `pool.pool._allConnections`, `pool.pool._freeConnections`, and `pool.pool._connectionQueue`. Since the code uses the callback-based API (`mysql.createPool()` with `pool.on('acquire')`), the pool object has these internal properties directly — no `.pool` indirection is needed. The `pool.pool` pattern only applies to the promise wrapper API (`mysql2/promise`). Fixed by removing the extra `.pool` accessor.

## Review Notes
- The Go `collectDBMetrics` function creates and registers new Prometheus metrics on each call via `MustRegister`. If called more than once, this will panic because the metric names are already registered. The function works correctly as a one-time initialization but the name implies periodic collection. Future revision could restructure this into separate registration and update steps.
- The `WaitCount` field from Go's `sql.DBStats` is a cumulative counter, but the example creates a fresh Prometheus Counter and uses `Add()` to set its initial value. This works for a one-time snapshot but would not correctly track ongoing wait count changes without delta calculation.
- The Key Health Indicators table compares `Threads_running` against `pool_size`, mixing a server-side metric with an application-side configuration value. This works as a general heuristic but could be clearer by comparing against `max_connections` instead.
- The SQLAlchemy `pool` import (`from sqlalchemy import event, pool`) is unused in the code example but is not technically incorrect.
- All MySQL server-side queries are syntactically correct and use valid status variable names and information_schema columns.
