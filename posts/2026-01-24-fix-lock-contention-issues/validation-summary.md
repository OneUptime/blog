# Validation Summary: How to Fix 'Lock Contention' Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- PostgreSQL locking, `pg_locks`, `pg_stat_activity`, and timeout settings
- MySQL InnoDB locking, Performance Schema, and lock wait settings
- Node.js lock instrumentation
- Python database transaction examples
- SQLAlchemy optimistic locking
- Prometheus alerting and postgres_exporter metrics
- SQL indexing and sharded counters

## Sources Consulted
- PostgreSQL `pg_locks` documentation: https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL system information functions, including `pg_blocking_pids()`: https://www.postgresql.org/docs/current/functions-info.html
- PostgreSQL client connection defaults, including `lock_timeout` and `statement_timeout`: https://www.postgresql.org/docs/current/runtime-config-client.html
- PostgreSQL lock management, including `deadlock_timeout`: https://www.postgresql.org/docs/current/runtime-config-locks.html
- MySQL Performance Schema `data_lock_waits` table documentation: https://dev.mysql.com/doc/mysql-perfschema-excerpt/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL InnoDB transaction and locking information examples: https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-examples.html
- MySQL InnoDB deadlock detection documentation: https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-detection.html
- MySQL internal locking methods documentation: https://dev.mysql.com/doc/refman/8.0/en/internal-locking.html
- SQLAlchemy version counter documentation: https://docs.sqlalchemy.org/en/latest/orm/versioning.html
- SQLAlchemy Session API documentation: https://docs.sqlalchemy.org/en/latest/orm/session_api.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- prometheus-community postgres_exporter collectors: https://github.com/prometheus-community/postgres_exporter

## Issues Found
- The PostgreSQL lock monitoring query manually self-joined `pg_locks` to infer blockers. PostgreSQL documentation recommends `pg_blocking_pids()` for this purpose because lock self-joins are difficult to make correct. Replaced the query with a `pg_stat_activity` query using `pg_blocking_pids()`.
- The MySQL lock monitoring query used `information_schema.innodb_lock_waits`, which was deprecated and removed in MySQL 8.0.1. Updated it to use `performance_schema.data_lock_waits` and the current transaction ID columns.
- The Node.js lock wrapper always called `releaseLock()` in `finally`, even if `acquireLock()` failed. Added an `acquired` flag so it only releases locks that were successfully acquired.
- The sharded counter setup used PostgreSQL-only `generate_series()` in a post covering both PostgreSQL and MySQL. Replaced it with a portable multi-row `VALUES` insert.
- The indexing section said a full table scan "locks many rows." That is too broad across database engines and isolation levels. Changed the explanation to say missing indexes examine many rows and keep transactions open longer, and that indexes reduce rows examined.
- The SQLAlchemy optimistic locking example imported `StaleDataError` from the wrong module, omitted the `time` import used for retries, and used legacy `session.query(...).get(...)`. Updated it to import from `sqlalchemy.orm.exc`, include `import time`, and use `session.get(Product, product_id)`.
- The Prometheus alert examples referenced nonstandard postgres_exporter metric names: `pg_stat_activity_wait_seconds_total` and `pg_stat_activity_max_tx_duration_seconds`. Updated them to use current postgres_exporter metrics `pg_stat_activity_count{wait_event_type="Lock"}` and `pg_stat_activity_max_tx_duration`.

## Review Notes
The Python snippets were syntax-checked with `ast.parse`, and the JavaScript snippet was checked with `node --check`. Database SQL was reviewed against official PostgreSQL, MySQL, SQLAlchemy, Prometheus, and postgres_exporter documentation rather than executed against live PostgreSQL/MySQL instances.
