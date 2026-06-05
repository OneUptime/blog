# Validation Summary: How to Standardize Telemetry Instrumentation Across 50+ Microservices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry semantic conventions
- OpenTelemetry Python SDK
- OTLP gRPC exporters
- W3C Trace Context and Baggage propagation
- YAML configuration
- Python

## Sources Consulted
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database client metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry deployment resource attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry service resource attributes: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry propagators API: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The post used the deprecated resource attribute `deployment.environment`. Changed it to `deployment.environment.name`, which is the current stable deployment environment attribute.
- The HTTP server duration metric used unit `ms`. Changed it to `s` because `http.server.request.duration` is defined with UCUM unit seconds.
- The HTTP active requests metric used unit `"1"` and omitted standard attributes. Changed the unit to `{request}` and added `http.request.method` and `url.scheme`.
- The database metric `db.client.query.duration` did not match the current stable database metric. Changed it to `db.client.operation.duration` with unit `s`.
- The database span attributes used older names `db.system` and `db.statement`. Changed them to `db.system.name` and `db.query.text`.
- The HTTP span attribute lists omitted current required attributes. Added `url.path` and `url.scheme` for server spans, and `server.address` and `server.port` for client spans.
- The compliance checker called `self._get_team(service_name)` but did not define `_get_team`. Added a small helper that reads the `team` resource attribute when the trace backend exposes `get_resource_attribute`, otherwise returns `"unknown"`.

## Review Notes
The Python OpenTelemetry initialization and metric gauge examples use current API shapes. The shared-library examples are illustrative; production libraries should also handle provider shutdown and avoid overriding an already configured global provider without an explicit policy.
