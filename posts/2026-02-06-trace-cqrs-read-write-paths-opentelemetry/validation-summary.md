# Validation Summary: How to Trace CQRS Read and Write Paths Separately with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Python tracing API and SDK
- OpenTelemetry context propagation
- OpenTelemetry metrics API
- OpenTelemetry semantic conventions for database, messaging, and HTTP spans
- FastAPI and OpenTelemetry FastAPI instrumentation
- CQRS architecture and projection workflows

## Sources Consulted
- OpenTelemetry Python manual instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation docs: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry FastAPI instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html

## Issues Found
- The post said the tracer name becomes an attribute on every span. OpenTelemetry records the tracer name as instrumentation scope metadata, not a regular span attribute. Updated the explanation and code comment.
- The write-path example extracted trace context in the projection service but did not show injecting context into event-message headers during publishing. Added `opentelemetry.propagate.inject` and passed headers to the publisher.
- Database span attributes used older names: `db.system`, `db.operation`, and `db.name`. Updated examples to current stable semantic convention names: `db.system.name`, `db.operation.name`, and `db.namespace`.
- HTTP route examples used the older `http.method` attribute. Updated them to `http.request.method` while keeping `http.route`.
- Messaging spans only set `messaging.system`. Added `messaging.destination.name`, `messaging.operation.name`, and `messaging.operation.type` to better match current messaging semantic conventions.
- Backend filter examples compared boolean span attributes to string values like `"False"`. Updated them to boolean literals such as `false`.

## Review Notes
- The Python snippets are illustrative and still depend on application-specific objects such as repositories, event publishers, command classes, and cache clients.
- The snippets were checked for Python syntax with `python3` AST parsing; all six Python code blocks parsed successfully.
