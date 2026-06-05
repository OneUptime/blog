# Validation Summary: How to Trace Outbox Pattern and Transactional Messaging with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing, propagation, metrics, and messaging semantic conventions
- W3C Trace Context
- Python
- SQLAlchemy
- PostgreSQL JSONB
- Apache Kafka with confluent-kafka Python client
- Debezium Outbox Event Router SMT
- Transactional outbox pattern

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- confluent-kafka Python API documentation: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- SQLAlchemy 2.0 connection and transaction documentation: https://docs.sqlalchemy.org/en/20/core/connections.html
- SQLAlchemy 2.0 JSON type documentation: https://docs.sqlalchemy.org/20/core/type_basics.html
- Debezium Outbox Event Router documentation: https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html
- Debezium distributed tracing documentation: https://debezium.io/documentation/reference/integrations/tracing

## Issues Found
- The opening reliability claim overstated the outbox pattern as making the database write and broker publish atomic. Updated it to state the accurate guarantee: atomic persistence of business data and the outbox record, followed by asynchronous relay publishing.
- The SQLAlchemy JSONB examples stored `payload` and `trace_context` using `json.dumps()`, which can store JSON strings rather than JSON objects when the ORM column is JSON/JSONB. Updated the examples to store Python dictionaries and made the relay handle either string or object trace context.
- The Kafka producer example could pass a Python dictionary as the message value if `payload` was returned from JSONB as an object, but confluent-kafka expects a string or bytes payload. Updated the producer to JSON-encode non-string/non-bytes payloads before sending.
- The consumer code used `json.loads()` without importing `json`. Added the missing import and decoded the Kafka message value before parsing.
- The consumer used `messaging.source.name`, which is not part of the current Kafka messaging semantic conventions. Replaced it with `messaging.destination.name` and added `messaging.operation.name` and `messaging.operation.type` attributes to producer and consumer spans.
- The relay description said it created a linked span, but the code continued the original trace via extracted parent context. Updated the wording to describe a connected span rather than a linked span.
- The Debezium section suggested a custom SMT and showed non-standard custom configuration. Replaced it with Debezium Outbox Event Router tracing options from the official documentation.
- The observable gauge callback example did not show the OpenTelemetry Python callback shape clearly. Updated it to return an `Observation` from a callback function.

## Review Notes
The Python snippets are illustrative and still assume application-specific models and helper functions such as `Order`, `OutboxEvent`, `reserve_item`, `publish_to_kafka`, `mark_published`, and `get_outbox_backlog_count`. The Kafka messaging semantic conventions are currently marked development status by OpenTelemetry, so attribute names may continue to evolve.
