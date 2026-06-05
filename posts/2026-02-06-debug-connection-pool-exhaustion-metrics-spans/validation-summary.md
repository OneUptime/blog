# Validation Summary: How to Debug Connection Pool Exhaustion by Correlating OpenTelemetry Pool

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry metrics and traces
- OpenTelemetry database semantic conventions
- Python
- PostgreSQL-style database access
- Prometheus alerting rules and PromQL
- Database connection pools

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry database client metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Psycopg 2 connection pooling documentation: https://www.psycopg.org/docs/pool.html

## Issues Found
- The pool state metrics were described as gauges but implemented as `UpDownCounter` instruments without initializing the baseline, which could produce incorrect idle and active counts. I changed the example to use the current OpenTelemetry database connection metric names, initialize the idle and used series, and maintain local `active_count` and `idle_count` values.
- The wait-time histogram used a custom `db.pool.wait_time` metric name and milliseconds. I changed it to `db.client.connection.wait_time` with seconds, matching OpenTelemetry database pool semantic conventions.
- The maximum pool-size metric used a custom name and was never recorded. I changed it to `db.client.connection.max` and record the configured maximum in the wrapper initializer.
- The span example used older database span attributes `db.system` and `db.operation`. I changed them to `db.system.name` and `db.operation.name`.
- The connection hog finder looked for `db.system` and `db.statement`. I changed those to `db.system.name` and `db.query.text` to match current database span semantic conventions.
- The Prometheus alert referenced metric names that no longer matched the corrected OpenTelemetry metrics. I updated the expression and annotation label to use the Prometheus-style names exported from the corrected metric and attribute names.

## Review Notes
The example remains intentionally generic because connection pool behavior varies by library. Some pools block while waiting for an available connection, while others time out or raise an exception when exhausted; the post now reflects that distinction in the acquisition comment.
