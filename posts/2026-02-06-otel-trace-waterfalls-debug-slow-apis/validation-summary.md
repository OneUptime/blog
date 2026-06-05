# Validation Summary: How to Use OpenTelemetry Trace Waterfalls to Debug Slow API Responses

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing and semantic conventions
- Grafana Tempo TraceQL
- Jaeger trace query UI/API
- Prometheus PromQL histograms
- HTTP, database, and custom trace spans

## Sources Consulted
- OpenTelemetry HTTP semantic convention attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry Prometheus compatibility guidance: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo TraceQL query examples: https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/traceql-query-examples/
- Jaeger API architecture documentation: https://www.jaegertracing.io/docs/latest/architecture/apis/
- Grafana Jaeger query editor documentation: https://grafana.com/docs/grafana/latest/datasources/jaeger/query-editor/
- Prometheus histogram and quantile documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The Tempo TraceQL examples used unscoped `name` and `duration` fields. Updated them to explicit scoped intrinsics, using `span:name`, `span:duration`, and `trace:duration`, which matches current TraceQL documentation.
- The Jaeger example described the endpoint as a generic API query and used a numeric `minDuration` value. Jaeger's HTTP JSON API is documented as an internal UI API, and current UI-facing duration examples use duration strings such as `3s`, so the comment and query were updated.
- The database span guidance used older OpenTelemetry database semantic convention attributes: `db.system`, `db.statement`, `db.operation`, and `db.sql.table`. Updated them to current names: `db.system.name`, `db.query.text`, `db.operation.name`, and `db.collection.name`.
- The database query text guidance implied query text is always present. Updated it to note that `db.query.text` is available when instrumentation captures sanitized statements.

## Review Notes
The PromQL examples are valid for classic Prometheus histogram buckets exported from the OpenTelemetry `http.client.request.duration` metric after Prometheus name translation. Metric and label names can vary depending on exporter translation strategy and resource attribute handling, so teams should adapt the labels to their own metrics backend.
