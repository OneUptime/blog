# Validation Summary: How to Propagate Trace Context Across Message Queues (Kafka, RabbitMQ, SQS)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python
- W3C Trace Context
- Kafka / confluent-kafka Python client
- RabbitMQ / AMQP / Pika
- Amazon SQS / Boto3
- Distributed tracing and context propagation

## Sources Consulted
- OpenTelemetry Python propagation API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python propagation guide: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry propagators text map API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.textmap.html
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry semantic conventions for messaging spans: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Confluent Kafka Python client API: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Amazon SQS message metadata: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html
- Boto3 SQS receive_message API: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/receive_message.html
- Pika BasicProperties documentation: https://pika.readthedocs.io/
- AMQP 0-9-1 specification resources: https://www.rabbitmq.com/resources/specs/amqp0-9-1.pdf

## Issues Found
- The Kafka and SQS custom carrier classes implemented `set()`, but OpenTelemetry Python's default setter expects a mutable mapping-style carrier and writes with item assignment. Added `__setitem__()` methods that delegate to `set()` so `inject(carrier=carrier)` works as shown.
- The Kafka consumer snippet used `KafkaHeaderCarrier` without importing or defining it in that file. Added an import from the producer example file.
- Several span attributes used deprecated OpenTelemetry messaging semantic convention names. Updated `messaging.destination` to `messaging.destination.name`, `messaging.operation` to `messaging.operation.type`, `messaging.kafka.partition` to `messaging.destination.partition.id`, and `messaging.rabbitmq.routing_key` to `messaging.rabbitmq.destination.routing_key`.
- The producer examples used `publish` as the messaging operation value. Updated the operation type to `send`, which is the current well-known value for sending messages to an intermediary.
- The RabbitMQ text described AMQP headers as a string-to-string dictionary. AMQP headers are a field table and can hold multiple value types, so the wording was corrected to "dictionary-like field table."
- The SQS consumer example did not mention that SQS message attributes are only returned when requested by `receive_message`. Added a comment noting that consumers should request `MessageAttributeNames=["All"]`.
- The span-link batch snippet used `trace.get_current_span(ctx)` without importing `trace` in the snippet. Added the missing import.

## Review Notes
The examples remain intentionally focused on manual context propagation. In production, teams should also check whether their OpenTelemetry instrumentation package for a specific client already supports propagation, and should avoid logging full trace context values in sensitive environments.
