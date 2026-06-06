# Validation Summary: How to Monitor Database Query Performance Trends Over Time

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Span Metrics Connector
- OpenTelemetry Python tracing API
- OpenTelemetry database semantic conventions
- Prometheus and PromQL
- Grafana dashboards
- PostgreSQL / psycopg2

## Sources Consulted
- OpenTelemetry Span Metrics Connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Filter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/sql/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus compatibility guidance: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/

## Issues Found
- The Python example used older database semantic convention names, including `db.system`, `db.operation`, `db.statement`, and a custom `db.table` attribute. Updated the example to current stable database attributes: `db.system.name`, `db.operation.name`, `db.query.text`, and `db.collection.name`.
- The Python example set span status with `trace.StatusCode.ERROR`. Updated it to import and use `Status` and `StatusCode`, matching the OpenTelemetry Python documentation.
- The manual database span did not set span kind. Added `SpanKind.CLIENT`, which matches the database client span semantic convention.
- The Collector configuration used the deprecated `spanmetrics` connector component name. Updated it to `span_metrics`, the current snake_case connector type.
- The Collector configuration used deprecated `dimensions_cache_size`. Replaced it with `aggregation_cardinality_limit`, the current span metrics connector setting for limiting tracked dimension combinations.
- The filter processor example used the older nested `spans.include` matcher syntax. Replaced it with current OTTL-based `trace_conditions`.
- The PromQL, Grafana, and alert examples used label names derived from the older database attributes, such as `db_system`, `db_operation`, and `db_table`. Updated them to the Prometheus-normalized labels for the current attributes: `db_system_name`, `db_operation_name`, and `db_collection_name`.
- The PromQL examples used the histogram count for query volume even though the Span Metrics Connector also emits a calls counter. Updated query-volume examples to use `db_calls_total`.
- The Collector example put `namespace: "db"` on the Prometheus exporter while the generated span metrics still had the connector's default `traces.span.metrics` namespace. Moved the namespace to the `span_metrics` connector so the documented Prometheus metric names such as `db_duration_milliseconds_bucket` and `db_calls_total` match the configuration.

## Review Notes
- The table extraction helper is still intentionally simple and only suitable for simple single-table SQL examples. The post now labels it as best-effort to avoid implying that it is a general SQL parser.
- The Span Metrics Connector documentation warns that its default duration unit is expected to change from milliseconds to seconds behind a feature gate. The post's examples remain correct for the currently documented default where the feature gate is disabled, but future Collector releases may require updating metric names and Grafana units.
