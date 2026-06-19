# Validation Summary: How to Configure OpenTelemetry for Message Queue Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python API
- OpenTelemetry messaging semantic conventions
- OpenTelemetry Collector processors
- Apache Kafka with confluent-kafka-python
- RabbitMQ with Pika
- AWS SQS with boto3
- Distributed tracing context propagation

## Sources Consulted
- OpenTelemetry Python tracing API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry messaging attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry Kafka semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/kafka/
- OpenTelemetry RabbitMQ semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/rabbitmq/
- OpenTelemetry SQS semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/sqs/
- Confluent Kafka Python client API: https://docs.confluent.io/platform/current/clients/confluent-kafka-python/html/index.html
- Boto3 SQS send_message documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/send_message.html
- Boto3 SQS receive_message documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/receive_message.html
- Boto3 SQS delete_message documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/sqs/client/delete_message.html
- Pika channel documentation: https://pika.readthedocs.io/en/stable/modules/channel.html
- Pika BasicProperties documentation: https://pika.readthedocs.io/en/stable/modules/spec.html#pika.spec.BasicProperties
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The post used deprecated OpenTelemetry messaging attributes such as `messaging.destination`, `messaging.operation`, `messaging.message_id`, `messaging.kafka.consumer_group`, `messaging.kafka.partition`, `messaging.rabbitmq.routing_key`, `messaging.message_payload_size_bytes`, `messaging.batch_size`, and `messaging.client_id`. Updated them to current semantic-convention names such as `messaging.destination.name`, `messaging.operation.type`, `messaging.message.id`, `messaging.consumer.group.name`, `messaging.destination.partition.id`, `messaging.rabbitmq.destination.routing_key`, `messaging.message.body.size`, `messaging.batch.message_count`, and `messaging.client.id`.
- The Kafka consumer example accessed `self.consumer._group_id`, a private implementation detail. Updated the example to retain `group.id` from the provided configuration as `self.consumer_group`.
- The RabbitMQ publisher used `default` as the destination name for the default exchange. Updated the example to derive `messaging.destination.name` from the routing key for default-exchange publishes, falling back to `amq.default` only when neither exchange nor routing key is present.
- The SQS publisher used the non-current `messaging.url` attribute. Updated it to `aws.sqs.queue.url`.
- The Collector filter processor snippet used the older `traces.span` configuration shape. Updated it to the current OTTL `trace_conditions` format with `span.attributes["messaging.destination.name"]`.
- The Collector enrichment snippet attempted to copy a resource attribute with the attributes processor. Updated it to use the transform processor so it can set a span attribute from `resource.attributes["service.instance.id"]`.
- One comment said the consumer span was linked to the producer, but the code uses the extracted context as the parent context. Updated the comment to describe continuing from the producer context.

## Review Notes
- The Python examples were checked for syntax by extracting all Python code blocks and parsing them with `python3`; all 10 parsed successfully.
- The examples are intentionally illustrative and still assume application-provided objects such as `queue_client`, `process_message`, `sqs_client`, and `format_as_sqs_attributes`.
- OpenTelemetry messaging semantic conventions are still marked Development, and official documentation notes compatibility considerations for instrumentations that emit older messaging conventions.
