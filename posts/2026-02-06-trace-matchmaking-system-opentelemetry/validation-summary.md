# Validation Summary: How to Trace Matchmaking System Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OTLP gRPC exporter
- Distributed tracing
- Context propagation
- Python

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/entities/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The resource example used the deprecated `deployment.environment` semantic convention. Changed it to the current stable `deployment.environment.name` attribute.
- The queue example returned player records without `player_id`, while later examples access `c["player_id"]` and `player["player_id"]`. Added `player_id` to queued player records so the snippets are internally consistent.
- The context propagation section implied injection alone guarantees same-trace server allocation. Clarified that the downstream allocation service must extract the propagated context.

## Review Notes
The OpenTelemetry Python APIs shown for `TracerProvider`, `BatchSpanProcessor`, OTLP gRPC exporting, `start_span`, `start_as_current_span`, span attributes, span events, and `inject(headers)` are current. Searching traces by player ID can be useful for support workflows, but production systems should still consider privacy, retention, and backend cardinality costs when storing player identifiers as span attributes.
