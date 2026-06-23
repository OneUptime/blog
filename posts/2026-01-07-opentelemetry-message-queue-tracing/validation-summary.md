# Validation Summary: How to Instrument Message Queues with OpenTelemetry (Kafka, RabbitMQ, SQS)

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and context propagation
- OpenTelemetry Python SDK
- OpenTelemetry messaging semantic conventions
- Apache Kafka with kafka-python
- RabbitMQ with pika
- Amazon SQS with boto3
- AWS Lambda SQS event handling

## Sources Consulted
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry messaging span conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry RabbitMQ semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/rabbitmq/
- OpenTelemetry AWS SQS semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/sqs/
- OpenTelemetry AWS Lambda semantic conventions: https://opentelemetry.io/docs/specs/semconv/faas/aws-lambda/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- kafka-python documentation: https://kafka-python.readthedocs.io/
- pika documentation: https://pika.readthedocs.io/
- Amazon SQS API Reference for message attributes and receive message: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/
- boto3 SQS client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html
- AWS Lambda SQS partial batch response documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html

## Issues Found
- The post used older OpenTelemetry messaging semantic convention attributes such as `messaging.operation`, `messaging.kafka.partition`, `messaging.kafka.consumer.group`, and `messaging.rabbitmq.routing_key`. Updated examples to current names such as `messaging.operation.type`, `messaging.operation.name`, `messaging.destination.partition.id`, `messaging.consumer.group.name`, and `messaging.rabbitmq.destination.routing_key`.
- Producer examples used `publish` as the semantic operation value. Updated producer span names and attributes to use `send`, which matches the current messaging operation type conventions.
- The SQS examples used `messaging.url` and custom `messaging.sqs.*` attributes. Updated queue URL to `aws.sqs.queue.url` and moved SQS-specific custom metadata out of the `messaging.*` namespace.
- The Lambda example used deprecated `faas.execution`. Updated it to `faas.invocation_id`.
- The custom propagator snippet imported `set_span_in_context` from the wrong module and referenced `trace.NonRecordingSpan` without importing `trace`. Updated imports to use `opentelemetry.trace.set_span_in_context` and `NonRecordingSpan`.
- The Kafka producer set `messaging.kafka.message.key` even when the key was `None`, which conflicts with the Kafka messaging convention guidance. Updated the code to set it only when a key is present.
- The Lambda SQS partial batch comment implied failed-message-only retries happen automatically. Clarified that the Lambda event source mapping must enable `ReportBatchItemFailures`.
- Updated stale OpenTelemetry documentation links in Further Reading to current canonical docs paths.

## Review Notes
OpenTelemetry messaging semantic conventions are still marked Development, and official instrumentation may continue emitting older attributes by default unless users opt in with `OTEL_SEMCONV_STABILITY_OPT_IN`. The corrected examples now use the current documented convention names.
