# Validation Summary: How to Use Span Kind (Client, Server, Producer, Consumer, Internal) Correctly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry SpanKind
- OpenTelemetry semantic conventions for HTTP, messaging, and database spans
- OpenTelemetry Python tracing API
- Distributed trace context propagation
- Kafka-style asynchronous messaging examples

## Sources Consulted
- OpenTelemetry Tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html

## Issues Found
- The article described database queries as INTERNAL spans in the initial INTERNAL definition, then correctly described them as CLIENT spans later. I removed database queries from the INTERNAL examples and clarified that in-process cache lookups and local computation are INTERNAL.
- HTTP examples used older semantic convention attributes such as `http.method`, `http.url`, `http.scheme`, and `http.status_code`. I updated them to current stable attributes including `http.request.method`, `url.full`, `url.scheme`, and `http.response.status_code`.
- Messaging examples used the older `messaging.operation` attribute. I updated them to `messaging.operation.name` and `messaging.operation.type` based on current messaging semantic conventions.
- The database example used older attributes such as `db.system`, `db.name`, `db.operation`, and `db.statement`. I updated it to `db.system.name`, `db.namespace`, `db.operation.name`, and `db.query.text`.
- The latency explanation incorrectly described network latency as a gap involving CLIENT span end and SERVER span start. I corrected it to explain that CLIENT duration is caller-observed round-trip time, SERVER duration is receiver handling time, and their difference can approximate transport/client-side overhead when clocks are comparable.
- The consumer example comment said using extracted context as a parent created a link. I corrected the comment because parent-child relationships and span links are distinct.
- The span-link example claimed it created a new trace but did not force an empty parent context. I added an empty `Context()` when starting the linked CONSUMER span so the code matches the explanation.

## Review Notes
The Python snippets were checked with `python3` compilation for syntax errors. The examples are still illustrative and assume surrounding application objects such as `kafka_producer`, `kafka_consumer`, `db`, and domain functions exist. For production instrumentation, OpenTelemetry auto-instrumentation should usually be preferred to avoid duplicate spans and to handle context injection consistently.
