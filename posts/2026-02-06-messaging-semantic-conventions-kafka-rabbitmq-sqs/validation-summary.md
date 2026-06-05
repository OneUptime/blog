# Validation Summary: How to Implement Messaging Semantic Conventions (Kafka, RabbitMQ, SQS)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and messaging semantic conventions
- Apache Kafka Java client
- RabbitMQ with Python and Pika
- Amazon SQS with AWS SDK for JavaScript v3
- W3C trace context propagation through message metadata

## Sources Consulted
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry RabbitMQ semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/rabbitmq/
- OpenTelemetry AWS SQS semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/sqs/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- AWS SDK for JavaScript v3 SendMessageCommand documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/command/SendMessageCommand/
- Amazon SQS message metadata documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html

## Issues Found
- The post described span kinds as PRODUCER, CONSUMER, and CLIENT categories for messaging. Updated this to the current OpenTelemetry operation-type mapping: create, send, receive, process, and settle.
- The post used `{destination} {operation}` span names. Updated examples and prose to the current `{operation} {destination}` span-name convention.
- Several snippets used `messaging.operation.name` for generic operation types without setting `messaging.operation.type`. Added `messaging.operation.type` and corrected system-specific operation names where appropriate.
- Kafka snippets used the outdated/non-current `messaging.kafka.message.offset` attribute. Replaced it with `messaging.kafka.offset`.
- Java snippets had missing imports and uninitialized final fields. Added required imports and constructors.
- Kafka consumer processing did not make the consumer span current while handling the message. Added a `Scope` around message handling.
- RabbitMQ destination naming did not follow the documented exchange/routing-key/queue pattern. Updated producer and consumer destination names and span names.
- RabbitMQ consumer snippet used `json.loads` without importing `json`. Added the import.
- RabbitMQ prose overstated that a routing key tells exactly which queues matched. Reworded it to say the routing key was used to match exchange bindings.
- SQS producer injected the active context instead of the newly created span context. Updated it to inject `trace.setSpan(context.active(), span)`.
- SQS producer imported OpenTelemetry API symbols across two `require` calls and used numeric status code `2`. Consolidated imports and used `SpanStatusCode.ERROR`.
- SQS consumer lacked an `SQSClient` initialization, used a reversed span name, and did not make the processing span active while processing/deleting the message. Fixed all three.
- SQS prose referenced message group IDs as semantic-convention attributes. Reworded this to queue URLs, which are documented in the SQS conventions.
- The SQL query filtered on system-specific `messaging.operation.name = 'process'`. Updated it to filter on `messaging.operation.type = 'process'`.

## Review Notes
OpenTelemetry messaging semantic conventions are still marked Development and include migration guidance for instrumentations using v1.24.0 or earlier. Future reviews should re-check the exact attribute names and stability notes against the current OpenTelemetry semantic convention version.
