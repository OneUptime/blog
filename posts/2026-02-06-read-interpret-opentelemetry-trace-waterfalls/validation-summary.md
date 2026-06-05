# Validation Summary: How to Read and Interpret OpenTelemetry Trace Waterfalls

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry traces and spans
- OpenTelemetry semantic conventions
- Distributed tracing waterfalls
- Trace sampling
- Trace exemplars
- Jaeger
- Zipkin
- Grafana Tempo and TraceQL
- OneUptime
- Honeycomb

## Sources Consulted
- OpenTelemetry Tracing API: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry overview and trace data model: https://opentelemetry.io/docs/reference/specification/overview/
- OpenTelemetry HTTP semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry service semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry sampling documentation: https://opentelemetry.io/docs/concepts/sampling/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/
- OneUptime related post URLs referenced by the article, checked for HTTP 200 responses.

## Issues Found
- The HTTP span attribute examples used deprecated semantic convention names (`http.method`, `http.target`, `http.status_code`, and `http.user_agent`). Updated them to current names: `http.request.method`, `url.path`, `http.response.status_code`, and `user_agent.original`.
- The database span attribute examples used older semantic convention names (`db.system`, `db.name`, `db.statement`, and `db.operation`). Updated them to current names: `db.system.name`, `db.namespace`, `db.query.text`, and `db.operation.name`.
- The database query text guidance implied that query text can always be copied directly. Updated it to note that `db.query.text` is useful when available and safe to inspect, and that parameterized or sanitized SQL is the appropriate form for EXPLAIN analysis.
- The span status example used `status.message`. Updated it to `status.description`, matching the OpenTelemetry API status terminology.
- The parent-child timing sections described child spans outside parent bounds as impossible except for clock skew or instrumentation bugs. Updated the language to apply this expectation to synchronous nested operations and to include async/background work modeled as child spans as another explanation.

## Review Notes
The article is a conceptual technical guide and does not include executable code, terminal commands, or configuration snippets. The Mermaid and text diagrams are illustrative and syntactically straightforward. Tool-specific UI descriptions are high-level and may vary by version, but no blocking inaccuracies were found after the corrections above.
