# Validation Summary: How to Trace Database Connection Pool Exhaustion with OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry metrics and traces
- OpenTelemetry Java API
- OpenTelemetry Python API
- HikariCP
- SQLAlchemy connection pooling and pool events
- OpenTelemetry Collector
- Prometheus alerting and histogram queries

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry database client metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- SQLAlchemy pool events documentation: https://docs.sqlalchemy.org/en/21/core/events.html#connection-pool-events
- SQLAlchemy connection pooling documentation: https://docs.sqlalchemy.org/en/21/core/pooling.html
- HikariCP project documentation: https://github.com/brettwooldridge/HikariCP
- HikariCP `HikariPoolMXBean` API documentation: https://javadoc.io/doc/com.zaxxer/HikariCP/latest/com.zaxxer.hikari/com/zaxxer/hikari/HikariPoolMXBean.html

## Issues Found
- Removed an invalid unused Java import of `io.opentelemetry.api.metrics.ObservableGauge`. Current OpenTelemetry Java exposes observable gauge handles such as `ObservableLongGauge` and `ObservableDoubleGauge`; the unused `ObservableGauge` import can break compilation.
- Changed connection, thread, and timeout metric units to UCUM-style annotations (`{connection}`, `{thread}`, `{timeout}`) and changed checkout wait time to seconds. OpenTelemetry metric units are expected to follow UCUM conventions, and the database client semantic conventions use seconds for connection wait-time histograms.
- Removed misleading SQLAlchemy event code that implied the `connect` pool event measured checkout wait time. SQLAlchemy documents `connect` as firing when a DBAPI connection is first created, not when a caller waits for a pooled connection.
- Updated the Python checkout wrapper to time `engine.connect()`, record histogram values in seconds, include the missing `time` import, and use the documented `Status` / `StatusCode` import pattern for span errors.
- Updated the Prometheus histogram alert to query the seconds-suffixed bucket metric and compare against `0.2` seconds instead of comparing a millisecond value against a seconds-based metric.
- Corrected the alert description for high utilization so `{{ $value }}` is described as utilization rather than active connection count.
- Corrected the leak-diagnosis guidance. `HikariCP maxLifetime` and SQLAlchemy `pool_recycle` do not forcibly reclaim connections that are still checked out by leaked application code; HikariCP `leakDetectionThreshold` is the relevant leak-detection setting.

## Review Notes
The post uses custom metric names instead of the current OpenTelemetry database client semantic convention names such as `db.client.connection.count`, `db.client.connection.pending_requests`, and `db.client.connection.wait_time`. That is acceptable for an application-specific tutorial, but future revisions could mention the semantic convention names for teams that want standardized instrumentation.
