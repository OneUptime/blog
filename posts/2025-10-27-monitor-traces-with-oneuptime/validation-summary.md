# Validation Summary: Monitor Traces with OneUptime: Follow Every Request the Easy Way

## Status
validated

## Post Type
Guide / Tutorial (end-user walkthrough of configuring OneUptime trace monitors)

## Technologies Covered
- OneUptime trace monitors (dashboard configuration)
- OpenTelemetry distributed tracing
- OTLP/JSON span representation
- OpenTelemetry semantic conventions (HTTP, service, deployment, cloud attributes)

## Sources Consulted
- OpenTelemetry Trace specification / OTLP protocol: https://opentelemetry.io/docs/specs/otlp/
- OTLP/JSON encoding rules (hex encoding for trace_id/span_id): https://github.com/open-telemetry/opentelemetry-proto/blob/main/docs/specification.md
- OpenTelemetry Span data model & SpanKind/StatusCode enums: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Semantic Conventions (HTTP spans): https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- W3C Trace Context (example trace/span IDs): https://www.w3.org/TR/trace-context/

## Issues Found
No technical issues found.

## Review Notes
- The post is primarily an end-user UI walkthrough. The SQL-style filter block and the monitor configuration JSON are explicitly presented as illustrative "patterns"/"examples" rather than a literal API contract, so they are evaluated for plausibility and internal consistency rather than exact field-for-field accuracy against a public schema. Both are internally consistent (e.g., the `durationThreshold` of 2000 ms matches the "slower than 2 seconds" comment, and warning/critical/p95 rules align with the prose).
- The OpenTelemetry span JSON is the most concrete technical artifact and is accurate: OTLP span field names, `SPAN_KIND_SERVER`, `STATUS_CODE_OK`, hex-encoded 32-char traceId and 16-char span/parentSpanId, and `stringValue`/`intValue` typed attributes all conform to OTLP/JSON. Semantic-convention attribute keys (`http.request.method`, `url.full`, `http.response.status_code`, `service.name`, `cloud.region`) are current stable conventions.
- Minor future note (not an error): `deployment.environment` has been superseded in newer OpenTelemetry semantic conventions by `deployment.environment.name`. The older key remains valid and widely recognized, so no change was made.
