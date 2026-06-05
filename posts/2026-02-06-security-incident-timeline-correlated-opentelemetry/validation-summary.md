# Validation Summary: How to Build a Security Incident Timeline from Correlated OpenTelemetry Traces,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry traces, logs, metrics, resources, and exemplars
- OpenTelemetry Python logging instrumentation
- OpenTelemetry HTTP semantic conventions
- SQL-based telemetry correlation
- Python timeline generation

## Sources Consulted
- OpenTelemetry Python Contrib logging instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry logs data model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry resource specification: https://opentelemetry.io/docs/specs/otel/resource/
- OpenTelemetry metrics data model: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry tracing API: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The post stated that traces, logs, and metrics all share trace IDs. Metrics do not generally carry trace IDs as ordinary metric point fields; OpenTelemetry links metrics to traces through exemplars when present. Updated the wording to describe trace/span IDs for traces and correlated logs, plus resource attributes, timestamps, and metric exemplars.
- The post implied span IDs always link log records to spans. In the OpenTelemetry logs data model, TraceId and SpanId are optional fields. Updated the wording to refer to correlated log records.
- The timestamp wording implied every signal always has a precise source timestamp. OpenTelemetry log `Timestamp` can be absent when source time is unknown, and collectors can use observed time. Updated the wording to say timestamps provide event or observation time for ordering.
- The SQL example used old HTTP semantic convention keys (`http.method`, `http.path`, `http.status_code`). Updated them to current stable keys (`http.request.method`, `url.path`, `http.response.status_code`).
- The SQL `UNION ALL` query selected different column counts from the trace, log, and metric CTEs, so it would fail in a SQL backend. Added `NULL` placeholders and aliases so each branch returns the same columns.
- The `http.server.request.duration` metric is defined in seconds, but the anomaly threshold used `5000` as though the value were milliseconds. Changed the example threshold to `5`.
- The text named specific products as SQL-queryable cross-signal backends too broadly. Reworded the SQL section to state that table and field names must be adapted to the backend schema.
- The Python timeline builder accumulated stale entries if `build_timeline()` was called more than once on the same instance. Reset `self.entries` at the start of each build.
- The Python example used old HTTP semantic convention keys and a narrow span status comparison. Updated the attribute names and made span status classification handle common exported `ERROR` forms.

## Review Notes
The SQL and Python examples remain intentionally backend-agnostic. They should be adapted to the actual telemetry store schema and client API used in production.
