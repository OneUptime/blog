# Validation Summary: How to Instrument RabbitMQ with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing and context propagation
- RabbitMQ and AMQP message headers
- Python Pika instrumentation
- Java OpenTelemetry agent
- Spring AMQP / Spring RabbitMQ instrumentation
- RabbitMQ dead letter exchanges
- OpenTelemetry Collector OTLP configuration
- OpenTelemetry messaging semantic conventions

## Sources Consulted
- OpenTelemetry Pika Instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/pika/pika.html
- OpenTelemetry Java agent documentation: https://opentelemetry.io/docs/zero-code/java/agent/
- OpenTelemetry Java agent configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java instrumentation supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry RabbitMQ semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/rabbitmq/
- RabbitMQ Dead Letter Exchanges documentation: https://www.rabbitmq.com/docs/dlx
- RabbitMQ Exchanges documentation: https://www.rabbitmq.com/docs/exchanges

## Issues Found
- The post described trace propagation as directly connecting the publisher, broker, and consumers. OpenTelemetry client instrumentation correlates producer and consumer spans; it does not automatically create broker spans for RabbitMQ itself. Updated the wording to avoid implying broker-side spans are produced by the shown instrumentation.
- The fanout explanation and Python callback comment described each consumer span only as a child of the producer span. Current OpenTelemetry messaging conventions commonly model asynchronous messaging correlation with span links, with parent-child relationships still possible in some single-message instrumentations. Updated the wording to describe correlation through extracted message context and span links.
- The Java agent example used OTLP endpoint `http://localhost:4317` without setting the protocol. OpenTelemetry Java agent 2.x defaults to `http/protobuf`, while port `4317` is conventionally OTLP/gRPC. Added `-Dotel.exporter.otlp.protocol=grpc` to match the collector configuration in the post.
- The Java manual instrumentation snippet omitted imports for `Map`, `HashMap`, `Collections`, and byte encoding. Added the missing imports and changed `orderJson.getBytes()` to `orderJson.getBytes(StandardCharsets.UTF_8)`.
- The semantic convention section used outdated or incomplete attribute names. Replaced `messaging.operation` with `messaging.operation.name` and `messaging.operation.type`, replaced `messaging.message.payload_size_bytes` with `messaging.message.body.size`, and clarified the RabbitMQ destination naming guidance.
- The DLQ section stated that RabbitMQ preserves original message headers without qualification. RabbitMQ documents that dead-lettering modifies routing metadata and adds death-related headers. Updated the wording to say ordinary application headers usually survive while DLX-specific metadata is added or changed.

## Review Notes
The OpenTelemetry messaging semantic conventions are still marked Development and may continue to evolve. Existing instrumentation may emit older messaging attribute names by default unless configured for newer semantic conventions, so future updates should re-check the semantic convention stability guidance.
